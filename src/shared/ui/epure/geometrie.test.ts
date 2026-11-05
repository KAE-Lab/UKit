/** Les nombres de l'Epure dans l'application : ceux du kit, rien d'invente. */

import { describe, expect, it } from 'vitest';

import { copiesDEcho, ECHO, TRACE_DU_LOGO, TRACE_DU_U } from './geometrie';
import { PALETTES } from '../../theme/palettes';

describe('la figure en echo', () => {
    const copies = copiesDEcho(PALETTES.light.logo.bleu, PALETTES.light.logo.indigo);

    it('compte quarante copies, dessinees du fond vers l avant', () => {
        expect(copies).toHaveLength(ECHO.copies);
        expect(copies[0].rang).toBe(39);
        expect(copies[copies.length - 1].rang).toBe(0);
    });

    it('pose le fond et l avant aux positions de fig01-u.svg', () => {
        // fig01-u.svg : translate(196.50 126.30) pour le fond, translate(1.50 1.50) pour l'avant.
        expect(copies[0].x).toBeCloseTo(196.5);
        expect(copies[0].y).toBeCloseTo(126.3);
        expect(copies[39].x).toBeCloseTo(1.5);
        expect(copies[39].y).toBeCloseTo(1.5);
    });

    it('fait glisser l opacite et la teinte du kit', () => {
        expect(copies[0].opacite).toBeCloseTo(0.1);
        expect(copies[0].teinte).toBe('#5E5CE6');
        expect(copies[39].opacite).toBe(1);
        expect(copies[39].teinte).toBe('#007AFF');
        // La deuxieme copie du fond, comme dans le kit : #5C5DE7 a 0,123.
        expect(copies[1].teinte).toBe('#5C5DE7');
        expect(copies[1].opacite).toBeCloseTo(0.123, 3);
    });
});

describe('les traces', () => {
    it('prend le U comme premier sous-trace du logo', () => {
        expect(TRACE_DU_LOGO.startsWith(TRACE_DU_U)).toBe(true);
        expect(TRACE_DU_U.endsWith('Z')).toBe(true);
    });
});
