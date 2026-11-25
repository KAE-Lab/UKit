/**
 * Ce que « Sur place » montre : l'etat etabli et ses voix d'accord, l'incertain, la voix seule en retrait,
 * le non verifie seul, l'officiel qui passe devant meme sur la normale, la normale qui se tait, la
 * correction d'horaires de la seule source affichee, et « pas d'info depuis ».
 */

import { describe, expect, test } from 'vitest';

import type { Poids, Signalement } from '../../../shared/communaute';
import { lireLeLieu, type EtatOfficiel } from '../../../shared/communaute/lieu';
import { lignesSurPlace, sansInfoDepuis, tonDe, valeurContraire } from './presentation';
import { sujetDeLieu } from '../../../shared/communaute/vocabulaire';

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

const lignes = (s: Signalement[], minutes: number, officiels: EtatOfficiel[] = [], empreinte: string | null = null) =>
    lignesSurPlace(lireLeLieu(s, officiels, 'restaurant', '21', T0 + minutes * MINUTE), { maintenant: T0 + minutes * MINUTE, empreinteDesHoraires: empreinte });

describe('l etat de la communaute', () => {
    test('« Ferme selon 2 etudiants » : les voix d accord, la derniere confirmation', () => {
        const [l] = lignes([voix('restaurant.ferme', 'oui', 0), voix('restaurant.ferme', 'oui', 10)], 30);
        expect(l).toMatchObject({ valeur: 'oui', source: 'communaute', voix: 2, depuis: T0 + 10 * MINUTE, enRetrait: false, ton: 'danger', incertain: false });
    });

    test('une seule voix se lit en retrait', () => {
        expect(lignes([voix('restaurant.izly', 'oui', 0)], 5)[0]).toMatchObject({ voix: 1, enRetrait: true, ton: 'warning' });
    });

    test('incertain : la valeur etablie, en retrait, et on la reconfirme', () => {
        const [l] = lignes([voix('restaurant.ferme', 'oui', 0), voix('restaurant.ferme', 'oui', 1), voix('restaurant.ferme', 'non', 5)], 10);
        expect(l).toMatchObject({ valeur: 'oui', incertain: true, enRetrait: true, aConfirmer: true, voix: 2 });
    });

    test('la normale se tait ; incertaine, c est la voix contraire qui se montre', () => {
        expect(lignes([voix('restaurant.ferme', 'non', 0)], 5)).toEqual([]);
        const [l] = lignes([voix('restaurant.ferme', 'non', 0), voix('restaurant.ferme', 'oui', 5)], 6);
        expect(l).toMatchObject({ valeur: 'oui', incertain: true, voix: 1, depuis: T0 + 5 * MINUTE });
    });

    test('le non verifie, seul et en retrait, quand aucune voix ne dit rien', () => {
        const [l] = lignes([voix('restaurant.ferme', 'oui', 0, { poids: 0 })], 5);
        expect(l).toMatchObject({ source: 'non_verifie', enRetrait: true, ton: 'neutral' });
        expect(lignes([voix('restaurant.ferme', 'oui', 0, { poids: 0 }), voix('restaurant.ferme', 'non', 1)], 5)).toEqual([]);
    });

    test('le plat ne s etablit pas, il se classe', () => {
        expect(lignes([voix('restaurant.plat', 'Curry', 0)], 5)).toEqual([]);
    });
});

describe('l officiel', () => {
    const officiel = (valeur: string): EtatOfficiel => ({ id: 'o', sujet: 'restaurant.ferme', cible: '21', valeur, fin: '2026-11-25', creeLe: T0, expireLe: SOIR });

    test('passe devant, meme sur la normale, et compte les voix contraires', () => {
        const [l] = lignes([voix('restaurant.ferme', 'oui', 0), voix('restaurant.ferme', 'oui', 1)], 5, [officiel('non')]);
        expect(l).toMatchObject({ source: 'officiel', valeur: 'non', ton: 'success', contraires: 2, aConfirmer: false });
    });
});

describe('les horaires corriges', () => {
    test('seulement ceux de la source affichee', () => {
        const v = voix('restaurant.horaires', 'a41f09c2|midi=1130-1400', 0);
        expect(lignes([v], 5, [], 'a41f09c2')[0]).toMatchObject({ valeur: 'a41f09c2|midi=1130-1400', ton: 'warning' });
        expect(lignes([v], 5, [], 'ffffffff')).toEqual([]);
        expect(lignes([v], 5, [], null)).toEqual([]);
        expect(lignes([voix('restaurant.horaires', 'a41f09c2|source', 0)], 5, [], 'a41f09c2')).toEqual([]);
    });
});

describe('les gestes et les mots', () => {
    test('le contraire d une ligne', () => {
        const [ferme] = lignes([voix('restaurant.ferme', 'oui', 0)], 5);
        expect(valeurContraire(ferme, null)).toBe('non');
        const [horaires] = lignes([voix('restaurant.horaires', 'a41f09c2|midi=1130-1400', 0)], 5, [], 'a41f09c2');
        expect(valeurContraire(horaires, 'a41f09c2')).toBe('a41f09c2|source');
    });

    test('« pas d info depuis » : un direct passe, aujourd hui', () => {
        const lieu = lireLeLieu([voix('restaurant.attente', 'attente', 0)], [], 'restaurant', '21', T0 + 60 * MINUTE);
        expect(sansInfoDepuis(lieu.find((e) => e.sujet.sujet === 'restaurant.attente'))).toBe(T0);
        const frais = lireLeLieu([voix('restaurant.attente', 'attente', 50)], [], 'restaurant', '21', T0 + 60 * MINUTE);
        expect(sansInfoDepuis(frais.find((e) => e.sujet.sujet === 'restaurant.attente'))).toBeNull();
    });

    test('les tons', () => {
        expect(tonDe(sujetDeLieu('restaurant.attente')!, 'fluide')).toBe('success');
        expect(tonDe(sujetDeLieu('restaurant.attente')!, 'tres_long')).toBe('danger');
        expect(tonDe(sujetDeLieu('batiment.wifi')!, 'oui')).toBe('warning');
        expect(tonDe(sujetDeLieu('bibliotheque.fermee_jusqu')!, 'oui')).toBe('danger');
        expect(tonDe(sujetDeLieu('bibliotheque.ambiance')!, 'calme')).toBe('neutral');
    });
});
