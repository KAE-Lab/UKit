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
 *   | `echec`    | la lecture a echoue et a quelque chose a dire | deux mots sur une tuile, l'erreur sur une rangee, la phrase dans la feuille |
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
import type { TranslationKey } from '../../../shared/i18n/Translator';
import { demandeUneRessaisie, estServiceIndisponible } from '../services/ScolariteMapping';
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
        // `chargement: enCours` et non `false` : pendant une relance, l'indicateur tourne dans le coin
        // de la tuile sans effacer ses deux mots — la meme regle que la valeur qu'on garde affichee.
        return { nature: 'echec', echec: parlant, nombre: null, detail: null, chargement: enCours };
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

/**
 * Ce qu'une **tuile** dit d'un echec, et ou son toucher mene.
 *
 * Une tuile ne change pas de taille, quoi qu'il arrive a sa source (docs/theme.md, decisions
 * durables) : elle n'a la place que de deux mots, et la phrase vit dans la feuille. Trois familles,
 * decidees ici pour que le rendu n'ait rien a interpreter :
 *
 *   - `ressaisie`    : un refus d'identifiants — la tuile mene directement a la fiche du compte,
 *                      sans feuille, parce qu'il n'y a rien a relancer ;
 *   - `indisponible` : un service momentanement absent — la feuille propose de relancer ;
 *   - `erreur`       : tout le reste, `config` compris — un code inconnu ne doit pas envoyer
 *                      d'office vers la ressaisie ; la feuille montre le message, et relance sauf
 *                      pour `engine`, « un probleme de notre cote » que rejouer ne repare pas.
 */
export type FamilleEchecTuile = 'ressaisie' | 'indisponible' | 'erreur';

export interface EchecDeTuile {
    readonly famille: FamilleEchecTuile;
    /** Les deux mots de la tuile. */
    readonly libelleKey: TranslationKey;
    /** Ou mene le toucher : la fiche du compte, ou la feuille qui porte la phrase. */
    readonly ouvre: 'ressaisie' | 'feuille';
    /** Relire ce seul widget a un sens. */
    readonly relancable: boolean;
}

export function echecDeTuile(echec: UkitFailure): EchecDeTuile {
    if (demandeUneRessaisie(echec)) {
        return { famille: 'ressaisie', libelleKey: 'WIDGET_FAILURE_REENTER', ouvre: 'ressaisie', relancable: false };
    }
    if (estServiceIndisponible(echec)) {
        return { famille: 'indisponible', libelleKey: 'WIDGET_FAILURE_UNAVAILABLE', ouvre: 'feuille', relancable: true };
    }
    return { famille: 'erreur', libelleKey: 'WIDGET_FAILURE_ERROR', ouvre: 'feuille', relancable: echec.kind !== 'engine' };
}
