/**
 * Ce que la projection des bibliotheques doit tenir.
 *
 * Le piege d'arite est ici, et il n'est pas theorique : **tous** les sites de la region n'ont qu'une
 * categorie, donc `$.categories[*].id` rend `20` et jamais `[20]`. Un filtre ecrit pour une liste
 * aurait donc rendu une liste vide sur des donnees parfaitement normales, sans rien signaler.
 */

import { describe, expect, it } from 'vitest';

import {
    commeListe,
    estBibliotheque,
    projeterAffluence,
    projeterHoraire,
    projeterSite,
    visuelDuSite,
} from './LibraryMapping';

const REPLI_CAMPUS = 'Campus';

describe('commeListe', () => {
    it('accepte les trois arites d une extraction', () => {
        expect(commeListe(null)).toEqual([]);
        expect(commeListe(20)).toEqual([20]);
        expect(commeListe([1, 20])).toEqual([1, 20]);
    });
});

describe('estBibliotheque', () => {
    it('retient un site dont la categorie unique arrive en scalaire', () => {
        expect(estBibliotheque({ categories: 20 })).toBe(true);
        expect(estBibliotheque({ categories: 1 })).toBe(true);
    });

    it('retient un site dont l une des categories convient', () => {
        expect(estBibliotheque({ categories: [3, 20] })).toBe(true);
    });

    it('ecarte les autres lieux geres par le fournisseur', () => {
        expect(estBibliotheque({ categories: 3 })).toBe(false);
        expect(estBibliotheque({ categories: [] })).toBe(false);
        expect(estBibliotheque({})).toBe(false);
    });
});

describe('visuelDuSite', () => {
    it('prefere la premiere image a l affiche', () => {
        expect(visuelDuSite({ images: ['a.jpg', 'b.jpg'], image_poster: 'poster.jpg' })).toBe('a.jpg');
    });

    it('retombe sur l affiche quand le site n a pas d image', () => {
        expect(visuelDuSite({ images: [], image_poster: 'poster.jpg' })).toBe('poster.jpg');
        expect(visuelDuSite({ image_poster: 'poster.jpg' })).toBe('poster.jpg');
    });

    it('rend undefined quand il n y a ni image ni affiche', () => {
        expect(visuelDuSite({})).toBeUndefined();
    });
});

describe('projeterSite', () => {
    it('projette un site complet', () => {
        const site = projeterSite(
            {
                id: 'abc',
                nom: 'BU Droit-Lettres',
                slug: 'bu-droit-lettres-pessac',
                ville: 'Pessac',
                lat: 44.7965,
                lon: -0.619588,
                distance_estimee: 640.65,
            },
            REPLI_CAMPUS,
        );

        expect(site).toMatchObject({
            id: 'abc',
            name: 'BU Droit-Lettres',
            campus: 'Pessac',
            slug: 'bu-droit-lettres-pessac',
            distanceEstimee: 640.65,
        });
    });

    it('retombe sur le libelle de campus quand la ville manque', () => {
        expect(projeterSite({ id: 'x' }, REPLI_CAMPUS).campus).toBe(REPLI_CAMPUS);
    });

    it('laisse les coordonnees absentes absentes', () => {
        const site = projeterSite({ id: 'x' }, REPLI_CAMPUS);
        expect(site.lat).toBeUndefined();
        expect(site.lng).toBeUndefined();
    });
});

describe('projeterAffluence', () => {
    it('lit le taux dans percentage', () => {
        expect(projeterAffluence({ ouvert: true, pourcentage: 42, occupation: null }).occupancyRate).toBe(42);
    });

    it('retombe sur occupancy quand percentage manque', () => {
        // Les deux formes coexistent selon les sites : le Blueprint extrait les deux, le choix est ici.
        expect(projeterAffluence({ ouvert: true, pourcentage: null, occupation: 17 }).occupancyRate).toBe(17);
    });

    it('rend un site ferme sans taux, ce qui est un resultat et non un echec', () => {
        const affluence = projeterAffluence({
            ouvert: false,
            texte_ouverture: 'Ouvre le lun. 17/08 a 09:00',
            pourcentage: null,
            occupation: null,
        });

        expect(affluence.isOpen).toBe(false);
        expect(affluence.occupancyRate).toBeNull();
        expect(affluence.openingText).toBe('Ouvre le lun. 17/08 a 09:00');
        expect(affluence.closingTime).toBeUndefined();
    });

    it('accepte un taux nul sans le confondre avec une absence', () => {
        expect(projeterAffluence({ ouvert: true, pourcentage: 0 }).occupancyRate).toBe(0);
    });
});

describe('projeterHoraire', () => {
    it('garde les paires ouverture/fermeture telles quelles', () => {
        const entree = projeterHoraire({
            jour: '2026-09-14',
            aujourdhui: true,
            ouvertures: [{ openingHour: '2026-09-14 08:30:00', closingHour: '2026-09-14 22:00:00' }],
        });

        expect(entree.day).toBe('2026-09-14');
        expect(entree.isToday).toBe(true);
        expect(entree.openingHours).toHaveLength(1);
        expect(entree.openingHours[0].closingHour).toBe('2026-09-14 22:00:00');
    });

    it('rend une journee fermee sans plage plutot qu une absence de journee', () => {
        expect(projeterHoraire({ jour: '2026-08-03', aujourdhui: false, ouvertures: [] })).toEqual({
            day: '2026-08-03',
            isToday: false,
            openingHours: [],
        });
    });
});
