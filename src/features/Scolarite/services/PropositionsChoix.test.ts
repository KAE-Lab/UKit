/**
 * Le choix UE par UE : rien de coche d'office, seules les cochees partent, et la comparaison se fait
 * sur l'annee des favoris plutot que sur tout ce qui a ete affiche.
 */

import { describe, expect, it } from 'vitest';

import { aAppliquer, basculer, choixInitial, estVide, uesAComparer } from './PropositionsChoix';
import type { Proposition } from './PropositionsDecision';

const PROPOSITION: Proposition = { ues: ['4TIN606U', '4TIN610U', '4TBM501U'], edt: null };

describe('le choix', () => {
    it("ne coche rien d'office", () => {
        // Le defaut signale : « Appliquer » masquait tout le complement, vrai cours compris.
        expect(choixInitial().size).toBe(0);
        expect(aAppliquer(PROPOSITION, choixInitial()).ues).toEqual([]);
    });

    it("n'applique que les UE cochees, dans l'ordre de la proposition", () => {
        let choix = choixInitial();
        choix = basculer(choix, '4TBM501U');
        choix = basculer(choix, '4TIN606U');
        expect(aAppliquer(PROPOSITION, choix).ues).toEqual(['4TIN606U', '4TBM501U']);
    });

    it('decoche au second appui, sans muter le choix precedent', () => {
        const une = basculer(choixInitial(), '4TIN606U');
        const aucune = basculer(une, '4TIN606U');
        expect(une.has('4TIN606U')).toBe(true);
        expect(aucune.size).toBe(0);
    });

    it("ne masque pas une UE cochee qui n'est plus proposee", () => {
        const choix = basculer(basculer(choixInitial(), '4TIN606U'), '4TXX999U');
        expect(aAppliquer(PROPOSITION, choix).ues).toEqual(['4TIN606U']);
    });

    it("garde l'emploi du temps propose meme sans UE cochee", () => {
        const avecEdt: Proposition = { ues: ['4TIN606U'], edt: { ressource: '4087', libelle: 'Exemple' } };
        const applique = aAppliquer(avecEdt, choixInitial());
        expect(applique.edt).toEqual(avecEdt.edt);
        expect(estVide(applique)).toBe(false);
    });

    it('est vide sans UE cochee ni emploi du temps', () => {
        expect(estVide(aAppliquer(PROPOSITION, choixInitial()))).toBe(true);
    });
});

describe('les UE comparees au dossier', () => {
    const RENCONTREES = ['4TIN602U', '4TIN606U', '4TAMI01U'];

    it("prefere l'annee des favoris a ce qui a ete affiche", () => {
        // `4TAMI01U` vient du planning d'un autre groupe consulte en passant : il ne doit pas etre
        // propose, il n'est pas dans le planning de l'etudiant.
        expect(uesAComparer({ etat: 'lue', ues: ['4TIN602U', '4TIN606U'] }, RENCONTREES)).toEqual(['4TIN602U', '4TIN606U']);
    });

    it("attend tant que l'annee est en cours de lecture", () => {
        expect(uesAComparer({ etat: 'en-cours' }, RENCONTREES)).toBeNull();
    });

    it("retombe sur ce qui a ete affiche quand l'annee n'a pas pu etre lue", () => {
        expect(uesAComparer({ etat: 'echec' }, RENCONTREES)).toEqual(RENCONTREES);
        expect(uesAComparer({ etat: 'sans-objet' }, RENCONTREES)).toEqual(RENCONTREES);
    });
});
