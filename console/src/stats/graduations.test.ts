/**
 * Les graduations : des nombres ronds, au plus cinq, qui couvrent le maximum.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { graduations } from './graduations';

test('des pas de 1, 2 ou 5 fois une puissance de dix', () => {
    expect(graduations(34567)).toEqual([0, 10000, 20000, 30000, 40000]);
    expect(graduations(11234)).toEqual([0, 5000, 10000, 15000]);
    expect(graduations(987)).toEqual([0, 500, 1000]);
    expect(graduations(40)).toEqual([0, 10, 20, 30, 40]);
});

test('un petit maximum garde un pas entier, et rien ne se gradue a zero', () => {
    expect(graduations(3)).toEqual([0, 1, 2, 3]);
    expect(graduations(0)).toEqual([0, 1]);
});
