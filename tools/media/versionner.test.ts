/**
 * La regle `?v=N` et la reconnaissance de nos adresses.
 *
 * Les cas de `versionner` sont ceux de sa jumelle `console/src/lib/versionnerUrl.test.ts` : les deux
 * implementations doivent rester d'accord, et c'est ici qu'on s'en apercoit.
 */

import { describe, expect, it } from 'vitest';

import { cheminDObjet, versionner } from './versionner.mjs';

const PROJET = 'https://projet.supabase.co';
const BASE = `${PROJET}/storage/v1/object/public/media/annonces/soiree.jpg`;

describe('versionner', () => {
    it('pose v=1 sur une adresse sans version, et incremente ensuite', () => {
        expect(versionner(BASE)).toBe(`${BASE}?v=1`);
        expect(versionner(`${BASE}?v=1`)).toBe(`${BASE}?v=2`);
        expect(versionner(`${BASE}?v=41`)).toBe(`${BASE}?v=42`);
    });

    it('repart a 1 sur une version illisible, sans casser l adresse', () => {
        expect(versionner(`${BASE}?v=abc`)).toBe(`${BASE}?v=1`);
        expect(versionner(`${BASE}?v=`)).toBe(`${BASE}?v=1`);
    });

    it('conserve les autres parametres', () => {
        expect(versionner(`${BASE}?t=12&v=3`)).toBe(`${BASE}?t=12&v=4`);
    });
});

describe('cheminDObjet', () => {
    it('rend le chemin d un objet de notre bucket, version comprise', () => {
        expect(cheminDObjet(BASE, PROJET)).toBe('annonces/soiree.jpg');
        expect(cheminDObjet(`${BASE}?v=2`, PROJET)).toBe('annonces/soiree.jpg');
        expect(cheminDObjet(`${PROJET}/storage/v1/object/public/media/etablissements/bordeaux.webp`, PROJET)).toBe(
            'etablissements/bordeaux.webp',
        );
    });

    it('refuse ce qui n est pas a nous : une source tierce, un autre bucket, une autre route', () => {
        expect(cheminDObjet('https://api.croustillant.menu/v1/restaurants/21/preview', PROJET)).toBeNull();
        expect(cheminDObjet(`${PROJET}/storage/v1/object/public/blueprints/manifest.json`, PROJET)).toBeNull();
        expect(cheminDObjet(`${PROJET}/storage/v1/render/image/public/media/annonces/soiree.jpg`, PROJET)).toBeNull();
        expect(cheminDObjet('https://autre.supabase.co/storage/v1/object/public/media/a.jpg', PROJET)).toBeNull();
    });

    it('refuse ce qui n est pas une adresse — dont la chaine vide de `visuels`', () => {
        expect(cheminDObjet('', PROJET)).toBeNull();
        expect(cheminDObjet('pas une adresse', PROJET)).toBeNull();
    });
});
