/**
 * Les reperes d'une liste : un champ qui ne prend pas de colonne et ne se montre, a cote du titre de
 * la ligne, que lorsque sa valeur s'ecarte du cas courant. Le cas courant est le vide — aucun campus
 * coche, aucune borne de version — ou la valeur par defaut du champ, celle d'une ligne neuve : une
 * annonce n'est pas epinglee, s'adresse a tout le monde, est un evenement.
 *
 * Pur : joue par `npm test` a la racine du depot (reperes.test.ts).
 */

import type { Champ } from '../../schema/descripteurs';
import { formaterDateDeListe } from '../../lib/dates';

function estVide(valeur: unknown): boolean {
    return valeur === null || valeur === undefined || valeur === '' || (Array.isArray(valeur) && valeur.length === 0);
}

/** La valeur est le cas courant du champ : rien a signaler. */
export function estCourant(champ: Champ, valeur: unknown): boolean {
    if (estVide(valeur)) return true;
    // Une valeur par defaut calculee (« maintenant ») n'est pas un cas courant.
    if (champ.defaut !== undefined && typeof champ.defaut !== 'function') return valeur === champ.defaut;
    return champ.type.type === 'booleen' && valeur === false;
}

/**
 * Le texte d'un repere, ou `null` quand la valeur est courante. Les listes de codes (campus,
 * plateformes) se rendent dans la cellule, qui sait marquer une valeur inconnue : ici, `''`.
 */
export function texteDeRepere(champ: Champ, valeur: unknown): string | null {
    if (estCourant(champ, valeur)) return null;
    const mot = champ.repere ?? champ.libelle;
    switch (champ.type.type) {
        case 'booleen':
            return valeur === true ? mot : (champ.repere ?? `${champ.libelle} : non`);
        case 'choix': {
            const option = champ.type.options.find((o) => o.valeur === String(valeur));
            return option === undefined ? String(valeur) : (option.court ?? option.libelle);
        }
        case 'date':
            return `${mot} ${formaterDateDeListe(valeur)}`;
        case 'etablissements':
        case 'cases':
            return '';
        default:
            return `${mot} ${String(valeur)}`;
    }
}
