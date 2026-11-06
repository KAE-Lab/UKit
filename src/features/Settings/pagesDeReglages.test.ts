import { describe, expect, it } from 'vitest';

import { DELAI, delaiVoisin } from './pagesDeReglages';

describe('delaiVoisin', () => {
    it('avance et recule d un pas de cinq minutes', () => {
        expect(delaiVoisin(15, 1)).toBe(20);
        expect(delaiVoisin(15, -1)).toBe(10);
    });

    it('reste dans les bornes', () => {
        expect(delaiVoisin(DELAI.minimum, -1)).toBe(DELAI.minimum);
        expect(delaiVoisin(DELAI.maximum, 1)).toBe(DELAI.maximum);
    });

    it('cale un delai hors pas sur le pas voisin dans le sens demande', () => {
        expect(delaiVoisin(23, 1)).toBe(25);
        expect(delaiVoisin(23, -1)).toBe(20);
        expect(delaiVoisin(Number.NaN, 1)).toBe(20);
    });
});
