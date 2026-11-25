/**
 * Les cles des mots d'un sujet, calculees : `SIGNAL_RESTAURANT_FERME_OUI` dit une valeur,
 * `SIGNALER_RESTAURANT_HORAIRES` le geste qui la signale quand il ne se dit pas comme elle. Une cle
 * calculee est le seul transtypage legitime du depot (docs/i18n.md) ; cles.test.ts verifie que chacune
 * existe dans les trois dictionnaires, a la place du compilateur.
 */

import type { SujetDeLieu } from '../../../shared/communaute/vocabulaire';

function racine(sujet: SujetDeLieu): string {
    return sujet.sujet.replace(/\./g, '_').toUpperCase();
}

/** Le mot d'une valeur de liste ; les sujets a forme (horaires, plat) ont leurs propres phrases. */
export function cleDeValeur(sujet: SujetDeLieu, valeur: string): string {
    return `SIGNAL_${racine(sujet)}_${valeur.toUpperCase()}`;
}

/**
 * Le libelle du geste dans la feuille : celui de la valeur « oui » pour un fait du jour (« Self ferme »),
 * le sien pour ce qui demande une saisie ou porte une echelle.
 */
export function cleDOption(sujet: SujetDeLieu): string {
    const propre = sujet.valeurs === null || sujet.normale === null || sujet.famille === 'date';
    return propre ? `SIGNALER_${racine(sujet)}` : cleDeValeur(sujet, 'oui');
}

/** Toutes les cles qu'un sujet peut demander. */
export function clesDuSujet(sujet: SujetDeLieu): readonly string[] {
    const valeurs = sujet.valeurs === null ? [] : sujet.valeurs.map((v) => cleDeValeur(sujet, v));
    return [...new Set([...valeurs, cleDOption(sujet)])];
}
