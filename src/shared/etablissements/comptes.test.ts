/**
 * Ce que le cloisonnement de la session doit tenir.
 *
 * Deux risques, opposes, et aucun ne se voit a la relecture. Une fusion ratee **efface la session
 * d'une autre fac** — invisible jusqu'a la prochaine bascule, c'est-a-dire des semaines plus tard. Une
 * conversion ratee deconnecte **tout le parc installe** le jour de la mise a jour, produisant une fois
 * exactement le defaut que cette correction supprime.
 *
 * C'est aussi la raison pour laquelle ces regles vivent dans un module sans dependance : le trousseau
 * n'est pas jouable sous Node, elles doivent l'etre.
 */

import { describe, expect, it } from 'vitest';

import { fusionnerEntree, lireComptes, lireDossiers, migrerVersTable } from './comptes';

const BORDEAUX = { username: 'etudiant1', password: 'motdepasse1' };
const INP = { username: 'etudiant2', password: 'motdepasse2' };

describe('lireComptes', () => {
    it('lit la table telle qu elle est ecrite', () => {
        expect(lireComptes(JSON.stringify({ bordeaux: BORDEAUX, 'bordeaux-inp': INP }))).toEqual({
            bordeaux: BORDEAUX,
            'bordeaux-inp': INP,
        });
    });

    it('rend une table vide plutot que de lever sur un contenu illisible', () => {
        // Le trousseau n'est ecrit que par nous : un contenu aberrant veut dire qu'une version
        // anterieure ecrivait autre chose. Redemander la connexion est desagreable ; empecher
        // l'application de demarrer serait pire.
        expect(lireComptes('ceci n est pas du JSON')).toEqual({});
        expect(lireComptes(null)).toEqual({});
        expect(lireComptes('')).toEqual({});
        expect(lireComptes('[]')).toEqual({});
        expect(lireComptes('"une chaine"')).toEqual({});
    });

    it('ecarte un compte partiel, qui ne connecterait personne', () => {
        const brut = JSON.stringify({
            bordeaux: BORDEAUX,
            a: { username: 'seul' },
            b: { username: '', password: 'x' },
            c: null,
        });
        expect(lireComptes(brut)).toEqual({ bordeaux: BORDEAUX });
    });

    it('ne rend pas la meme reference que ce qu on lui donne', () => {
        const table = lireComptes(JSON.stringify({ bordeaux: BORDEAUX }));
        expect(table.bordeaux).not.toBe(BORDEAUX);
        expect(table.bordeaux).toEqual(BORDEAUX);
    });
});

describe('lireDossiers', () => {
    it('garde le dossier tel quel, sans rien valider de sa forme', () => {
        // Elle appartient a la scolarite : valider ici ferait de ce module un second endroit a
        // corriger le jour ou un champ du dossier bouge.
        const dossier = { identite: { prenom: 'Camille' }, notes: [1, 2] };
        expect(lireDossiers(JSON.stringify({ bordeaux: dossier })).bordeaux).toEqual(dossier);
    });

    it('rend une table vide sur un contenu illisible', () => {
        expect(lireDossiers('{')).toEqual({});
        expect(lireDossiers(null)).toEqual({});
    });
});

describe('fusionnerEntree', () => {
    it('pose une entree sans toucher aux autres', () => {
        // La sonde du lot : ecrire la seule entree courante effacerait les autres facs, et le defaut
        // resterait invisible jusqu'a la prochaine bascule.
        const table = fusionnerEntree({ bordeaux: BORDEAUX }, 'bordeaux-inp', INP);

        expect(table).toEqual({ bordeaux: BORDEAUX, 'bordeaux-inp': INP });
    });

    it('remplace l entree d un etablissement deja connu', () => {
        const table = fusionnerEntree({ bordeaux: BORDEAUX }, 'bordeaux', INP);
        expect(table).toEqual({ bordeaux: INP });
    });

    it('retire une seule entree avec null, et garde les autres', () => {
        // C'est « Se deconnecter » : il n'a aucune raison d'emporter la session d'une autre fac.
        const table = fusionnerEntree({ bordeaux: BORDEAUX, 'bordeaux-inp': INP }, 'bordeaux', null);

        expect(table).toEqual({ 'bordeaux-inp': INP });
    });

    it('ne mute pas la table qu on lui donne', () => {
        const depart = { bordeaux: BORDEAUX };
        fusionnerEntree(depart, 'bordeaux-inp', INP);
        expect(depart).toEqual({ bordeaux: BORDEAUX });
    });

    it('ignore un code d etablissement vide plutot que d ecrire sous une cle vide', () => {
        expect(fusionnerEntree({ bordeaux: BORDEAUX }, '', INP)).toEqual({ bordeaux: BORDEAUX });
    });
});

describe('migrerVersTable', () => {
    it('range la valeur d avant sous l etablissement selectionne', () => {
        // Sans cette conversion, la correction deconnecterait tout le parc installe le jour de sa mise
        // a jour. La valeur d'avant appartient a l'etablissement selectionne : c'est le seul auquel on
        // ait pu se connecter.
        expect(migrerVersTable(BORDEAUX, 'bordeaux')).toEqual({ bordeaux: BORDEAUX });
    });

    it('convertit un dossier de forme quelconque', () => {
        const dossier = { identite: { prenom: 'Camille' } };
        expect(migrerVersTable(dossier, 'bordeaux-inp')).toEqual({ 'bordeaux-inp': dossier });
    });

    it('rend null quand il n y a rien a convertir', () => {
        // Distinct d'une table vide : la premiere ne demande aucune ecriture, la seconde en
        // demanderait une pour rien.
        expect(migrerVersTable(null, 'bordeaux')).toBeNull();
        expect(migrerVersTable(undefined, 'bordeaux')).toBeNull();
    });

    it('rend null sans etablissement selectionne, plutot que d ecrire sous une cle vide', () => {
        expect(migrerVersTable(BORDEAUX, '')).toBeNull();
    });
});
