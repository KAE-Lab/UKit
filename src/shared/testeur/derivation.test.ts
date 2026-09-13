/**
 * Ce que la derivation doit tenir : la forme d'un UUID v8, un vecteur fige, et l'accord avec le SHA-256
 * de Node — celui d'`expo-crypto` rend le meme hexadecimal.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { GRAINE, texteAHacher, uuidDepuisEmpreinte } from './derivation';

const UUID_V8 = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sha256(texte: string): string {
    return createHash('sha256').update(texte).digest('hex');
}

describe('texteAHacher', () => {
    it('prefixe la graine de domaine et normalise la valeur', () => {
        expect(texteAHacher(' DD96dec43FB81c97 ')).toBe(`${GRAINE}:dd96dec43fb81c97`);
    });

    it('refuse ce qui n est pas une graine', () => {
        expect(texteAHacher(null)).toBeNull();
        expect(texteAHacher(undefined)).toBeNull();
        expect(texteAHacher('')).toBeNull();
        expect(texteAHacher('   ')).toBeNull();
        expect(texteAHacher(42)).toBeNull();
    });
});

describe('uuidDepuisEmpreinte', () => {
    it('reproduit le vecteur fige', () => {
        const empreinte = sha256(texteAHacher('dd96dec43fb81c97') as string);
        expect(empreinte).toBe('19903915cad413e828eb1e27246086a84945753fe5198d1d86dc1a00f14cbaec');
        expect(uuidDepuisEmpreinte(empreinte)).toBe('19903915-cad4-83e8-a8eb-1e27246086a8');
    });

    it('rend un UUID v8, toujours le meme pour la meme graine, differents pour deux graines', () => {
        const a = uuidDepuisEmpreinte(sha256(texteAHacher('a') as string));
        const b = uuidDepuisEmpreinte(sha256(texteAHacher('b') as string));
        expect(a).toMatch(UUID_V8);
        expect(b).toMatch(UUID_V8);
        expect(a).not.toBe(b);
        expect(uuidDepuisEmpreinte(sha256(texteAHacher('A ') as string))).toBe(a);
    });

    it('refuse autre chose qu une empreinte SHA-256', () => {
        expect(() => uuidDepuisEmpreinte('abc')).toThrow();
    });
});
