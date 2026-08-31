/**
 * Ce que la lecture des reglages par etablissement doit tenir.
 *
 * Le risque est une **migration silencieuse** : une installation existante porte ces reglages sous
 * l'ancienne forme — une simple liste — et la lire de travers effacerait les groupes favoris de
 * quelqu'un sans rien dire, au premier lancement suivant une mise a jour. Aucun des cas d'ici ne se
 * voit a la relecture.
 */

import { describe, expect, it } from 'vitest';

import { commeListeDeGroupes, commeTableParEtablissement, restaurerReglages } from './reglagesParEtablissement';

describe('commeListeDeGroupes', () => {
    it('lit l ancienne forme comme appartenant a l etablissement actif', () => {
        // Une installation anterieure au cloisonnement : la liste est celle de l'universite qu'elle
        // utilisait, et c'est la seule interpretation possible.
        expect(commeListeDeGroupes(['INF601A5', 'MI601A'], 'bordeaux')).toEqual(['INF601A5', 'MI601A']);
        expect(commeListeDeGroupes(['INF601A5'], 'bordeaux-inp')).toEqual(['INF601A5']);
    });

    it('lit la nouvelle forme, et ne rend que l etablissement demande', () => {
        const persiste = { bordeaux: ['INF601A5'], 'bordeaux-inp': ['ENSC 2A GR1'] };

        expect(commeListeDeGroupes(persiste, 'bordeaux')).toEqual(['INF601A5']);
        expect(commeListeDeGroupes(persiste, 'bordeaux-inp')).toEqual(['ENSC 2A GR1']);
        // Un etablissement jamais visite n'a pas de favoris : une liste vide, pas une erreur.
        expect(commeListeDeGroupes(persiste, 'toulouse')).toEqual([]);
    });

    it('ne rend rien d exploitable sur une valeur abimee', () => {
        expect(commeListeDeGroupes(null, 'bordeaux')).toEqual([]);
        expect(commeListeDeGroupes('INF601A5', 'bordeaux')).toEqual([]);
        expect(commeListeDeGroupes([42, 'INF601A5', null], 'bordeaux')).toEqual(['INF601A5']);
        expect(commeListeDeGroupes({ bordeaux: 'INF601A5' }, 'bordeaux')).toEqual([]);
    });
});

describe('commeTableParEtablissement', () => {
    it('range une ancienne liste sous l etablissement actif', () => {
        expect(commeTableParEtablissement(['INF601A5'], 'bordeaux')).toEqual({ bordeaux: ['INF601A5'] });
    });

    it('garde la table entiere, tous etablissements confondus', () => {
        // Le point du cloisonnement : basculer ne doit pas faire oublier l'autre cote.
        const persiste = { bordeaux: ['INF601A5'], 'bordeaux-inp': ['ENSC 1A', 'ENSC 2A GR1'] };
        expect(commeTableParEtablissement(persiste, 'bordeaux')).toEqual(persiste);
    });

    it('ecarte les entrees inexploitables sans jeter les autres', () => {
        expect(commeTableParEtablissement({ bordeaux: ['A'], casse: 'B', vide: null }, 'bordeaux')).toEqual({
            bordeaux: ['A'],
        });
    });

    it('rend une table vide sur une valeur absente', () => {
        expect(commeTableParEtablissement(undefined, 'bordeaux')).toEqual({});
    });
});

describe('restaurerReglages', () => {
    it('restaure les trois formes historiques au meme endroit', () => {
        // 1. `groupName`, d'avant les favoris multiples.
        expect(restaurerReglages({ groupName: 'INF601A5' }, 'bordeaux').favoris).toEqual(['INF601A5']);

        // 2. La liste, d'avant le cloisonnement : elle appartient a l'etablissement actif.
        const liste = restaurerReglages({ favoriteGroups: ['INF601A5'], filters: ['4TIN'] }, 'bordeaux');
        expect(liste.favoris).toEqual(['INF601A5']);
        expect(liste.favorisParEtablissement).toEqual({ bordeaux: ['INF601A5'] });
        expect(liste.filtresParEtablissement).toEqual({ bordeaux: ['4TIN'] });

        // 3. La table : la vue est celle de l'actif, la memoire garde les deux cotes.
        const table = restaurerReglages(
            { favoriteGroups: { bordeaux: ['INF601A5'], 'bordeaux-inp': ['ENSC 2A GR1'] } },
            'bordeaux-inp',
        );
        expect(table.favoris).toEqual(['ENSC 2A GR1']);
        expect(table.favorisParEtablissement.bordeaux).toEqual(['INF601A5']);
    });

    it('range un `groupName` migre sous l etablissement actif, pas dans le vide', () => {
        // Sans ca, la toute premiere bascule d'une installation ancienne perdrait le groupe migre :
        // la vue le porterait, la table non, et `saveSettings` ecrirait la table.
        const restaures = restaurerReglages({ groupName: 'INF601A5' }, 'bordeaux');
        expect(restaures.favorisParEtablissement).toEqual({ bordeaux: ['INF601A5'] });
    });

    it('rend des reglages vides sur un document sans rien', () => {
        expect(restaurerReglages({}, 'bordeaux')).toEqual({
            favoris: [],
            filtres: [],
            favorisParEtablissement: {},
            filtresParEtablissement: {},
        });
    });
});
