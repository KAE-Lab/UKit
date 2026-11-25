/**
 * Les chiffres des statistiques, ecrits en francais : l'espace fine des milliers, la virgule, l'espace
 * avant le signe pour cent, et le vrai signe moins.
 *
 * Pur : joue par `npm test` a la racine du depot (formats.test.ts).
 */

import { libelleDeCase } from './cases';

const LOCALE = 'fr-FR';
const PART = new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const VARIATION = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
const COMPACT = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

/** Un compte : « moins de 5 » pour une petite case. */
export const formaterCompte = libelleDeCase;

const PLUS_PETITE_PART = 0.001;

/** « 60,6 % » ; « < 0,1 % » plutot qu'un zero qui ferait croire a rien ; un tiret quand la part ne se dit pas. */
export function formaterPart(part: number | null): string {
    if (part === null) return '—';
    if (part > 0 && part < PLUS_PETITE_PART) return `< ${PART.format(PLUS_PETITE_PART)}`;
    return PART.format(part);
}

/** « +12 % », « −8 % », « 0 % ». */
export function formaterVariation(variation: number): string {
    // Le francais d'ICU ecrit le trait d'union : le moins typographique se lit mieux devant un chiffre.
    return VARIATION.format(variation).replace('-', '\u2212');
}

const SEUIL_COMPACT = 10_000;

/**
 * Une graduation, dans un seul style par axe : en entier sous 10 000 (« 500 », « 1 500 »), compacte
 * des que l'axe l'atteint (« 10 k », « 30 k ») — `maximum` est la plus haute graduation de l'axe.
 */
export function formaterAxe(n: number, maximum: number): string {
    return maximum >= SEUIL_COMPACT ? COMPACT.format(n) : n.toLocaleString(LOCALE);
}
