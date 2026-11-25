/**
 * Le rapport partenaire : par campus et par semaine, les petits campus regroupes, aucune case sous
 * cinq ni retrouvable par difference avec le total, et un CSV qu'un tableur francais ouvre avec ses
 * accents, sans executer de formule.
 *
 *     npm test   (a la racine du depot)
 */

import { describe, expect, test } from 'vitest';

import { SECRET } from './cases';
import type { Mesure } from './mesures';
import { CAMPUS_REGROUPES, champ, csvDuRapport, rapport } from './rapport';

const m = (jour: string, evenement: string, n: number, campus = 'bordeaux', cle = 'a'): Mesure => ({
    jour, heure: -1, evenement, cle, campus, version: '6.3.1', plateforme: 'ios', testeur: false, n,
});

const SEMAINE = { du: '2026-11-17', au: '2026-11-23' };
const LIGNES: readonly Mesure[] = [
    m('2026-11-17', 'annonce.impression', 300),
    m('2026-11-17', 'annonce.ouverture', 12),
    m('2026-11-17', 'annonce.action', 2),
    m('2026-11-23', 'annonce.impression', 100),
    m('2026-11-23', 'annonce.ouverture', 3),
    m('2026-11-18', 'annonce.impression', 3, 'bordeaux-iut'),
    m('2026-11-18', 'annonce.impression', 1, 'bordeaux-inp'),
    m('2026-11-18', 'annonce.ouverture', 1, 'bordeaux-inp'),
    m('2026-11-19', 'annonce.impression', 40, 'autre'),
    m('2026-11-19', 'annonce.impression', 500, 'bordeaux', 'b'),
];
const deA = (cle: string) => cle === 'a';

describe('le rapport', () => {
    const r = rapport(LIGNES, deA, SEMAINE);

    test('le total ne compte que les annonces du rapport', () => {
        expect(r.total).toEqual({ impressions: 444, ouvertures: 16, actions: 2 });
        expect(r.totalAffiche).toEqual({ impressions: 444, ouvertures: 16, actions: null });
    });

    test('les campus sous cinq impressions sont regroupes, en dernier', () => {
        expect(r.parCampus.map((c) => [c.cle, c.impressions, c.ouvertures, c.actions])).toEqual([
            ['bordeaux', 400, 15, 2],
            ['autre', 40, 0, 0],
            [CAMPUS_REGROUPES, 4, 1, 0],
        ]);
    });

    test('une petite case ne se retrouve pas par difference avec le total', () => {
        // 444 − 400 − 40 redonnerait les 4 impressions regroupees ; 16 − 15 − 0, l'ouverture.
        expect(r.parCampus.map((c) => c.affiche)).toEqual([
            { impressions: 400, ouvertures: SECRET, actions: null },
            { impressions: SECRET, ouvertures: 0, actions: 0 },
            { impressions: null, ouvertures: null, actions: 0 },
        ]);
    });

    test('les semaines suivent le calendrier, rognees a la periode, protegees de meme', () => {
        expect(r.parSemaine.map((s) => [s.semaine, s.impressions, s.affiche.ouvertures])).toEqual([
            [{ du: '2026-11-17', au: '2026-11-22' }, 344, SECRET],
            [{ du: '2026-11-23', au: '2026-11-23' }, 100, null],
        ]);
    });
});

describe('le CSV', () => {
    const csv = csvDuRapport(rapport(LIGNES, deA, SEMAINE), { sujet: 'Soirée « Gala » ; 2026', nomDuCampus: (c) => (c === 'bordeaux' ? 'Université de Bordeaux' : c), testeurs: false });
    const lignes = csv.split('\r\n');

    test('commence par l indicateur d ordre des octets, et garde ses accents', () => {
        expect(csv.startsWith('﻿')).toBe(true);
        expect(csv).toContain('Université de Bordeaux');
        expect(csv.endsWith('\r\n')).toBe(true);
    });

    test('un champ qui porte le separateur est entre guillemets', () => {
        expect(lignes[0]).toBe('﻿Rapport;"Soirée « Gala » ; 2026"');
    });

    test('aucune case sous cinq, ni celle qui la redonnerait, ni le taux qui la trahirait', () => {
        expect(lignes).toContain('Total;Toute la période;444;16;3,6;moins de 5;');
        expect(lignes).toContain('Campus;Université de Bordeaux;400;masqué;;moins de 5;');
        expect(lignes).toContain('Campus;autre;masqué;0;;0;');
        expect(lignes).toContain('Campus;Campus regroupés;moins de 5;moins de 5;;0;');
        expect(lignes).toContain('Semaine;23 novembre 2026;100;moins de 5;;0;');
    });

    test('les definitions sont en bas', () => {
        expect(lignes.indexOf('Définitions')).toBeGreaterThan(lignes.findIndex((l) => l.startsWith('Semaine;23 novembre 2026;')));
    });
});

test('un champ qui commence comme une formule est neutralise', () => {
    expect(champ('=HYPERLINK("https://exemple.test")')).toBe('"\'=HYPERLINK(""https://exemple.test"")"');
    expect(champ('@SOMME(A1)')).toBe('\'@SOMME(A1)');
    expect(champ('-3')).toBe('\'-3');
    expect(champ('Gala de rentrée')).toBe('Gala de rentrée');
});
