import { describe, expect, it } from 'vitest';

import { ordreDesLieux } from './ordreDesLieux';

interface Lieu {
    id: string;
    nom: string;
    distance?: number;
}

const ordonner = (lieux: Lieu[], favoris: string[] = []) =>
    [...lieux].sort(ordreDesLieux<Lieu>(favoris, (lieu) => lieu.nom)).map((lieu) => lieu.id);

describe('ordreDesLieux', () => {
    it('range les distances connues du plus proche au plus lointain', () => {
        expect(ordonner([
            { id: 'loin', nom: 'A', distance: 3 },
            { id: 'pres', nom: 'B', distance: 0.4 },
        ])).toEqual(['pres', 'loin']);
    });

    it('met un lieu sans distance apres ceux qui en ont une, au lieu de le compter a zero', () => {
        expect(ordonner([
            { id: 'inconnu', nom: 'A' },
            { id: 'connu', nom: 'B', distance: 5 },
        ])).toEqual(['connu', 'inconnu']);
    });

    it('suit le nom quand aucune distance n est connue, sans tenir compte de la casse ni des accents', () => {
        expect(ordonner([
            { id: 'v', nom: 'Village 3' },
            { id: 'e', nom: 'Écla' },
            { id: 'b', nom: 'bU Sciences' },
        ])).toEqual(['b', 'e', 'v']);
    });

    it('ignore la ponctuation : un nom entre parentheses se range a sa premiere lettre', () => {
        expect(ordonner([
            { id: 'space', nom: "(S)pace' Campus - Resto U'" },
            { id: 'crous', nom: "Crous Cafet' de l'IEP" },
            { id: 'vent', nom: 'Le Vent Debout' },
        ])).toEqual(['crous', 'vent', 'space']);
    });

    it('place les favoris en tete, chacun dans le meme ordre que les autres', () => {
        expect(ordonner([
            { id: 'a', nom: 'A', distance: 1 },
            { id: 'favori-loin', nom: 'Z', distance: 9 },
            { id: 'favori-pres', nom: 'Y', distance: 2 },
        ], ['favori-loin', 'favori-pres'])).toEqual(['favori-pres', 'favori-loin', 'a']);
    });
});
