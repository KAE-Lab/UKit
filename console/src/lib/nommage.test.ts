/**
 * Le nom d'objet unique : le dossier, un identifiant court, le slug du fichier, `.webp`.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { identifiantCourt, nomDObjet } from './nommage';

test('le nom porte le dossier, l identifiant, le slug et l extension webp', () => {
    expect(nomDObjet('annonces', 'Affiche Soirée.JPG', '3f2a9c1d')).toBe('annonces/3f2a9c1d-affiche-soiree.webp');
    expect(nomDObjet('batiments', 'a28', 'deadbeef')).toBe('batiments/deadbeef-a28.webp');
});

test('deux fichiers du meme nom donnent deux objets', () => {
    const a = nomDObjet('annonces', 'affiche.jpg', identifiantCourt());
    const b = nomDObjet('annonces', 'affiche.jpg', identifiantCourt());
    expect(a).not.toBe(b);
    expect(a).toMatch(/^annonces\/[0-9a-f]{8}-affiche\.webp$/);
});

test('un nom sans lettre devient image, un nom trop long est borne', () => {
    expect(nomDObjet('annonces', '!!!.png', 'abcdef01')).toBe('annonces/abcdef01-image.webp');
    expect(nomDObjet('annonces', `${'a'.repeat(80)}-b.png`, 'abcdef01')).toBe(`annonces/abcdef01-${'a'.repeat(48)}.webp`);
});

test('l identifiant court est tire d un uuid, sans tirets', () => {
    expect(identifiantCourt('574C8942-3502-413A-937E-D1818C5E352B')).toBe('574c8942');
});
