/**
 * Le masquage de ce qu'un texte libre peut porter d'identifiant : une adresse, un numero.
 *
 * Le formulaire ne demande aucune identite, mais une reponse libre peut en contenir, et une
 * reponse rangee en base y reste. Le champ de contact, lui, n'est jamais masque : il est fait pour
 * ca, et il est facultatif (PRIVACY.md).
 *
 * Deux motifs, volontairement larges : mieux vaut un numero de version pris pour un telephone
 * qu'une adresse gardee. Les bornes `(?<!\d)` et `(?!\d)` empechent de mordre dans une suite de
 * chiffres plus longue — un identifiant de store comme `id1394708917` n'est pas un numero.
 */

const ADRESSE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const NUMERO = /(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\(?0\)?[\s.-]?)?[1-9](?:[\s.-]?\d{2}){4}(?!\d)/g;

export const ADRESSE_RETIREE = '[adresse retirée]';
export const NUMERO_RETIRE = '[numéro retiré]';

/**
 * @param {string} texte
 * @returns {string}
 */
export function masquer(texte) {
    return texte.replace(ADRESSE, ADRESSE_RETIREE).replace(NUMERO, NUMERO_RETIRE);
}
