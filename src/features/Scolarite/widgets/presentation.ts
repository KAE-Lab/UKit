/**
 * Ce qu'une rangee de widget montre, decide **hors du rendu**.
 *
 * Le motif vient de `MailboxRow`, ou il tenait en trois lignes pour un seul widget. Il en porte
 * quatre maintenant, et six etats — assez pour qu'un `? :` imbrique dans le JSX devienne le genre de
 * code qu'on n'ose plus toucher. Ici, chaque etat est nomme, et chacun se teste.
 *
 * **Les six etats, et ce qui les separe :**
 *
 *   | etat       | quand | ce que l'utilisateur voit |
 *   |------------|-------|---------------------------|
 *   | `echec`    | la lecture a echoue et a quelque chose a dire | l'erreur, la rangee s'efface |
 *   | `compte`   | une valeur exploitable | ce que la source annonce, et son compteur |
 *   | `attente`  | une source existe, rien n'est encore connu | un indicateur |
 *   | `inconnu`  | une source existe, la lecture n'a rien rendu d'exploitable | la rangee redevient une porte |
 *   | `bientot`  | pas de source, mais une porte | le service, et « bientot » |
 *   | `absent`   | ni source ni porte chez cet etablissement | une phrase, et de quoi le demander |
 *
 * `bientot` et `absent` ne disent pas la meme chose et il ne faut pas les confondre : le premier
 * annonce ce qui vient, le second constate ce qui n'existe pas ici. Les melanger promettrait a un
 * etudiant de l'INP des notes qu'on ne sait pas aller chercher chez lui.
 *
 * **Aucun de ces etats n'est une tuile morte** — la regle du depot. `bientot` ouvre son service,
 * `absent` ouvre le formulaire de demande quand le catalogue en publie un.
 */

import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { ValeurWidget } from './projection';

export type NatureRangee = 'echec' | 'compte' | 'attente' | 'inconnu' | 'bientot' | 'absent';

export interface EtatRangee {
    readonly nature: NatureRangee;
    /** L'echec a montrer. Present seulement en `echec`. */
    readonly echec: UkitFailure | null;
    /** Le compteur. Present seulement en `compte`. */
    readonly nombre: number | null;
    /** La ligne de contexte que la source a nommee, si elle en a nomme une. */
    readonly detail: string | null;
    /** Une lecture est en cours **par-dessus** ce qui est affiche : indicateur, sans vider la rangee. */
    readonly chargement: boolean;
}

export interface EntreesRangee {
    readonly valeur: ValeurWidget | undefined;
    readonly echec: UkitFailure | null;
    /** Une lecture est en cours pour ce point. */
    readonly enCours: boolean;
    /** L'etablissement declare un Blueprint pour ce widget. */
    readonly aUneSource: boolean;
    /** L'etablissement declare une adresse ouvrable pour ce service. */
    readonly aUnePorte: boolean;
}

/**
 * L'etat d'une rangee, a partir de ce qu'on sait d'elle.
 *
 * Un echec **silencieux** est un run annule : l'utilisateur est deja parti, il n'y a rien a lui dire,
 * et la rangee se comporte comme s'il n'y avait pas eu d'echec. La regle vient de `MailboxRow` et
 * elle vaut pour tous les widgets.
 */
export function etatDeLaRangee({
    valeur, echec, enCours, aUneSource, aUnePorte,
}: EntreesRangee): EtatRangee {
    const parlant = echec !== null && echec.silent !== true ? echec : null;
    const detail = valeur?.detail ?? null;

    if (parlant !== null) {
        return { nature: 'echec', echec: parlant, nombre: null, detail: null, chargement: false };
    }

    // Une valeur connue gagne sur l'attente, **meme pendant une relecture** : c'est ce qui fait qu'on
    // ne vide jamais la page pour la remplir a nouveau. L'indicateur se pose a cote, il ne remplace
    // rien.
    if (valeur !== undefined && valeur.nombre !== null) {
        return { nature: 'compte', echec: null, nombre: valeur.nombre, detail, chargement: enCours };
    }

    if (aUneSource) {
        if (enCours || valeur === undefined) {
            return { nature: 'attente', echec: null, nombre: null, detail: null, chargement: true };
        }
        // Lecture finie, rien d'exploitable : la rangee redevient ce qu'elle etait avant les widgets,
        // une porte. Mieux vaut une porte muette qu'un compteur invente.
        return { nature: 'inconnu', echec: null, nombre: null, detail, chargement: false };
    }

    return {
        nature: aUnePorte ? 'bientot' : 'absent',
        echec: null,
        nombre: null,
        detail: null,
        chargement: false,
    };
}
