/** La liste des amis : sa lecture, l'ajout, le remplacement, le retrait, l'expiration (docs/phase-8/8-amis.md). */

import { describe, expect, it } from 'vitest';

import { AMIS_MAXIMUM, ajouterUnAmi, amiDuMemeNom, amiExpire, ecrireLesAmis, lireLesAmis, retirerUnAmi, verdictDuLien } from './amis';
import { lienDu, type Partage } from './lienAmi';

const parGroupes: Partage = { etablissement: 'ub', nom: 'Léa', contenu: { genre: 'groupes', groupes: ['INF501A1'], filtres: [] } };
const parInstantane: Partage = { etablissement: 'bordeaux-inp', nom: null, contenu: { genre: 'instantane', premierJour: '2026-11-25', creneaux: [{ jour: 0, debut: 480, fin: 600 }] } };

describe('la liste des amis', () => {
    it('se range et se relit a l identique', () => {
        const amis = ajouterUnAmi(ajouterUnAmi([], parGroupes, 'Léa', 'a', 1), parInstantane, 'Tom', 'b', 2);
        expect(lireLesAmis(ecrireLesAmis(amis))).toEqual(amis);
        expect(amis.map((ami) => ami.nom)).toEqual(['Tom', 'Léa']);
    });

    it('ecarte une entree abimee sans perdre les autres, et une liste illisible rend une liste vide', () => {
        const ranges = JSON.parse(ecrireLesAmis(ajouterUnAmi([], parGroupes, 'Léa', 'a', 1)));
        const brut = JSON.stringify([...ranges, { id: 'x', nom: 'Zoé', fragment: 'v=1&e=ub', ajouteLe: 3 }, null, { id: 'y' }]);
        expect(lireLesAmis(brut).map((ami) => ami.id)).toEqual(['a']);
        expect(lireLesAmis('{pas du json')).toEqual([]);
        expect(lireLesAmis(null)).toEqual([]);
    });

    it('remplace un ami du meme prenom, casse et accents compris, en gardant son identifiant', () => {
        const avant = ajouterUnAmi([], parGroupes, 'Léa', 'a', 1);
        expect(amiDuMemeNom(avant, 'LEA')?.id).toBe('a');
        const apres = ajouterUnAmi(avant, parInstantane, 'lea', 'b', 2);
        expect(apres).toHaveLength(1);
        expect(apres[0]).toMatchObject({ id: 'a', nom: 'lea', contenu: parInstantane.contenu, ajouteLe: 2 });
    });

    it('se borne, le plus ancien sortant', () => {
        let amis = ajouterUnAmi([], parGroupes, 'Ami 0', 'id0', 0);
        for (let i = 1; i <= AMIS_MAXIMUM; i += 1) amis = ajouterUnAmi(amis, parGroupes, `Ami ${i}`, `id${i}`, i);
        expect(amis).toHaveLength(AMIS_MAXIMUM);
        expect(amis.some((ami) => ami.id === 'id0')).toBe(false);
    });

    it('retire un ami entierement', () => {
        const amis = ajouterUnAmi(ajouterUnAmi([], parGroupes, 'Léa', 'a', 1), parInstantane, 'Tom', 'b', 2);
        expect(retirerUnAmi(amis, 'a').map((ami) => ami.id)).toEqual(['b']);
        expect(lireLesAmis(ecrireLesAmis(retirerUnAmi(retirerUnAmi(amis, 'a'), 'b')))).toEqual([]);
    });

    it('dit expire un instantane passe ses deux semaines, jamais un ami par ses groupes', () => {
        expect(amiExpire(parInstantane, '2026-12-08')).toBe(false);
        expect(amiExpire(parInstantane, '2026-12-09')).toBe(true);
        expect(amiExpire(parGroupes, '2030-01-01')).toBe(false);
    });
});

describe('verdictDuLien', () => {
    const connu = (code: string) => code === 'ub';
    it('accepte un lien lisible et a jour', () => {
        expect(verdictDuLien(lienDu(parGroupes) as string, '2026-11-25', connu)).toEqual({ ok: true, partage: parGroupes });
        expect(verdictDuLien(lienDu(parInstantane) as string, '2026-12-08', connu).ok).toBe(true);
    });

    it('dit pourquoi il refuse : expire, etablissement inconnu pour des groupes, version, illisible', () => {
        expect(verdictDuLien(lienDu(parInstantane) as string, '2026-12-09', connu)).toEqual({ ok: false, raison: 'expire', dernierJour: '2026-12-08' });
        expect(verdictDuLien(lienDu({ ...parGroupes, etablissement: 'autre' }) as string, '2026-11-25', connu)).toEqual({ ok: false, raison: 'etablissement-inconnu' });
        expect(verdictDuLien('https://ukit-bordeaux.fr/ami#v=9&e=ub&g=A', '2026-11-25', connu)).toEqual({ ok: false, raison: 'version' });
        expect(verdictDuLien('https://ukit-bordeaux.fr/ami#v=1&e=ub', '2026-11-25', connu)).toEqual({ ok: false, raison: 'illisible' });
    });
});
