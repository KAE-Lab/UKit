/** Ce que le fond d'un onglet doit tenir : un voile qui part transparent, un fondu qui part plein. */

import { describe, expect, it } from 'vitest';

import { fondDeHauteur, fonduDuBord, GEOMETRIE_DU_FOND, voileDuFond } from './fondDOnglet';
import { PALETTES } from '../theme/palettes';

describe('fond d un onglet', () => {
    it('ouvre le voile transparent a son debut et le ferme plein a sa fin', () => {
        const { colors, locations } = voileDuFond('#000000');
        expect(colors[0]).toBe('#00000000');
        expect(colors[colors.length - 1]).toBe('#000000FF');
        expect(locations[0]).toBeCloseTo(GEOMETRIE_DU_FOND.voile.debut / GEOMETRIE_DU_FOND.hauteur);
        expect(locations[locations.length - 1]).toBe(1);
        locations.slice(1).forEach((l, i) => expect(l).toBeGreaterThan(locations[i]));
    });

    it('ferme le voile au bas d un fond ramene a une hauteur donnee', () => {
        const geometrie = fondDeHauteur(235);
        const { locations } = voileDuFond('#000000', geometrie);
        expect(locations[locations.length - 1]).toBe(1);
        expect(locations[0]).toBeCloseTo(GEOMETRIE_DU_FOND.voile.debut / GEOMETRIE_DU_FOND.hauteur);
    });

    it('fond le bord d une zone qui defile : plein en haut, transparent en bas, sans saut', () => {
        const { colors, locations } = fonduDuBord('#0B0B12');
        expect(colors[0]).toBe('#0B0B12FF');
        expect(colors[colors.length - 1]).toBe('#0B0B1200');
        expect(locations[0]).toBe(0);
        expect(locations[locations.length - 1]).toBe(1);
        const alphas = colors.map((c) => parseInt(c.slice(7), 16));
        alphas.slice(1).forEach((a, i) => expect(a).toBeLessThanOrEqual(alphas[i]));
    });

    it('donne deux teintes a chaque onglet, dans les deux themes', () => {
        (['light', 'dark'] as const).forEach((theme) => {
            Object.values(PALETTES[theme].fondDOnglet).forEach((teintes) => {
                expect(teintes).toHaveLength(2);
                teintes.forEach((t) => expect(t).toMatch(/^#[0-9A-F]{6}$/));
            });
        });
    });
});
