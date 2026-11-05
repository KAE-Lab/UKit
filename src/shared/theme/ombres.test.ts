/** Ce que la resolution des ombres doit tenir : un `boxShadow` partout, le flou d'iOS double, aucune elevation. */

import { describe, expect, it } from 'vitest';

import { resoudreOmbre } from './ombres';
import { tokens } from './tokens';

describe('ombres', () => {
    it('rend une specification seule en une couche de boxShadow, au flou CSS double', () => {
        expect(resoudreOmbre({ y: 4, flou: 8, opacite: 0.15 })).toEqual({
            boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(0, 0, 0, 0.15)' }],
        });
    });

    it('rend les tokens en deux couches, le contact avant la portee', () => {
        const ombre = resoudreOmbre(tokens.ombres.md);
        expect(ombre.boxShadow).toHaveLength(2);
        expect(ombre.boxShadow[0].offsetY).toBeLessThan(ombre.boxShadow[1].offsetY as number);
        expect('elevation' in ombre).toBe(false);
        expect('shadowRadius' in ombre).toBe(false);
    });

    it('borne l opacite a 1', () => {
        expect(resoudreOmbre({ y: 0, flou: 1, opacite: 1.2 }).boxShadow[0].color).toBe('rgba(0, 0, 0, 1)');
    });

    it('gradue les trois ombres de l echelle', () => {
        const portee = (o: readonly { y: number }[]) => o[o.length - 1].y;
        expect(portee(tokens.ombres.sm)).toBeLessThan(portee(tokens.ombres.md));
        expect(portee(tokens.ombres.md)).toBeLessThan(portee(tokens.ombres.lg));
    });
});
