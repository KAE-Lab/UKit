/**
 * Ce qu'on sait d'un lieu : chaque sujet de son domaine, l'officiel qui prime, la fin d'un etat date,
 * la derniere voix pour « pas d'info depuis » ; le classement des plats, borne au menu du jour ; la
 * lecture defensive d'un etat officiel.
 */

import { describe, expect, test } from 'vitest';

import type { Poids, Signalement } from './donnees';
import { classement, lireEtatOfficiel, lireLeLieu, nomDePlat, type EtatOfficiel } from './lieu';
import { sujetDeLieu } from './vocabulaire';

const T0 = Date.parse('2026-11-25T11:00:00Z');
const MINUTE = 60_000;
const SOIR = Date.parse('2026-11-25T23:00:00Z');

let n = 0;
function voix(sujet: string, valeur: string, minutes: number, autres: Partial<Signalement> = {}): Signalement {
    n += 1;
    return {
        id: `s-${String(n).padStart(3, '0')}`, sujet, cible: '21', valeur, fin: null, poids: 1 as Poids, statut: 'active',
        creeLe: T0 + minutes * MINUTE, expireLe: SOIR, majLe: T0 + minutes * MINUTE, ...autres,
    };
}

const officiel = (sujet: string, valeur: string, autres: Partial<EtatOfficiel> = {}): EtatOfficiel => ({
    id: `o-${sujet}`, sujet, cible: '21', valeur, fin: '2026-11-25', creeLe: T0, expireLe: SOIR, ...autres,
});

describe('un lieu, sujet par sujet', () => {
    test('chaque sujet du domaine, dans l ordre du vocabulaire, meme sans rien', () => {
        const lieu = lireLeLieu([], [], 'batiment', 'bordeaux/A28', T0);
        expect(lieu.map((s) => s.sujet.sujet)).toEqual(['batiment.acces_bloque', 'batiment.ferme', 'batiment.chauffage', 'batiment.wifi', 'batiment.ferme_jusqu']);
        expect(lieu.every((s) => s.etat.prime === 'rien' && s.derniereVoix === null)).toBe(true);
    });

    test('l etat d un sujet ne prend que les voix de sa cible', () => {
        const lieu = lireLeLieu([voix('restaurant.ferme', 'oui', 0), voix('restaurant.ferme', 'oui', 1, { cible: '22' })], [], 'restaurant', '21', T0 + 5 * MINUTE);
        const ferme = lieu.find((s) => s.sujet.sujet === 'restaurant.ferme')!;
        expect(ferme.etat.communaute).toMatchObject({ nature: 'etabli', valeur: 'oui', voix: 1 });
    });

    test('l officiel prime, et seulement le sien', () => {
        const lieu = lireLeLieu([voix('restaurant.ferme', 'oui', 0)], [officiel('restaurant.ferme', 'non'), officiel('restaurant.izly', 'oui', { cible: '22' })], 'restaurant', '21', T0 + MINUTE);
        expect(lieu.find((s) => s.sujet.sujet === 'restaurant.ferme')!.etat).toMatchObject({ prime: 'officiel', officiel: { valeur: 'non' } });
        expect(lieu.find((s) => s.sujet.sujet === 'restaurant.izly')!.etat.prime).toBe('rien');
    });

    test('un officiel passe ou pas encore publie ne prime pas, le plus recent l emporte', () => {
        const passe = officiel('restaurant.ferme', 'oui', { id: 'o-1', expireLe: T0 });
        const recent = officiel('restaurant.ferme', 'non', { id: 'o-2', creeLe: T0 + MINUTE });
        const ancien = officiel('restaurant.ferme', 'oui', { id: 'o-3', creeLe: T0 - MINUTE });
        const lieu = lireLeLieu([], [passe, recent, ancien], 'restaurant', '21', T0 + 2 * MINUTE);
        expect(lieu.find((s) => s.sujet.sujet === 'restaurant.ferme')!.etat.officiel?.id).toBe('o-2');
    });

    test('la fin d un etat date est celle de la voix d accord la plus recente', () => {
        const lieu = lireLeLieu([
            voix('restaurant.ferme_jusqu', 'oui', 0, { fin: '2026-11-28' }),
            voix('restaurant.ferme_jusqu', 'oui', 5, { fin: '2026-11-30' }),
        ], [], 'restaurant', '21', T0 + 10 * MINUTE);
        expect(lieu.find((s) => s.sujet.sujet === 'restaurant.ferme_jusqu')!.fin).toBe('2026-11-30');
    });

    test('la derniere voix du jour reste connue apres sa fin : « pas d info depuis »', () => {
        const attente = voix('restaurant.attente', 'attente', 0);
        const lieu = lireLeLieu([attente, voix('restaurant.attente', 'fluide', 1, { poids: 0 })], [], 'restaurant', '21', T0 + 60 * MINUTE);
        const sujet = lieu.find((s) => s.sujet.sujet === 'restaurant.attente')!;
        expect(sujet.etat.communaute.nature).toBe('sans_info');
        expect(sujet.derniereVoix).toBe(attente.creeLe);
    });

    test('une correction d horaires ne compte que pour la source affichee, officielle comprise', () => {
        const signalements = [
            voix('restaurant.horaires', 'aaaaaaaa|midi=1130-1400', 0), voix('restaurant.horaires', 'aaaaaaaa|midi=1130-1400', 1),
            voix('restaurant.horaires', 'bbbbbbbb|soir=ferme', 2),
        ];
        const officiels = [officiel('restaurant.horaires', 'aaaaaaaa|midi=1100-1400')];
        const sur = (empreinte: string | null | undefined) =>
            lireLeLieu(signalements, officiels, 'restaurant', '21', T0 + 5 * MINUTE, { empreinteDesHoraires: empreinte }).find((e) => e.sujet.sujet === 'restaurant.horaires')!.etat;
        // La source a change (B) : les corrections de A ne rendent pas B incertain, et l'officiel de A tombe.
        expect(sur('bbbbbbbb')).toMatchObject({ prime: 'communaute', communaute: { nature: 'etabli', valeur: 'bbbbbbbb|soir=ferme', voix: 1 } });
        expect(sur('aaaaaaaa')).toMatchObject({ prime: 'officiel', communaute: { nature: 'etabli', valeur: 'aaaaaaaa|midi=1130-1400' } });
        expect(sur(null).prime).toBe('rien');
        // Sans empreinte donnee (la console), toutes comptent.
        expect(sur(undefined).communaute.nature).toBe('incertain');
    });

    test('une voix masquee ne compte pas comme derniere voix', () => {
        const lieu = lireLeLieu([voix('restaurant.attente', 'attente', 0, { statut: 'masquee' })], [], 'restaurant', '21', T0 + 60 * MINUTE);
        expect(lieu.find((s) => s.sujet.sujet === 'restaurant.attente')!.derniereVoix).toBeNull();
    });
});

