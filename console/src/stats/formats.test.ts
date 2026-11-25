/**
 * Les chiffres en francais : milliers, parts, variations signees, axes compacts.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { formaterAxe, formaterCompte, formaterPart, formaterVariation } from './formats';

test('un compte, et la petite case', () => {
    expect(formaterCompte(54321)).toBe('54\u202f321');
    expect(formaterCompte(null)).toBe('moins de 5');
});

test('une part a un chiffre apres la virgule', () => {
    expect(formaterPart(0.6055)).toBe('60,6 %');
    expect(formaterPart(null)).toBe('—');
    expect(formaterPart(0.0003)).toBe('< 0,1\u00a0%');
    expect(formaterPart(0)).toBe('0,0\u00a0%');
});

test('une variation porte son signe, le moins typographique', () => {
    expect(formaterVariation(0.124)).toBe('+12 %');
    expect(formaterVariation(-0.08)).toBe('−08 %'.replace('08', '8'));
    expect(formaterVariation(0)).toBe('0 %');
});

test('un seul style par axe : entier sous 10 000, compact au-dela', () => {
    expect([0, 500, 1000, 1500].map((n) => formaterAxe(n, 1500))).toEqual(['0', '500', '1\u202f000', '1\u202f500']);
    expect([0, 5000, 10000].map((n) => formaterAxe(n, 10000))).toEqual(['0', '5\u00a0k', '10\u00a0k']);
    expect(formaterAxe(30000, 40000)).toBe('30\u00a0k');
});
