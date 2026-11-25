/**
 * L'entonnoir des annonces : les trois comptes, les deux taux, le seuil de vingt, le classement et
 * la comparaison par campus.
 *
 *     npm test   (a la racine du depot)
 */

import { describe, expect, test } from 'vitest';

import { classement, entonnoir, entonnoirParCampus, protegerLesLignes, taux, tauxAffiche, tauxDAction, tauxDOuverture } from './annonces';
import { SECRET } from './cases';
import type { Mesure } from './mesures';

const m = (evenement: string, cle: string, n: number, campus = 'bordeaux'): Mesure => ({
    jour: '2026-11-20', heure: -1, evenement, cle, campus, version: '6.3.1', plateforme: 'android', testeur: false, n,
});

const LIGNES: readonly Mesure[] = [
    m('annonce.impression', 'a', 400),
    m('annonce.impression', 'a', 3, 'bordeaux-iut'),
    m('annonce.ouverture', 'a', 15),
    m('annonce.action', 'a', 5),
    m('annonce.impression', 'b', 12),
    m('annonce.ouverture', 'b', 6),
    m('session', '', 900),
];

describe('l entonnoir', () => {
    test('de toutes les annonces, ou de celles qu on garde', () => {
        expect(entonnoir(LIGNES)).toEqual({ impressions: 415, ouvertures: 21, actions: 5 });
        expect(entonnoir(LIGNES, (cle) => cle === 'b')).toEqual({ impressions: 12, ouvertures: 6, actions: 0 });
    });

    test('les deux taux : ouvertures sur impressions, actions sur ouvertures', () => {
        const a = entonnoir(LIGNES, (cle) => cle === 'a');
        expect(tauxDOuverture(a).valeur).toBeCloseTo(15 / 403);
        expect(tauxDAction(a)).toEqual({ valeur: 5 / 15, fragile: true });
    });
});

describe('le taux', () => {
    test('sous vingt au denominateur, il est fragile', () => {
        expect(taux(6, 12)).toEqual({ valeur: 0.5, fragile: true });
        expect(taux(6, 20)).toEqual({ valeur: 0.3, fragile: false });
    });

    test('il ne se dit pas sans denominateur, ni quand il trahirait une petite case', () => {
        expect(taux(0, 0).valeur).toBeNull();
        expect(taux(2, 400).valeur).toBeNull();
        expect(taux(0, 400)).toEqual({ valeur: 0, fragile: false });
    });
});

test('le classement va de la plus vue a la moins vue', () => {
    expect(classement(LIGNES)).toEqual([
        { cle: 'a', impressions: 403, ouvertures: 15, actions: 5 },
        { cle: 'b', impressions: 12, ouvertures: 6, actions: 0 },
    ]);
});

test('la comparaison par campus ne compte que l entonnoir', () => {
    const parCampus = entonnoirParCampus(LIGNES, (cle) => cle === 'a');
    expect([...parCampus]).toEqual([
        ['bordeaux', { impressions: 400, ouvertures: 15, actions: 5 }],
        ['bordeaux-iut', { impressions: 3, ouvertures: 0, actions: 0 }],
    ]);
});

describe('les lignes a cote de leur total', () => {
    const lignes = protegerLesLignes([
        { cle: 'z', impressions: 4, ouvertures: 0, actions: 0 },
        { cle: 'b', impressions: 50, ouvertures: 9, actions: 0 },
        { cle: 'a', impressions: 300, ouvertures: 20, actions: 3 },
    ]);

    test('chaque colonne se protege contre son total', () => {
        expect(lignes.map((l) => [l.cle, l.affiche])).toEqual([
            ['a', { impressions: 300, ouvertures: 20, actions: null }],
            ['b', { impressions: SECRET, ouvertures: 9, actions: 0 }],
            ['z', { impressions: null, ouvertures: 0, actions: 0 }],
        ]);
    });

    test('sans secret secondaire, seules les petites cases se cachent', () => {
        const simples = protegerLesLignes([{ cle: 'a', impressions: 300, ouvertures: 20, actions: 3 }, { cle: 'z', impressions: 4, ouvertures: 0, actions: 0 }], { secondaire: false });
        expect(simples.map((l) => l.affiche)).toEqual([{ impressions: 300, ouvertures: 20, actions: null }, { impressions: null, ouvertures: 0, actions: 0 }]);
    });

    test('les impressions cachees passent en dernier, par cle, quel que soit leur compte', () => {
        expect(lignes.map((l) => l.cle)).toEqual(['a', 'b', 'z']);
    });

    test('un taux sur une case cachee ne s ecrit pas', () => {
        expect(tauxAffiche(null, 300).valeur).toBeNull();
        expect(tauxAffiche(9, SECRET).valeur).toBeNull();
        expect(tauxAffiche(20, 300).valeur).toBeCloseTo(20 / 300);
    });
});
