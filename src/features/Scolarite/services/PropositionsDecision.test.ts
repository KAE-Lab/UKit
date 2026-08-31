/**
 * Ce que la decision doit tenir.
 *
 * Le premier test de ce fichier est le seul qui compte vraiment : **pre-remplir avec les UE
 * inscrites masquerait les cours de l'etudiant**, parce qu'un filtre masque. C'est une inversion de
 * sens, elle ne leve rien, et a l'ecran elle ressemble a un planning vide.
 *
 * Le second risque est le moment. Le parcours d'accueil demande le compte **avant** le groupe : a la
 * fin de la lecture du dossier, il n'existe aucun planning. Rendre « rien a proposer » a cet instant
 * ferait taire la question pour toujours, precisement quand elle est le plus utile.
 */

import { describe, expect, it } from 'vitest';

import { decider, type EtatConnu } from './PropositionsDecision';
import type { PropositionsDossier } from './PropositionsDossier';

/** Les trois UE inscrites d'un compte reel, mesurees le 2026-08-22 sur l'annuaire de Bordeaux. */
const INSCRITES = ['4TIN602U', '4TIN615U', '4TTVA35U'];
/** Ce que le planning du groupe porte : les siennes, et trois qui ne le sont pas. */
const PLANNING = ['4TIN602U', '4TIN615U', '4TTVA35U', '4TIN606U', '4TIN610U', '4TBM501U'];

const RIEN: EtatConnu = {
    uesDuPlanning: [],
    filtresActuels: [],
    favoris: [],
    ressourceEnregistree: null,
};

const AUCUNE_PROPOSITION: PropositionsDossier = { ues: [], edt: null };

function demande(decision: ReturnType<typeof decider>) {
    if (decision.kind !== 'demander') throw new Error(`attendu « demander », recu « ${decision.kind} »`);
    return decision.proposition;
}

describe('les UE proposees', () => {
    it('propose le complement, jamais les UE inscrites', () => {
        // LE test du module. Un filtre **masque** : proposer les UE inscrites cacherait a l'etudiant
        // ses propres cours, et le planning se viderait sans que rien ne l'explique.
        const decision = decider({ ues: INSCRITES, edt: null }, { ...RIEN, uesDuPlanning: PLANNING });

        expect(demande(decision).ues).toEqual(['4TIN606U', '4TIN610U', '4TBM501U']);
        for (const inscrite of INSCRITES) {
            expect(demande(decision).ues).not.toContain(inscrite);
        }
    });

    it('rend le code dans l orthographe du planning, pas dans celle de l annuaire', () => {
        // `filterCourse` compare a `course.UE`, qui vient de la source telle quelle. Une forme
        // normalisee poserait un filtre qui ne masquerait rien — un reglage inerte, invisible.
        const decision = decider(
            { ues: ['4TIN602U'], edt: null },
            { ...RIEN, uesDuPlanning: ['4tin602u', '4tin606u'] },
        );
        expect(demande(decision).ues).toEqual(['4tin606u']);
    });

    it('ne repropose pas ce qui est deja filtre', () => {
        const decision = decider(
            { ues: INSCRITES, edt: null },
            { ...RIEN, uesDuPlanning: PLANNING, filtresActuels: ['4TIN606U'] },
        );
        expect(demande(decision).ues).toEqual(['4TIN610U', '4TBM501U']);
    });

    it('ne demande rien quand l etudiant suit tout ce que son planning porte', () => {
        const decision = decider({ ues: INSCRITES, edt: null }, { ...RIEN, uesDuPlanning: INSCRITES });
        expect(decision.kind).toBe('rien');
    });

    it('attend le planning plutot que de conclure qu il n y a rien', () => {
        // Le moment. A la fin du parcours froid, le groupe n'est pas encore choisi : `rien` ici
        // ferait taire la proposition pour toujours.
        expect(decider({ ues: INSCRITES, edt: null }, RIEN).kind).toBe('attendre');
    });
});

describe('l emploi du temps propose', () => {
    const EDT = { ressource: '4087', libelle: 'Belharet Damien' };

    it('se propose sans attendre le moindre planning', () => {
        // C'est **lui** qui remplit l'etape des groupes : l'attendre serait circulaire.
        const decision = decider({ ues: [], edt: EDT }, RIEN);
        expect(demande(decision).edt).toEqual(EDT);
        expect(demande(decision).ues).toEqual([]);
    });

    it('ne se propose pas deux fois', () => {
        expect(decider({ ues: [], edt: EDT }, { ...RIEN, ressourceEnregistree: '4087' }).kind).toBe('rien');
        expect(decider({ ues: [], edt: EDT }, { ...RIEN, favoris: ['Belharet Damien'] }).kind).toBe('rien');
    });

    it('se propose de nouveau si la ressource enregistree n est pas la meme', () => {
        // Une reinscription, ou un compte different sur le meme appareil : l'identifiant change, et
        // le garder afficherait l'emploi du temps de l'annee d'avant.
        const decision = decider({ ues: [], edt: EDT }, { ...RIEN, ressourceEnregistree: '4156' });
        expect(demande(decision).edt?.ressource).toBe('4087');
    });

    it('refuse un emploi du temps sans nom', () => {
        // Le nom est la cle du favori : un groupe anonyme serait enregistre et introuvable. La
        // projection, elle, garde l'identifiant — c'est ici que l'absence devient disqualifiante.
        expect(decider({ ues: [], edt: { ressource: '4087', libelle: '' } }, RIEN).kind).toBe('rien');
    });
});

describe('les deux ensemble', () => {
    it('ne demande qu une fois, avec tout ce qu il y a a demander', () => {
        // Deux dialogues a la suite pour une meme lecture se lisent comme un defaut.
        const propositions = { ues: INSCRITES, edt: { ressource: '4087', libelle: 'Moi' } };

        expect(decider(propositions, RIEN).kind).toBe('attendre');

        const proposition = demande(decider(propositions, { ...RIEN, uesDuPlanning: PLANNING }));
        expect(proposition.ues).toHaveLength(3);
        expect(proposition.edt?.ressource).toBe('4087');
    });

    it('ne demande rien quand le dossier n a rien livre', () => {
        // Ce qui permet a un troisieme etablissement d'arriver sans toucher a l'ecran.
        expect(decider(AUCUNE_PROPOSITION, RIEN).kind).toBe('rien');
        expect(decider(AUCUNE_PROPOSITION, { ...RIEN, uesDuPlanning: PLANNING }).kind).toBe('rien');
    });
});
