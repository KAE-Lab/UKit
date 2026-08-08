/**
 * Ce que la projection des restaurants doit tenir.
 *
 * Trois defauts reels sont verrouilles ici, et aucun n'aurait ete visible a la relecture : une date
 * absente qui vidait le menu entier, des horaires servis sous une forme qui a change sans prevenir,
 * et un jour sans service qui doit rester un jour, pas une erreur.
 */

import { describe, expect, it } from 'vitest';

import { dateIso, horairesLisibles, projeterJourMenu, projeterRestaurant } from './CrousMapping';

const REPLI_HORAIRES = 'Horaires non specifies';
const REPLI_CATEGORIE = 'Categorie';

describe('dateIso', () => {
    it('convertit le format du fournisseur vers celui de l application', () => {
        expect(dateIso('10-08-2026')).toBe('2026-08-10');
    });

    it('rend null sur une date absente plutot que de lever', () => {
        // Le code d'origine appelait `.includes()` avant de verifier la valeur : une reponse sans
        // date faisait echouer la transformation, et le `catch` du service rendait une liste vide.
        expect(dateIso(null)).toBeNull();
        expect(dateIso(undefined)).toBeNull();
        expect(dateIso('')).toBeNull();
    });

    it('laisse passer une valeur qui n a pas la forme attendue', () => {
        // Une date deja au format de l'application traverse **sans etre retournee** : la conversion
        // ne se declenche que si le troisieme groupe est une annee. Le jour ou la source changerait
        // de format, l'application ne se mettrait donc pas a afficher des dates fausses.
        expect(dateIso('2026-08-10')).toBe('2026-08-10');
        expect(dateIso('demain')).toBe('demain');
    });
});

describe('horairesLisibles', () => {
    it('lit la chaine JSON que la source sert aujourd hui', () => {
        expect(horairesLisibles('["du lundi au vendredi", "12h-13h45"]', REPLI_HORAIRES)).toBe(
            'du lundi au vendredi | 12h-13h45',
        );
    });

    it('accepte encore le tableau que la source servait hier', () => {
        expect(horairesLisibles(['lundi', 'mardi'], REPLI_HORAIRES)).toBe('lundi | mardi');
    });

    it('retombe sur le libelle quand la valeur est illisible ou vide', () => {
        expect(horairesLisibles('[pas du json', REPLI_HORAIRES)).toBe(REPLI_HORAIRES);
        expect(horairesLisibles(null, REPLI_HORAIRES)).toBe(REPLI_HORAIRES);
        expect(horairesLisibles([], REPLI_HORAIRES)).toBe(REPLI_HORAIRES);
        expect(horairesLisibles('12h-14h', REPLI_HORAIRES)).toBe(REPLI_HORAIRES);
    });
});

describe('projeterRestaurant', () => {
    it('construit l URL de visuel et prefere la zone a l adresse', () => {
        const restaurant = projeterRestaurant(
            { code: 1642, nom: 'Restaurant la passerelle', zone: 'Pessac', adresse: 'Avenue Leon Duguit', lat: 44.8, lon: -0.61 },
            REPLI_HORAIRES,
        );

        expect(restaurant.id).toBe('1642');
        expect(restaurant.short_desc).toBe('Pessac');
        expect(restaurant.image_url).toBe('https://api.croustillant.menu/v1/restaurants/1642/preview');
        expect(restaurant.distance).toBeUndefined();
    });

    it('retombe sur l adresse quand la zone manque', () => {
        const restaurant = projeterRestaurant({ code: 1, nom: 'Cap Sud', adresse: 'Talence' }, REPLI_HORAIRES);
        expect(restaurant.short_desc).toBe('Talence');
    });
});

describe('projeterJourMenu', () => {
    const jour = {
        date: '10-08-2026',
        repas: [
            {
                type: 'midi',
                categories: [{ libelle: 'Entrees', plats: [{ libelle: 'Salade' }, { libelle: 'Soupe' }] }],
            },
        ],
    };

    it('regroupe les categories par service', () => {
        const menu = projeterJourMenu(jour, REPLI_CATEGORIE);

        expect(menu.date).toBe('2026-08-10');
        expect(menu.midi).toEqual([{ name: 'Entrees', dishes: ['Salade', 'Soupe'] }]);
        expect(menu.soir).toEqual([]);
    });

    it('rend un jour vide plutot qu une erreur quand aucun service n est publie', () => {
        // C'est la sonde du jalon : un jour sans service est un **resultat**, l'ecran affiche son
        // etat vide et non un message d'echec.
        const menu = projeterJourMenu({ date: '11-08-2026', repas: [] }, REPLI_CATEGORIE);
        expect(menu).toEqual({ date: '2026-08-11', midi: [], soir: [] });
    });

    it('nomme une categorie sans libelle avec le repli traduit', () => {
        const menu = projeterJourMenu(
            { date: '10-08-2026', repas: [{ type: 'soir', categories: [{ plats: [] }] }] },
            REPLI_CATEGORIE,
        );
        expect(menu.soir).toEqual([{ name: REPLI_CATEGORIE, dishes: [] }]);
    });

    it('survit a un sous-arbre absent', () => {
        expect(projeterJourMenu({ date: null, repas: null }, REPLI_CATEGORIE)).toEqual({
            date: null,
            midi: [],
            soir: [],
        });
    });
});
