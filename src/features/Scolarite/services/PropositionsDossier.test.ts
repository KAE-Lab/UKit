/**
 * Ce que les propositions du dossier doivent tenir.
 *
 * Deux risques, et aucun ne se voit a l'ecran. Une UE mal lue devient un **filtre plausible mais
 * faux** : le planning se vide, et rien n'explique pourquoi. Un identifiant ADE mal lu est pire —
 * l'export anonyme accepte n'importe quel identifiant de ressource et rend l'emploi du temps
 * correspondant, donc une lecture approximative afficherait sans erreur **le planning de quelqu'un
 * d'autre**.
 *
 * Les valeurs testees sont mesurees sur les vraies sources le 2026-08-22, en jouant les deux
 * Blueprints de dossier contre les portails.
 */

import { describe, expect, it } from 'vitest';

import {
    aQuelqueChoseAProposer,
    projeterEdt,
    projeterPropositions,
    projeterUes,
} from './PropositionsDossier';

/** Un echantillon reel de l'annuaire de Bordeaux : 39 entrees, dont 14 unites d'enseignement. */
const APPARTENANCES = [
    'local:etudiants',
    'ubx:applis:ann:cremi:actifs',
    'ubx:applis:concrete5:ens:etucelcat',
    'ubx:etud:colleges:109',
    'ubx:etud:etapes:lic:4tlin3',
    'ubx:etud:niveaux:l3st',
    'ubx:etud:uf:137',
    'ubx:etud:ue:4tin602u',
    'ubx:etud:ue:4tin615u',
    'ubx:etud:ue:4ttva35u',
];

describe('projeterUes', () => {
    it('ne retient que les unites d enseignement, en majuscules et triees', () => {
        expect(projeterUes(APPARTENANCES)).toEqual(['4TIN602U', '4TIN615U', '4TTVA35U']);
    });

    it('ecarte les etapes, niveaux, colleges et droits applicatifs', () => {
        // L'annuaire melange tout : sans ce tri, on proposerait `L3ST` ou `137` comme filtres d'UE.
        const bruit = projeterUes(APPARTENANCES).filter((code) => !code.startsWith('4T'));
        expect(bruit).toEqual([]);
    });

    it('refuse un code qui ne correspond pas au motif du planning', () => {
        // La garde qui compte : un filtre qui ne correspondra jamais a aucun cours viderait l'emploi
        // du temps **sans rien dire**. Le motif est celui de `separerCodeUE`, volontairement.
        expect(projeterUes(['ubx:etud:ue:', 'ubx:etud:ue:abc', 'ubx:etud:ue:2026'])).toEqual([]);
    });

    it('dedoublonne', () => {
        expect(projeterUes(['ubx:etud:ue:4tin602u', 'ubx:etud:ue:4TIN602U'])).toEqual(['4TIN602U']);
    });

    it('rend une liste vide quand la source n a rien publie', () => {
        // Un etablissement qui n'expose pas d'annuaire, ou une lecture qui n'a rien trouve : les deux
        // rendent une liste vide, et l'ecran ne pose alors aucune question.
        expect(projeterUes(undefined)).toEqual([]);
        expect(projeterUes([])).toEqual([]);
        expect(projeterUes('ubx:etud:ue:4tin602u')).toEqual([]);
    });
});

describe('projeterEdt', () => {
    it('deshabille l identifiant que l arbre d ADE porte', () => {
        expect(projeterEdt(['Direct Planning Tree_4087'], ['Belharet Damien'])).toEqual({
            ressource: '4087',
            libelle: 'Belharet Damien',
        });
    });

    it('accepte un identifiant deja nu', () => {
        expect(projeterEdt('4087', 'Une promotion')?.ressource).toBe('4087');
    });

    it('refuse un identifiant qui n est pas un nombre', () => {
        // La garde la plus importante du module. L'export anonyme d'ADE rend l'emploi du temps de
        // **n'importe quelle** ressource : proposer un identifiant mal lu afficherait le planning de
        // quelqu'un d'autre, sans la moindre erreur.
        expect(projeterEdt(['Direct Planning Tree_'], ['x'])).toBeNull();
        expect(projeterEdt(['Direct Planning Tree_abc'], ['x'])).toBeNull();
        expect(projeterEdt(['4087;DROP'], ['x'])).toBeNull();
    });

    it('rend null quand la source ne designe personne', () => {
        expect(projeterEdt([], [])).toBeNull();
        expect(projeterEdt(undefined, undefined)).toBeNull();
        expect(projeterEdt([''], [''])).toBeNull();
    });

    it('tolere un libelle manquant sans perdre l identifiant', () => {
        // Le nom sert a l'affichage ; l'identifiant est ce qui compte. Perdre l'un ne doit pas
        // emporter l'autre.
        expect(projeterEdt(['Direct Planning Tree_4087'], undefined)).toEqual({
            ressource: '4087',
            libelle: '',
        });
    });
});

describe('projeterPropositions', () => {
    it('lit les deux sources independamment', () => {
        const bordeaux = projeterPropositions({ appartenances: APPARTENANCES });
        expect(bordeaux.ues).toHaveLength(3);
        expect(bordeaux.edt).toBeNull();

        const inp = projeterPropositions({
            edt_ressource: ['Direct Planning Tree_4087'],
            edt_libelle: ['Belharet Damien'],
        });
        expect(inp.ues).toEqual([]);
        expect(inp.edt?.ressource).toBe('4087');
    });

    it('ne propose rien quand un etablissement ne publie ni l un ni l autre', () => {
        // C'est ce qui permet d'ajouter une troisieme universite sans toucher a l'ecran.
        const vide = projeterPropositions({ numero_etudiant: '123' });
        expect(aQuelqueChoseAProposer(vide)).toBe(false);
    });

    it('reconnait qu il y a quelque chose a demander', () => {
        expect(aQuelqueChoseAProposer(projeterPropositions({ appartenances: APPARTENANCES }))).toBe(true);
        expect(aQuelqueChoseAProposer(projeterPropositions({ edt_ressource: '4087' }))).toBe(true);
    });
});
