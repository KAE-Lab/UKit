/**
 * Le masquage : large sur les numeros, precis sur ce qu il ne doit pas toucher.
 */

import { describe, expect, it } from 'vitest';

import { ADRESSE_RETIREE, masquer, NUMERO_RETIRE } from './nettoyage.mjs';

describe('masquer', () => {
    it.each([
        '06 12 34 56 78',
        '0612345678',
        '06.12.34.56.78',
        '06-12-34-56-78',
        '+33 6 12 34 56 78',
        '+33612345678',
        '05 56 84 00 00',
    ])('retire le numero « %s »', (numero) => {
        expect(masquer(`appelle-moi au ${numero} merci`)).toBe(`appelle-moi au ${NUMERO_RETIRE} merci`);
    });

    it('retire une adresse', () => {
        expect(masquer('mon mail : prenom.nom@u-bordeaux.fr !')).toBe(`mon mail : ${ADRESSE_RETIREE} !`);
        expect(masquer('a+b@exemple.co.uk')).toBe(ADRESSE_RETIREE);
    });

    it.each([
        '6.0.0',
        'iOS 26.6.1',
        '2026',
        '17',
        'id1394708917',
        'Version 6.1.0 sur un Pixel 3',
        'le 12/09/2026 a 10h',
    ])('laisse « %s »', (texte) => {
        expect(masquer(texte)).toBe(texte);
    });

    it('retire deux occurrences dans une phrase, et rend vide pour vide', () => {
        expect(masquer('a@b.fr ou 0612345678')).toBe(`${ADRESSE_RETIREE} ou ${NUMERO_RETIRE}`);
        expect(masquer('')).toBe('');
    });
});
