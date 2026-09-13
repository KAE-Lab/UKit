/** Ce que la resolution des ombres doit tenir : iOS a l'identique d'avant, Android en flou borne. */

import { describe, expect, it } from 'vitest';

import { ombreAndroid, ombreIos, resoudreOmbre } from './ombres';
import { tokens } from './tokens';

describe('ombres', () => {
    it('rend a iOS exactement les quatre proprietes d avant', () => {
        expect(ombreIos(tokens.ombres.sm)).toEqual({
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
        });
    });

    it('rend a Android un boxShadow calibre sur les memes valeurs, sans elevation', () => {
        const ombre = ombreAndroid(tokens.ombres.sm);
        expect(ombre).toEqual({ boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 12, color: 'rgba(0, 0, 0, 0.04)' }] });
        expect('elevation' in ombre).toBe(false);
    });

    it('borne l opacite Android a 1', () => {
        expect(ombreAndroid({ y: 0, flou: 1, opacite: 1.2 }).boxShadow[0].color).toBe('rgba(0, 0, 0, 1)');
    });

    it('resout iOS par son nom, et tout le reste en boxShadow', () => {
        expect('shadowRadius' in resoudreOmbre(tokens.ombres.md, 'ios')).toBe(true);
        expect('boxShadow' in resoudreOmbre(tokens.ombres.md, 'android')).toBe(true);
        expect('boxShadow' in resoudreOmbre(tokens.ombres.md, 'web')).toBe(true);
    });
});
