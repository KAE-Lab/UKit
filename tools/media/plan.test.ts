/**
 * Le plan : ce qui est deja fait, ce qui ne gagnerait rien, et ce qui descend a sa largeur d'usage.
 * Les cas portent les objets reellement mesures dans le bucket le 2026-09-16.
 */

import { describe, expect, it } from 'vitest';

import { dossierDe, largeurPour, planifier, QUALITE_WEBP, secondesDeCache, UN_AN } from './plan.mjs';

describe('secondesDeCache', () => {
    it('lit un max-age', () => {
        expect(secondesDeCache('max-age=31536000')).toBe(UN_AN);
        expect(secondesDeCache('public, max-age=3600')).toBe(3600);
    });

    it('rend zero pour tout ce qui ne promet rien', () => {
        expect(secondesDeCache('no-cache')).toBe(0);
        expect(secondesDeCache(undefined)).toBe(0);
        expect(secondesDeCache(null)).toBe(0);
        expect(secondesDeCache('')).toBe(0);
    });
});

describe('largeurPour', () => {
    it('borne une affiche a 1080 et une photo a 1200', () => {
        expect(largeurPour('annonces/ukit-v6.png')).toBe(1080);
        expect(largeurPour('restaurants/amazone.jpg')).toBe(1200);
        expect(largeurPour('batiments/cremi.jpg')).toBe(1200);
        expect(largeurPour('bibliotheques/une-bu.jpg')).toBe(1200);
    });

    it('prend la plus large pour un dossier inconnu', () => {
        expect(largeurPour('nouveau-dossier/photo.jpg')).toBe(1200);
        expect(largeurPour('sans-dossier.jpg')).toBe(1200);
    });

    it('lit le dossier', () => {
        expect(dossierDe('annonces/ukit.png')).toBe('annonces');
        expect(dossierDe('sans-dossier.jpg')).toBe('');
    });
});

describe('planifier', () => {
    it('ignore un objet qui porte deja un cache d un an', () => {
        const [decision] = planifier([
            { chemin: 'annonces/campulsations-24-septembre.jpg', taille: 164284, mime: 'image/jpeg', cache: 'max-age=31536000' },
        ]);
        expect(decision?.action).toBe('ignorer');
    });

    it('repose un WebP sans le re-encoder : les deux logos mesures grossissaient', () => {
        const [logo, affiche] = planifier([
            { chemin: 'etablissements/bordeaux.webp', taille: 20324, mime: 'image/webp', cache: 'no-cache' },
            { chemin: 'annonces/d3d4d4a9-trois-campus.webp', taille: 172794, mime: 'image/webp', cache: 'no-cache' },
        ]);
        expect(logo?.action).toBe('reposer');
        expect(affiche?.action).toBe('reposer');
    });

    it('re-encode le reste en WebP, a la largeur de son usage', () => {
        const [photo, png] = planifier([
            { chemin: 'restaurants/amazone.jpg', taille: 498585, mime: 'image/jpeg', cache: 'no-cache' },
            { chemin: 'annonces/ukit-v6.png', taille: 415655, mime: 'image/png', cache: 'no-cache' },
        ]);
        expect(photo).toMatchObject({ action: 'reencoder', largeur: 1200, qualite: QUALITE_WEBP, mimeCible: 'image/webp' });
        expect(png).toMatchObject({ action: 'reencoder', largeur: 1080, mimeCible: 'image/webp' });
    });

    it('rend une decision par objet, dans l ordre, avec sa taille et sa raison', () => {
        const decisions = planifier([
            { chemin: 'batiments/cremi.jpg', taille: 88143, mime: 'image/jpeg', cache: 'no-cache' },
            { chemin: 'annonces/deja.webp', taille: 1000, mime: 'image/webp', cache: 'max-age=31536000' },
        ]);
        expect(decisions).toHaveLength(2);
        expect(decisions[0]?.chemin).toBe('batiments/cremi.jpg');
        expect(decisions[0]?.taille).toBe(88143);
        expect(decisions.every((decision) => decision.raison.length > 0)).toBe(true);
    });

    it('re-encode un objet dont le type est inconnu plutot que de le laisser tel quel', () => {
        const [decision] = planifier([{ chemin: 'annonces/sans-type', taille: 500, cache: 'no-cache' }]);
        expect(decision?.action).toBe('reencoder');
    });
});
