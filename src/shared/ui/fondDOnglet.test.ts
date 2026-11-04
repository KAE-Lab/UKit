/** Ce que le fond d'un onglet doit tenir : un voile qui part transparent, un motif qui boucle sans saut. */

import { describe, expect, it } from 'vitest';

import { GEOMETRIE_DU_FOND, motifDuFond, voileDuFond } from './fondDOnglet';
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

    it('repete le motif a l identique d une periode a l autre, pour que le glissement boucle', () => {
        const { colors, locations } = motifDuFond('#AAAAAA', '#BBBBBB', '#000000');
        const parPeriode = 4;
        expect(colors).toHaveLength(GEOMETRIE_DU_FOND.periodes * parPeriode + 1);
        for (let i = 0; i + parPeriode < colors.length; i += 1) {
            expect(colors[i + parPeriode]).toBe(colors[i]);
            expect(locations[i + parPeriode] - locations[i]).toBeCloseTo(1 / GEOMETRIE_DU_FOND.periodes);
        }
        expect(colors[colors.length - 1]).toBe(colors[0]);
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
