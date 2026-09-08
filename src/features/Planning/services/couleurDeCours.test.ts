/**
 * La resolution d'une couleur de ligne : une cle de palette, une hexadecimale, ou le defaut.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { couleurDeCours, normaliserHex } from './couleurDeCours';

const PALETTE = { '#FFFF00': '#FFCC00', 'palette-1': '#FF3B30', default: '#007AFF' };

test('une cle de palette gagne sur sa propre forme hexadecimale', () => {
    expect(couleurDeCours(PALETTE, 'palette-1')).toBe('#FF3B30');
    expect(couleurDeCours(PALETTE, '#FFFF00')).toBe('#FFCC00');
});

test('une hexadecimale inconnue de la palette passe telle quelle, normalisee', () => {
    expect(couleurDeCours(PALETTE, '#FF2D55')).toBe('#ff2d55');
    expect(couleurDeCours(PALETTE, '#abc')).toBe('#aabbcc');
});

test('tout le reste retombe sur le defaut', () => {
    expect(couleurDeCours(PALETTE, undefined)).toBe('#007AFF');
    expect(couleurDeCours(PALETTE, '')).toBe('#007AFF');
    expect(couleurDeCours(PALETTE, 'rouge')).toBe('#007AFF');
    expect(couleurDeCours(PALETTE, '#12345678')).toBe('#007AFF');
});

test('normaliserHex refuse ce qui n est pas une couleur', () => {
    expect(normaliserHex(null)).toBeNull();
    expect(normaliserHex(42)).toBeNull();
    expect(normaliserHex(' #A1B2C3 ')).toBe('#a1b2c3');
});
