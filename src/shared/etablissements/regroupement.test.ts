/** La liste des etablissements : regroupee par campus, cherchee par alias, sans casse ni accents. */

import { describe, expect, it } from 'vitest';

import type { Etablissement } from './catalogue';
import { correspond, normaliser, regrouperParCampus } from './regroupement';

const etab = (code: string, nom: string, campus: string | null, alias: string[] = []) =>
    ({ code, nom, campus, alias } as unknown as Etablissement);

// Dans l'ordre du catalogue, tel que listeEtablissements() le rend.
const liste = [
    etab('ub', 'Collège Sciences et Technologies', 'Talence', ['UB', 'Collège ST']),
    etab('inp', 'Bordeaux INP', 'Talence', ['ENSEIRB', 'ENSCBP']),
    etab('iut', 'IUT de Bordeaux', 'Gradignan', ['IUT']),
    etab('autre', 'Autre campus', null),
    etab('montaigne', 'Bordeaux Montaigne', 'Pessac', ['UBM']),
];

describe('normaliser', () => {
    it('ote la casse et les accents', () => {
        expect(normaliser(' Collège ST ')).toBe('college st');
    });
});

describe('correspond', () => {
    it('trouve un etablissement par un alias', () => {
        expect(correspond(liste[1], 'enseirb')).toBe(true);
        expect(correspond(liste[0], 'ub')).toBe(true);
    });

    it('trouve par le campus et par le code, sans accents', () => {
        expect(correspond(liste[2], 'gradignan')).toBe(true);
        expect(correspond(liste[0], 'college')).toBe(true);
    });

    it('laisse tout passer sur une recherche vide', () => {
        expect(liste.every((e) => correspond(e, '  '))).toBe(true);
    });
});

describe('regrouperParCampus', () => {
    it('regroupe dans l ordre du catalogue, le groupe sans campus en dernier', () => {
        const groupes = regrouperParCampus(liste);
        expect(groupes.map((g) => g.campus)).toEqual(['Talence', 'Gradignan', 'Pessac', null]);
        expect(groupes[0].etablissements.map((e) => e.code)).toEqual(['ub', 'inp']);
    });

    it('ne garde que les groupes qui ont une reponse', () => {
        const groupes = regrouperParCampus(liste, 'enseirb');
        expect(groupes).toEqual([{ campus: 'Talence', etablissements: [liste[1]] }]);
    });

    it('rend une liste vide quand rien ne repond', () => {
        expect(regrouperParCampus(liste, 'sorbonne')).toEqual([]);
    });
});
