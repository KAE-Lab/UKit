/**
 * Ce qu'on demande a l'etudiant, et **quand** — la seule decision du parcours de propositions.
 *
 * `PropositionsDossier` lit ce que le portail a livre ; ce module decide ce qu'on en fait. Les deux
 * sont separes parce qu'ils se trompent differemment : une projection fausse lit mal une page, une
 * decision fausse pose une question au mauvais moment ou propose le contraire de ce qu'il faut.
 *
 * **Le piege du filtre, et la raison de tout ce fichier.** Un filtre d'UE **masque**
 * (`CourseManager.filterCourse` rend `false` quand la liste contient le code du cours). Pre-remplir
 * la liste avec les UE **inscrites** cacherait donc a l'etudiant exactement ses propres cours — le
 * contraire de l'intention, et un defaut qui ne se voit pas : le planning se vide, et rien ne dit
 * pourquoi. Ce qu'on propose est le **complement** : les UE que le planning du groupe porte et
 * auxquelles il n'est **pas** inscrit.
 *
 * **Pourquoi ne pas plutot inverser le filtre en liste positive** — la question a ete posee et
 * tranchee : il y a deux intentions distinctes, « cette UE n'est pas la mienne » (un fait du dossier)
 * et « cette UE est la mienne mais je ne veux pas la voir » (une decision personnelle), et une liste
 * unique ne peut pas porter les deux. Pre-remplir garde le geste manuel identique dans les deux
 * sens, ne migre aucune donnee persistee, et laisse la refonte des reglages libre de ses choix.
 *
 * **Rien ne s'applique tout seul** : ce module rend une proposition, un ecran la montre, l'etudiant
 * tranche. Deviner juste dans le dos de quelqu'un reste deviner dans son dos, et une proposition
 * fausse serait alors indetectable pour lui.
 *
 * Pur, sans dependance de plateforme : ce qui se decide ici ne se voit pas a l'ecran — un planning
 * vide, ou l'emploi du temps de quelqu'un d'autre — donc ca se verrouille par des tests
 * (PropositionsDecision.test.ts).
 *
 * Voir docs/features/scolarite.md et docs/features/planning.md.
 */

import type { EdtPropose, PropositionsDossier } from './PropositionsDossier';

/** Ce que l'application sait deja, et qui decide de ce qui reste a proposer. */
export interface EtatConnu {
    /**
     * Les codes d'UE **deja rencontres** dans les plannings charges (`PlanningDataManager`).
     *
     * C'est le plus souvent le planning des favoris, et c'est ce qui compte — un filtre ne s'applique
     * qu'a celui-la. Mais la liste s'accumule : parcourir le planning d'un autre groupe y ajoute ses
     * UE, et la proposition peut donc contenir des codes qui ne masqueront jamais rien. Un filtre
     * inerte est sans consequence, et la liste se retouche dans les reglages.
     */
    readonly uesDuPlanning: readonly string[];
    /** Les filtres deja poses, quelle qu'en soit l'origine. */
    readonly filtresActuels: readonly string[];
    /** Les groupes favoris de l'etablissement selectionne. */
    readonly favoris: readonly string[];
    /** L'identifiant de ressource deja enregistre au trousseau, ou `null`. */
    readonly ressourceEnregistree: string | null;
}

/** Ce qu'un ecran va montrer. Les deux champs sont independants, et peuvent etre vides. */
export interface Proposition {
    /** Les UE a masquer, dans l'orthographe **du planning** — c'est elle que le filtre compare. */
    readonly ues: readonly string[];
    readonly edt: EdtPropose | null;
}

/**
 * Ce qu'il faut faire des propositions, maintenant.
 *
 * Trois arbres et non deux : `attendre` n'est pas `rien`. Le parcours d'accueil demande le compte
 * **avant** le groupe (`intro > preferences > etablissement > compte > edt`), donc a la fin de la
 * lecture du dossier il n'existe encore aucun planning, donc aucune UE a comparer. Confondre les
 * deux ferait taire la proposition pour toujours au moment precis ou elle est la plus utile.
 */
export type Decision =
    | { readonly kind: 'rien' }
    | { readonly kind: 'attendre' }
    | { readonly kind: 'demander'; readonly proposition: Proposition };

function memeCode(gauche: string, droite: string): boolean {
    return gauche.toUpperCase() === droite.toUpperCase();
}

/**
 * Les UE du planning auxquelles l'etudiant n'est pas inscrit, et qui ne sont pas deja filtrees.
 *
 * La comparaison ignore la casse — l'annuaire publie `4tin602u`, Celcat `4TIN602U` — mais le code
 * **rendu** est celui du planning, verbatim. `filterCourse` compare a `course.UE`, qui vient de la
 * source telle quelle : proposer une forme normalisee poserait un filtre qui ne masquerait rien.
 */
function complement(etat: EtatConnu, inscrites: readonly string[]): string[] {
    return etat.uesDuPlanning.filter(
        (code) =>
            !inscrites.some((inscrite) => memeCode(inscrite, code)) &&
            !etat.filtresActuels.some((filtre) => memeCode(filtre, code)),
    );
}

/**
 * L'emploi du temps a proposer, ou `null`.
 *
 * Trois refus, et chacun a sa raison :
 *
 *   - **sans nom, rien a proposer.** Le nom est la cle du favori et le libelle affiche : un groupe
 *     anonyme serait enregistre et introuvable. La lecture, elle, garde l'identifiant meme sans nom
 *     (`projeterEdt`) — c'est ici, et pas dans la projection, que l'absence devient disqualifiante ;
 *   - **deja enregistre**, meme ressource : il n'y a rien a accepter deux fois ;
 *   - **deja favori** sous ce nom : l'etudiant l'a choisi lui-meme dans la liste, et lui reproposer
 *     ce qu'il a deja fait donnerait l'impression que l'application n'a pas suivi.
 */
function edtAProposer(propose: EdtPropose | null, etat: EtatConnu): EdtPropose | null {
    if (propose === null || propose.libelle === '') return null;
    if (propose.ressource === etat.ressourceEnregistree) return null;
    if (etat.favoris.includes(propose.libelle)) return null;
    return propose;
}

/**
 * Faut-il demander quelque chose, et quoi ?
 *
 * **On ne demande qu'une fois, avec tout ce qu'il y a a demander.** Quand le dossier a livre des UE
 * mais que le planning n'est pas encore charge, la reponse est `attendre` et non une premiere
 * question suivie d'une seconde : deux dialogues a la suite pour une meme lecture se lisent comme un
 * defaut. Le cas ou les deux etablissements portes se recouvrent n'existe pas aujourd'hui — Bordeaux
 * livre des UE, l'INP un emploi du temps — mais l'ecrire ainsi evite d'avoir a y penser le jour ou
 * il se presentera.
 */
export function decider(propositions: PropositionsDossier, etat: EtatConnu): Decision {
    const edt = edtAProposer(propositions.edt, etat);

    // Le planning n'est pas encore connu et le dossier a des UE a comparer : la question serait
    // incomplete. Elle attend le premier chargement de l'onglet Planning, pas davantage.
    if (propositions.ues.length > 0 && etat.uesDuPlanning.length === 0) return { kind: 'attendre' };

    const ues = propositions.ues.length > 0 ? complement(etat, propositions.ues) : [];
    if (ues.length === 0 && edt === null) return { kind: 'rien' };

    return { kind: 'demander', proposition: { ues, edt } };
}
