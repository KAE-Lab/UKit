/**
 * La regle `?v=N` : elle incremente, elle ne repart jamais de zero, et elle ne perd rien.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { versionDeUrl, versionnerUrl } from './versionnerUrl';

const BASE = 'https://projet.supabase.co/storage/v1/object/public/media/annonces/soiree.jpg';

test('une adresse sans version recoit v=1', () => {
    expect(versionnerUrl(BASE)).toBe(`${BASE}?v=1`);
});

test('une adresse versionnee est incrementee', () => {
    expect(versionnerUrl(`${BASE}?v=1`)).toBe(`${BASE}?v=2`);
    expect(versionnerUrl(`${BASE}?v=41`)).toBe(`${BASE}?v=42`);
});

test('une version illisible repart a 1 sans casser l adresse', () => {
    expect(versionnerUrl(`${BASE}?v=abc`)).toBe(`${BASE}?v=1`);
    expect(versionnerUrl(`${BASE}?v=`)).toBe(`${BASE}?v=1`);
});

test('les autres parametres sont conserves', () => {
    expect(versionnerUrl(`${BASE}?t=12&v=3`)).toBe(`${BASE}?t=12&v=4`);
});

test('la version se lit, et vaut 0 sans parametre ou sur une adresse invalide', () => {
    expect(versionDeUrl(`${BASE}?v=7`)).toBe(7);
    expect(versionDeUrl(BASE)).toBe(0);
    expect(versionDeUrl('pas une adresse')).toBe(0);
});
