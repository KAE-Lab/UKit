import { describe, expect, it } from 'vitest';

import { AUTOMNE, PRINTEMPS, semestreDe } from './semestres';

describe('semestreDe', () => {
    it('rend l automne d aout a janvier', () => {
        expect(semestreDe(new Date(2026, 7, 1))).toBe(AUTOMNE);
        expect(semestreDe(new Date(2026, 10, 10))).toBe(AUTOMNE);
        expect(semestreDe(new Date(2027, 0, 31))).toBe(AUTOMNE);
    });

    it('rend le printemps de fevrier a juillet', () => {
        expect(semestreDe(new Date(2027, 1, 1))).toBe(PRINTEMPS);
        expect(semestreDe(new Date(2027, 6, 31))).toBe(PRINTEMPS);
    });
});
