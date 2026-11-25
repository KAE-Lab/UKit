/** Chaque sujet du vocabulaire a ses mots dans la console, et une valeur se lit en clair. */

import { describe, expect, test } from 'vitest';

import { SUJETS, sujetDeLieu } from '../../../../src/shared/communaute/vocabulaire';
import { libelleDeValeur, libelleDuLieu, SUJETS_EN_CLAIR } from './libelles';

describe('les mots de la moderation', () => {
    test('aucun sujet sans libelle', () => {
        for (const sujet of SUJETS) expect(SUJETS_EN_CLAIR[sujet.sujet], sujet.sujet).toBeDefined();
    });

    test('les valeurs en clair', () => {
        expect(libelleDeValeur(sujetDeLieu('restaurant.attente'), 'tres_long')).toBe('très long');
        expect(libelleDeValeur(sujetDeLieu('restaurant.horaires'), 'a41f09c2|midi=1130-1345,soir=ferme')).toBe('midi 11:30–13:45, soir fermé');
        expect(libelleDeValeur(sujetDeLieu('restaurant.horaires'), 'a41f09c2|source')).toBe('la source est juste');
        expect(libelleDeValeur(sujetDeLieu('restaurant.plat'), 'Curry de légumes')).toBe('Curry de légumes');
    });

    test('un lieu par sa source', () => {
        expect(libelleDuLieu('batiment', 'bordeaux/A28')).toBe('Bâtiment A28 (bordeaux)');
        expect(libelleDuLieu('restaurant', '2302')).toBe('Restaurant 2302');
    });
});
