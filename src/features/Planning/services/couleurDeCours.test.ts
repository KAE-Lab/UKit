/**
 * La resolution d'une couleur de ligne : une cle de palette, une hexadecimale, ou le defaut.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { contraste, couleurDeCours, encreDeCours, normaliserHex } from './couleurDeCours';

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

test('l encre d un cours garde une teinte deja lisible', () => {
    expect(encreDeCours('#3B5FE5', '#FFFFFF')).toBe('#3b5fe5');
});

test('l encre fonce le cyan sur une carte blanche jusqu au contraste lisible', () => {
    const encre = encreDeCours('#5AC8FA', '#FFFFFF');
    expect(contraste(encre, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#5ac8fa', '#ffffff')).toBeLessThan(2);
});

test('l encre eclaircit une teinte sombre sur une carte sombre', () => {
    const encre = encreDeCours('#5E5CE6', '#15151E');
    expect(contraste(encre, '#15151e')).toBeGreaterThanOrEqual(4.5);
});

test('l encre rend la couleur telle quelle quand elle n est pas une hexadecimale', () => {
    expect(encreDeCours('rouge', '#FFFFFF')).toBe('rouge');
});
