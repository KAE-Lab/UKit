/**
 * Ce que la projection des restaurants doit tenir.
 *
 * Trois defauts reels sont verrouilles ici, et aucun n'aurait ete visible a la relecture : une date
 * absente qui vidait le menu entier, des horaires servis sous une forme qui a change sans prevenir,
 * et un jour sans service qui doit rester un jour, pas une erreur.
 */

import { describe, expect, it } from 'vitest';

import { dateIso, horairesEnLignes, horairesLisibles, projeterJourMenu, projeterRestaurant, structurerHoraires } from './CrousMapping';

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

describe('horairesEnLignes', () => {
    it('rend les lignes sans les aplatir, dans les deux formes servies par la source', () => {
        expect(horairesEnLignes('["du lundi au vendredi", "12h-13h45"]')).toEqual(['du lundi au vendredi', '12h-13h45']);
        expect(horairesEnLignes(['lundi', 'mardi'])).toEqual(['lundi', 'mardi']);
    });

    it('rend une liste vide quand il n y a rien a lire', () => {
        // Et non le libelle de repli : c'est `opening` qui le porte. Une liste vide laisse l'ecran de
        // detail ne rien afficher, plutot que d'afficher « horaires non specifies » en section.
        expect(horairesEnLignes(null)).toEqual([]);
        expect(horairesEnLignes('[pas du json')).toEqual([]);
    });
});

describe('structurerHoraires', () => {
    it('reconnait un guichet et son creneau', () => {
        expect(structurerHoraires(['SELF : 11h15-13h45'])).toEqual([
            { kind: 'service', nom: 'SELF', horaire: '11h15-13h45' },
        ]);
    });

    it('distingue un guichet sans creneau d une periode : ce ne sont pas la meme chose', () => {
        expect(structurerHoraires(["CAFET' :"])).toEqual([{ kind: 'guichet', nom: "CAFET'" }]);
        expect(structurerHoraires(['le vendredi'])).toEqual([{ kind: 'periode', texte: 'le vendredi' }]);
    });

    it('reconnait une periode de jours, mais pas une phrase qui commence par un jour', () => {
        expect(structurerHoraires(['du lundi au vendredi'])).toEqual([
            { kind: 'periode', texte: 'du lundi au vendredi' },
        ]);
        // Trop longue pour un intertitre : c'est une phrase, elle se lit comme telle.
        const longue = "le samedi ferme jusqu'a la fin de l'annee universitaire";
        expect(structurerHoraires([longue])).toEqual([{ kind: 'note', texte: longue }]);
    });

    it('distingue un creneau nu d une phrase qui contient une heure', () => {
        expect(structurerHoraires(['7h45-10h | 11h30-13h45'])).toEqual([
            { kind: 'horaire', texte: '7h45-10h | 11h30-13h45' },
        ]);
        const phrase = "Fermeture pour conges d'ete le mardi 30/06 a 13h45";
        expect(structurerHoraires([phrase])).toEqual([{ kind: 'note', texte: phrase }]);
    });

    it('nettoie les espaces doubles et les barres residuelles servies par la source', () => {
        expect(structurerHoraires(['SELF : 11h15 - 13h45 |'])).toEqual([
            { kind: 'service', nom: 'SELF', horaire: '11h15 - 13h45' },
        ]);
        expect(structurerHoraires(["Fermeture pour conges d'ete  le vendredi 26/06"])).toEqual([
            { kind: 'note', texte: "Fermeture pour conges d'ete le vendredi 26/06" },
        ]);
    });

    it('ecarte les lignes vides et retombe en note sur ce qu elle ne reconnait pas', () => {
        expect(structurerHoraires(['', '   ', 'Ouverture officielle le lundi 26 janvier'])).toEqual([
            { kind: 'note', texte: 'Ouverture officielle le lundi 26 janvier' },
        ]);
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