describe('le classement des plats', () => {
    const plat = sujetDeLieu('restaurant.plat')!;

    test('par poids, puis par voix, puis le plus recent', () => {
        const signalements = [
            voix('restaurant.plat', 'Lasagnes', 0), voix('restaurant.plat', 'Lasagnes', 1),
            voix('restaurant.plat', 'Curry', 2, { poids: 2 }), voix('restaurant.plat', 'Curry', 3),
            voix('restaurant.plat', 'Soupe', 4),
        ];
        expect(classement(signalements, plat, '21', T0 + 10 * MINUTE)).toEqual([
            { valeur: 'Curry', voix: 2, recent: T0 + 3 * MINUTE }, { valeur: 'Lasagnes', voix: 2, recent: T0 + MINUTE }, { valeur: 'Soupe', voix: 1, recent: T0 + 4 * MINUTE },
        ]);
    });

    test('sans le non atteste, le masque, ni ce qui n est pas au menu', () => {
        const signalements = [
            voix('restaurant.plat', 'Lasagnes', 0, { poids: 0 }), voix('restaurant.plat', 'Insulte', 1),
            voix('restaurant.plat', 'Curry', 2, { statut: 'masquee' }), voix('restaurant.plat', 'Soupe', 3),
        ];
        expect(classement(signalements, plat, '21', T0 + 10 * MINUTE, new Set(['Lasagnes', 'Curry', 'Soupe']))).toEqual([{ valeur: 'Soupe', voix: 1, recent: T0 + 3 * MINUTE }]);
    });

    test('un nom de plat ramene a sa forme', () => {
        expect(nomDePlat('  Poulet   basquaise\n riz ')).toBe('Poulet basquaise riz');
        expect(nomDePlat('x'.repeat(200))).toHaveLength(120);
    });
});

describe('un etat officiel lu', () => {
    test('une ligne juste, une ligne fausse', () => {
        expect(lireEtatOfficiel({ id: 'a', sujet: 'restaurant.ferme', cible: '21', valeur: 'oui', fin: '2026-11-25', cree_le: '2026-11-25T10:00:00Z', expire_le: '2026-11-25T23:00:00Z' }))
            .toEqual({ id: 'a', sujet: 'restaurant.ferme', cible: '21', valeur: 'oui', fin: '2026-11-25', creeLe: Date.parse('2026-11-25T10:00:00Z'), expireLe: SOIR });
        expect(lireEtatOfficiel({ id: 'a', sujet: 'restaurant.ferme', cible: '21', valeur: 'oui', cree_le: 'hier', expire_le: '2026-11-25T23:00:00Z' })).toBeNull();
        expect(lireEtatOfficiel(null)).toBeNull();
    });
});
