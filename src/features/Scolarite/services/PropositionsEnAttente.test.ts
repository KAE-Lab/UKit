/**
 * Ce que la table des propositions en attente doit tenir.
 *
 * Elle existe parce que le planning d'une universite est **vide tout l'ete** — mesure : 33 cours la
 * semaine du 12 janvier pour INF601A5, zero fin aout et mi-septembre — et que c'est exactement la
 * periode ou l'on installe l'application. Sans elle, une connexion d'ete perdrait la proposition au
 * prochain demarrage, definitivement.
 *
 * Le risque qu'elle porte est celui de tout ce qui vient du trousseau : une entree corrompue ne leve
 * pas, elle propose une valeur fausse. Pour l'emploi du temps, une valeur fausse est le planning de
 * quelqu'un d'autre.
 */

import { describe, expect, it } from 'vitest';

import { lirePropositionsEnAttente, propositionsDe } from './PropositionsEnAttente';

const ENTREE = { ues: ['4TIN606U', '4TTVP32U'], edt: null };

describe('lirePropositionsEnAttente', () => {
    it('lit la table telle qu elle est ecrite', () => {
        expect(lirePropositionsEnAttente(JSON.stringify({ bordeaux: ENTREE }))).toEqual({ bordeaux: ENTREE });
    });

    it('rend une table vide plutot que de lever sur un contenu illisible', () => {
        expect(lirePropositionsEnAttente('{')).toEqual({});
        expect(lirePropositionsEnAttente(null)).toEqual({});
        expect(lirePropositionsEnAttente('[]')).toEqual({});
    });

    it('rejoue la garde de l identifiant ADE plutot que de la recopier', () => {
        // L'export anonyme accepte n'importe quel identifiant : une entree corrompue afficherait
        // l'emploi du temps de quelqu'un d'autre, sans erreur. La garde vit dans `projeterEdt`, et
        // c'est elle qu'on rejoue — y compris sa tolerance a la forme habillee par l'arbre d'ADE.
        const brut = JSON.stringify({
            refuse: { ues: [], edt: { ressource: '4087;DROP', libelle: 'X' } },
            habille: { ues: [], edt: { ressource: 'Direct Planning Tree_4087', libelle: 'Moi' } },
            nu: { ues: [], edt: { ressource: '4156', libelle: 'Moi' } },
        });
        const table = lirePropositionsEnAttente(brut);

        expect(table.refuse).toBeUndefined();
        expect(table.habille.edt).toEqual({ ressource: '4087', libelle: 'Moi' });
        expect(table.nu.edt).toEqual({ ressource: '4156', libelle: 'Moi' });
    });

    it('ecarte un code d UE qui ne masquerait jamais rien', () => {
        const brut = JSON.stringify({ bordeaux: { ues: ['4TIN606U', '', 'abc', 2026], edt: null } });
        expect(lirePropositionsEnAttente(brut).bordeaux.ues).toEqual(['4TIN606U']);
    });

    it('ne garde pas une entree devenue vide', () => {
        // Elle ferait croire a une attente, et l'ecran redeciderait pour rien a chaque lancement.
        expect(lirePropositionsEnAttente(JSON.stringify({ bordeaux: { ues: [], edt: null } }))).toEqual({});
    });
});

describe('propositionsDe', () => {
    it('ne rend que l entree de l etablissement demande', () => {
        const table = lirePropositionsEnAttente(JSON.stringify({ bordeaux: ENTREE }));
        expect(propositionsDe(table, 'bordeaux')).toEqual(ENTREE);
        expect(propositionsDe(table, 'bordeaux-inp')).toBeNull();
    });
});
