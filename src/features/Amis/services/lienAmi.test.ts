/** Le lien d'un ami : sa forme, sa lecture, ce qu'il refuse, sa taille (docs/phase-8/8-amis.md). */

import { describe, expect, it } from 'vitest';

import { ADRESSE_DU_LIEN, fragmentDu, lienDu, lireLeLien, NOM_MAXIMUM, type Partage } from './lienAmi';
import type { Creneau } from './instantane';

const groupes: Partage = { etablissement: 'ub', nom: 'Léa', contenu: { genre: 'groupes', groupes: ['INF501A1', 'MI 1A, TD2'], filtres: ['4TIN501U'] } };
const instantane: Partage = {
    etablissement: 'bordeaux-inp',
    nom: null,
    contenu: { genre: 'instantane', premierJour: '2026-11-25', creneaux: [{ jour: 0, debut: 480, fin: 600 }, { jour: 6, debut: 840, fin: 1020 }] },
};

/** Deux semaines chargees : quatre creneaux par jour ouvre, sur dix jours. */
function semainesChargees(): Creneau[] {
    const creneaux: Creneau[] = [];
    for (let jour = 0; jour < 14; jour += 1) {
        if (jour % 7 >= 5) continue;
        creneaux.push({ jour, debut: 480, fin: 600 }, { jour, debut: 615, fin: 735 }, { jour, debut: 830, fin: 950 }, { jour, debut: 965, fin: 1085 });
    }
    return creneaux;
}

describe('lienDu et lireLeLien', () => {
    it('reviennent a l identique, groupes et filtres', () => {
        const lien = lienDu(groupes) as string;
        expect(lien.startsWith(`${ADRESSE_DU_LIEN}#v=1&e=ub&n=L%C3%A9a&g=INF501A1,MI%201A%2C%20TD2&f=4TIN501U`)).toBe(true);
        expect(lireLeLien(lien)).toEqual({ ok: true, partage: groupes });
    });

    it('reviennent a l identique, instantane', () => {
        expect(lireLeLien(lienDu(instantane) as string)).toEqual({ ok: true, partage: instantane });
    });

    it('lisent le schema de l application, le build de developpement et l adresse en .html', () => {
        const fragment = fragmentDu(groupes) as string;
        for (const avant of ['ukit-bordeaux://ami', 'ukit-bordeaux-dev://ami/', 'https://ukit-bordeaux.fr/ami.html', 'https://www.ukit-bordeaux.fr/ami/']) {
            expect(lireLeLien(`${avant}#${fragment}`).ok).toBe(true);
        }
    });

    it('ignorent ce qui n est pas un lien d ami', () => {
        for (const adresse of [
            'exp+ukit://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
            'https://ukit-bordeaux.fr/ami',
            'https://ukit-bordeaux.fr.evil.example/ami#v=1&e=ub&g=A',
            'https://example.com/ami#v=1&e=ub&g=A',
            'ukit-bordeaux://autre#v=1&e=ub&g=A',
        ]) {
            expect(lireLeLien(adresse)).toEqual({ ok: false, raison: 'pas-un-lien' });
        }
    });

    it('disent une version plus recente plutot qu un lien casse', () => {
        expect(lireLeLien(`${ADRESSE_DU_LIEN}#v=2&e=ub&g=A`)).toEqual({ ok: false, raison: 'version' });
    });

    it('refusent un lien abime ou ambigu', () => {
        for (const fragment of [
            'e=ub&g=A',
            'v=1&g=A',
            'v=1&e=UB&g=A',
            'v=1&e=ub',
            'v=1&e=ub&g=',
            'v=1&e=ub&g=A&g=B',
            'v=1&e=ub&g=A&d=20261125&o=AeAo',
            'v=1&e=ub&d=20261125',
            'v=1&e=ub&d=20261131&o=AeAo',
            'v=1&e=ub&d=20261125&o=AeA',
            'v=1&e=ub&d=20261125&o=A*Ao',
            'v=1&e=ub&g=A&f=4TIN%20501U',
            'v=1&e=ub&g=A%0AB',
            'v=1&e=ub&n=%E0%A4%A&g=A',
            `v=1&e=ub&g=${Array.from({ length: 11 }, (_, i) => `G${i}`).join(',')}`,
            `v=1&e=ub&g=${'A'.repeat(2100)}`,
        ]) {
            expect(lireLeLien(`${ADRESSE_DU_LIEN}#${fragment}`)).toEqual({ ok: false, raison: 'illisible' });
        }
    });

    it('n ecrivent jamais un lien d abonnement ni un intitule : il n existe pas de cle pour eux', () => {
        const fragment = fragmentDu(instantane) as string;
        expect(fragment.split('&').map((champ) => champ.split('=')[0])).toEqual(['v', 'e', 'd', 'o']);
    });

    it('coupent un prenom trop long et ses retours a la ligne, et oublient un prenom vide', () => {
        const long = lireLeLien(lienDu({ ...groupes, nom: `  Léa\nMarie ${'x'.repeat(40)}` }) as string);
        expect(long.ok === true ? long.partage.nom : 'echec').toBeNull();
        const court = lireLeLien(lienDu({ ...groupes, nom: '  Léa\nMarie ' }) as string);
        expect(court.ok === true ? court.partage.nom : 'echec').toBe('Léa Marie');
        expect((fragmentDu({ ...groupes, nom: '   ' }) as string).includes('n=')).toBe(false);
        expect('x'.repeat(NOM_MAXIMUM)).toHaveLength(30);
    });
});

describe('la taille du lien', () => {
    it('reste courte : moins de 120 caracteres pour des groupes, moins de 260 pour deux semaines chargees', () => {
        const parGroupes = lienDu({ etablissement: 'ub', nom: 'Léa', contenu: { genre: 'groupes', groupes: ['INF501A1', 'INF501A2'], filtres: [] } }) as string;
        const charge: Partage = { etablissement: 'bordeaux-inp', nom: 'Léa', contenu: { genre: 'instantane', premierJour: '2026-11-25', creneaux: semainesChargees() } };
        const parInstantane = lienDu(charge) as string;
        expect(parGroupes.length).toBeLessThan(120);
        expect(parInstantane.length).toBeLessThan(260);
        expect(lireLeLien(parInstantane)).toEqual({ ok: true, partage: charge });
    });
});
