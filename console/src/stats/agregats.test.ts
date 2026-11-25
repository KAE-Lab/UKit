/**
 * Les agregats : chaque somme est celle de la requete de docs/mesure.md, ecrite ici a la main sur des
 * lignes de `mesures` inventees — testeurs exclus, `jour` dans la periode.
 *
 *     npm test   (a la racine du depot)
 */

import { describe, expect, test } from 'vitest';

import { filtrer, par, parJour, serieAffichee, somme, variation, type Filtre } from './agregats';
import { SECRET } from './cases';
import type { Mesure } from './mesures';

const m = (jour: string, evenement: string, n: number, autres: Partial<Mesure> = {}): Mesure => ({
    jour, heure: -1, evenement, cle: '', campus: 'bordeaux', version: '6.3.1', plateforme: 'ios', testeur: false, n, ...autres,
});

const SEMAINE = { du: '2026-11-17', au: '2026-11-23' };
const SANS_TESTEURS: Filtre = { testeurs: false, campus: null };
const LIGNES: readonly Mesure[] = [
    m('2026-11-16', 'session', 100),
    m('2026-11-17', 'session', 40, { heure: 8 }),
    m('2026-11-17', 'session', 2, { heure: 9, campus: 'bordeaux-iut', plateforme: 'android' }),
    m('2026-11-17', 'session', 7, { heure: 9, testeur: true }),
    m('2026-11-19', 'session', 30, { heure: 12, version: '6.3.2', plateforme: 'android' }),
    m('2026-11-19', 'onglet.vu', 25, { heure: 12, cle: 'planning' }),
    m('2026-11-23', 'onglet.vu', 4, { heure: 18, cle: 'campus', campus: '' }),
    m('2026-11-24', 'session', 1000),
];

describe('le filtre', () => {
    test('la periode et les testeurs, exclus par defaut', () => {
        const lignes = filtrer(LIGNES, SEMAINE, SANS_TESTEURS);
        expect(somme(lignes, 'session')).toBe(72);
        expect(somme(filtrer(LIGNES, SEMAINE, { testeurs: true, campus: null }), 'session')).toBe(79);
    });

    test('le campus du filtre global', () => {
        expect(somme(filtrer(LIGNES, SEMAINE, { testeurs: false, campus: 'bordeaux-iut' }), 'session')).toBe(2);
    });
});

describe('les sommes', () => {
    const lignes = filtrer(LIGNES, SEMAINE, SANS_TESTEURS);

    test('par jour, zero pour un jour sans ligne', () => {
        expect(parJour(lignes, 'session', ['2026-11-17', '2026-11-18', '2026-11-19'])).toEqual([42, 0, 30]);
        expect(parJour(lignes, 'session', ['2026-11-17'], (l) => l.plateforme === 'android')).toEqual([2]);
    });

    test('par campus, version, plateforme et cle ; un campus vide se lit ?', () => {
        expect([...par(lignes, 'session', 'campus')]).toEqual([['bordeaux', 70], ['bordeaux-iut', 2]]);
        expect([...par(lignes, 'session', 'version')]).toEqual([['6.3.1', 42], ['6.3.2', 30]]);
        expect([...par(lignes, 'session', 'plateforme')]).toEqual([['ios', 40], ['android', 32]]);
        expect([...par(lignes, 'onglet.vu', 'cle')]).toEqual([['planning', 25], ['campus', 4]]);
        expect([...par(lignes, 'onglet.vu', 'campus')]).toEqual([['bordeaux', 25], ['?', 4]]);
    });

    test('une cle precise', () => {
        expect(somme(lignes, 'onglet.vu', 'planning')).toBe(25);
    });
});

describe('la variation', () => {
    const COMPARABLE = { du: '2026-12-02', au: '2026-12-08' };

    test('sur la periode precedente, en fraction', () => {
        expect(variation(120, 100, COMPARABLE)).toBeCloseTo(0.2);
        expect(variation(50, 100, COMPARABLE)).toBeCloseTo(-0.5);
        expect(variation(0, 100, COMPARABLE)).toBe(-1);
    });

    test('ne se dit pas sans base, ni sur une petite case', () => {
        expect(variation(10, 0, COMPARABLE)).toBeNull();
        expect(variation(3, 100, COMPARABLE)).toBeNull();
        expect(variation(100, 4, COMPARABLE)).toBeNull();
    });

    test('ne se dit pas sur une periode precedente d\'avant l\'adoption de la 6.3', () => {
        // Le cas du 25 novembre 2026 : la semaine d'avant comptait l'adoption, pas l'usage.
        expect(variation(10_076, 100, { du: '2026-11-11', au: '2026-11-17' })).toBeNull();
        // Un jour avant la date suffit a ecarter la comparaison, quel que soit l'ecart.
        expect(variation(120, 100, { du: '2026-12-01', au: '2026-12-07' })).toBeNull();
    });
});

test('une serie par jour cache le jour qui se retrouverait par difference avec son total', () => {
    expect(serieAffichee(['a', 'b', 'c'], [40, 2, 9])).toEqual([
        { jour: 'a', valeur: 40 }, { jour: 'b', valeur: null }, { jour: 'c', valeur: SECRET },
    ]);
});
