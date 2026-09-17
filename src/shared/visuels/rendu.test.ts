import { describe, expect, it } from 'vitest';

import { PALIERS_DE_LARGEUR, palierDeLargeur, qualiteBornee, urlDeRendu } from './rendu';

const ORIGINE = 'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/object/public/media/restaurants/amazone.jpg';
const RENDU = 'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/render/image/public/media/restaurants/amazone.jpg';

describe('palierDeLargeur', () => {
    it('rend le palier exact quand la largeur en est un', () => {
        expect(palierDeLargeur(640)).toBe(640);
    });

    it('arrondit au palier superieur', () => {
        expect(palierDeLargeur(1)).toBe(320);
        expect(palierDeLargeur(321)).toBe(480);
        expect(palierDeLargeur(702)).toBe(960);
    });

    it('plafonne au dernier palier', () => {
        expect(palierDeLargeur(5000)).toBe(PALIERS_DE_LARGEUR[PALIERS_DE_LARGEUR.length - 1]);
    });

    it('rend le premier palier pour une largeur illisible', () => {
        expect(palierDeLargeur(0)).toBe(320);
        expect(palierDeLargeur(-10)).toBe(320);
        expect(palierDeLargeur(Number.NaN)).toBe(320);
    });
});

describe('qualiteBornee', () => {
    it('borne entre 20 et 100 et arrondit', () => {
        expect(qualiteBornee(5)).toBe(20);
        expect(qualiteBornee(250)).toBe(100);
        expect(qualiteBornee(74.6)).toBe(75);
        expect(qualiteBornee(70)).toBe(70);
    });

    it('rend la qualite maximale pour une valeur illisible', () => {
        expect(qualiteBornee(Number.NaN)).toBe(100);
        expect(qualiteBornee(Number.POSITIVE_INFINITY)).toBe(100);
    });
});

describe('urlDeRendu', () => {
    it('transforme une adresse d origine sans requete', () => {
        expect(urlDeRendu(ORIGINE, { largeur: 640, qualite: 75 })).toBe(`${RENDU}?width=640&quality=75`);
    });

    it('conserve la requete existante en tete', () => {
        expect(urlDeRendu(`${ORIGINE}?v=2`, { largeur: 640, qualite: 75 })).toBe(`${RENDU}?v=2&width=640&quality=75`);
    });

    it('applique le palier et la borne de qualite', () => {
        expect(urlDeRendu(ORIGINE, { largeur: 500, qualite: 200 })).toBe(`${RENDU}?width=640&quality=100`);
    });

    it('laisse intacte une adresse d une autre origine', () => {
        const croustillant = 'https://api.croustillant.menu/v1/restaurants/21/preview';
        const affluences = 'https://static.affluences.com/images/sites/12/photo.jpg?v=3';
        expect(urlDeRendu(croustillant, { largeur: 640, qualite: 75 })).toBe(croustillant);
        expect(urlDeRendu(affluences, { largeur: 640, qualite: 75 })).toBe(affluences);
    });

    it('ne retransforme pas une adresse deja rendue', () => {
        const rendue = urlDeRendu(`${ORIGINE}?v=2`, { largeur: 640, qualite: 75 });
        expect(urlDeRendu(rendue, { largeur: 1600, qualite: 85 })).toBe(rendue);
    });

    it('rend null et undefined tels quels', () => {
        expect(urlDeRendu(null, { largeur: 640, qualite: 75 })).toBeNull();
        expect(urlDeRendu(undefined, { largeur: 640, qualite: 75 })).toBeUndefined();
    });

    it('transforme aussi les adresses du socle embarque, qui nomment l hote en dur', () => {
        const logo = 'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/object/public/media/etablissements/bordeaux.webp';
        expect(urlDeRendu(logo, { largeur: 208 * 3, qualite: 80 })).toBe(
            'https://owiksddeqcyyifnmpyqm.supabase.co/storage/v1/render/image/public/media/etablissements/bordeaux.webp?width=640&quality=80',
        );
    });
});
