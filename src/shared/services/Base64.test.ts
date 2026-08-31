import { describe, expect, it } from 'vitest';

import { decoderBase64 } from './Base64';

/**
 * Ce decodeur existe parce que celui de la plateforme a ecrit du texte a la place d'octets — un
 * certificat de scolarite illisible sur appareil, quatre essais pour le nommer. Il est confronte a
 * `Buffer`, l'implementation de reference disponible sous vitest.
 */

/** Le decodage attendu, par l'implementation de reference. */
function reference(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}

describe('decoderBase64', () => {
    it('rend les octets d’un PDF — la signature %PDF s’encode JVBERi', () => {
        const octets = decoderBase64('JVBERi0xLjQK');

        expect(Array.from(octets.slice(0, 5))).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
        expect(octets).toEqual(reference('JVBERi0xLjQK'));
    });

    it('suit l’implementation de reference sur toutes les longueurs de bourrage', () => {
        // Trois restes possibles modulo 3 : sans =, avec =, avec ==.
        for (const texte of ['abc', 'abcd', 'abcde', 'a', 'été — noël', 'Certificat 2026/2027']) {
            const base64 = Buffer.from(texte, 'utf8').toString('base64');
            expect(decoderBase64(base64)).toEqual(reference(base64));
        }
    });

    it('rend un tableau vide pour une chaine vide', () => {
        expect(decoderBase64('')).toEqual(new Uint8Array(0));
    });

    it('tolere les retours a la ligne, que certains encodeurs inserent', () => {
        const base64 = Buffer.from('un contenu un peu plus long que la ligne', 'utf8').toString('base64');
        const plie = `${base64.slice(0, 16)}\r\n${base64.slice(16)}`;

        expect(decoderBase64(plie)).toEqual(reference(base64));
    });

    it('leve sur un caractere hors alphabet plutot que de l’ignorer', () => {
        // Une corruption doit se voir a l'ecriture, pas a l'ouverture du fichier plus tard.
        expect(() => decoderBase64('JVBE Ri0=')).toThrow('hors alphabet');
        expect(() => decoderBase64('JVBé')).toThrow('hors alphabet');
    });

    it('tient un volume de la taille d’un certificat', () => {
        // 94 Ko d'octets pseudo-aleatoires : la taille reelle mesuree sur ReNARD.
        const source = new Uint8Array(94000);
        for (let i = 0; i < source.length; i += 1) source[i] = (i * 31 + 7) % 256;
        const base64 = Buffer.from(source).toString('base64');

        expect(decoderBase64(base64)).toEqual(source);
    });
});
