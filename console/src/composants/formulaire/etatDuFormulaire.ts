/**
 * Ce que le formulaire dit de lui-meme : le titre de ce qu'on edite, l'etat de la saisie dans la
 * barre d'enregistrement, et ce que l'editeur est en train de toucher — dont l'apercu d'une annonce
 * se sert pour montrer ce qu'on edite.
 *
 * Pur : joue par `npm test` a la racine du depot (etatDuFormulaire.test.ts).
 */

import type { RetourDeGeste } from '../ui/Encart';

/** Le champ qui a le focus, et la ligne du curseur quand le champ en a une (la description). */
export interface Activite {
    readonly champ: string | null;
    readonly ligne: number | null;
}

export const AUCUNE_ACTIVITE: Activite = { champ: null, ligne: null };

function nonVide(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : null;
}

/**
 * Le titre d'un formulaire : le titre, le nom ou l'adresse que la saisie porte — un membre de l'equipe
 * n'a que son adresse (7-H) —, a mesure qu'on l'ecrit ; sinon « Nouvelle annonce » pour une ligne neuve,
 * « Modifier » pour une ligne qui n'a rien de tout cela.
 */
export function libelleDeLigne(valeurs: Readonly<Record<string, unknown>>, existante: unknown, nouvelle: string | undefined): string {
    const nomme = nonVide(valeurs.titre) ?? nonVide(valeurs.nom) ?? nonVide(valeurs.email);
    if (nomme !== null) return nomme;
    return existante === null ? (nouvelle ?? 'Nouvelle ligne') : 'Modifier';
}

/**
 * L'etat de la saisie, tel que la barre d'enregistrement le dit : le retour du dernier geste d'abord,
 * puis les champs a corriger, puis ce qui n'est pas enregistre. Rien quand tout est enregistre.
 */
export function statutDeLaSaisie(retour: RetourDeGeste | null, champsEnErreur: number, modifie: boolean): RetourDeGeste | null {
    if (retour !== null) return retour;
    if (champsEnErreur > 0) return { ton: 'erreur', texte: `${champsEnErreur} champ${champsEnErreur > 1 ? 's' : ''} à corriger avant d’enregistrer.` };
    if (modifie) return { ton: 'avert', texte: 'Modifications non enregistrées.' };
    return null;
}
