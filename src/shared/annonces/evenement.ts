/**
 * L'evenement d'une annonce (phase 8, lot 5 ; docs/phase-8/5-evenements.md) : son debut, sa fin et son
 * lieu, lus des colonnes `evenement_debut`, `evenement_fin` et `evenement_lieu`.
 *
 * Partage avec la console, qui le compose et le valide avant la base : les bornes sont celles de
 * `annonces_evenement_check` (migration 20261125080000_evenements.sql). Pur : l'instant arrive en
 * parametre.
 *
 * Comme le partenaire, l'evenement survit a un changement de type dans la console, pour qu'on puisse le
 * retirer : il ne se lit que sur une annonce de type `evenement`.
 */

export interface EvenementDAnnonce {
    /** Le debut et la fin, en millisecondes. */
    readonly debut: number;
    readonly fin: number;
    readonly lieu: string;
}

export const BORNES_DE_L_EVENEMENT = { lieu: { min: 2, max: 120 }, dureeMaxMs: 24 * 60 * 60 * 1000 } as const;

function instant(valeur: unknown): number | null {
    if (typeof valeur !== 'string' || valeur === '') return null;
    const ms = Date.parse(valeur);
    return Number.isFinite(ms) ? ms : null;
}

/**
 * Pourquoi un evenement saisi n'est pas recevable, ou `null`. Les trois champs vides : pas d'evenement,
 * recevable. Les messages sont ceux de la console, qui seule les montre.
 */
export function refusDeLEvenement(debut: unknown, fin: unknown, lieu: unknown): string | null {
    const d = instant(debut);
    const f = instant(fin);
    const l = typeof lieu === 'string' ? lieu.trim() : '';
    // En caracteres, comme `char_length` : `length` compte les moities d'un emoji.
    const longueur = [...l].length;
    if (d === null && f === null && l === '') return null;
    if (d === null || f === null || l === '') return 'L’événement demande un début, une fin et un lieu, ou aucun des trois.';
    if (f <= d) return 'La fin de l’événement vient après son début.';
    if (f - d > BORNES_DE_L_EVENEMENT.dureeMaxMs) return 'Un événement tient en vingt-quatre heures au plus : une date et deux heures.';
    if (longueur < BORNES_DE_L_EVENEMENT.lieu.min || longueur > BORNES_DE_L_EVENEMENT.lieu.max) return 'Le lieu tient en 2 à 120 caractères.';
    return null;
}

/** L'evenement d'une ligne, ou `null` : une autre nature que l'evenement, ou une forme que la base refuserait. */
export function lireEvenement(type: unknown, debut: unknown, fin: unknown, lieu: unknown): EvenementDAnnonce | null {
    if (type !== 'evenement' || refusDeLEvenement(debut, fin, lieu) !== null) return null;
    const d = instant(debut);
    const f = instant(fin);
    if (d === null || f === null) return null;
    return { debut: d, fin: f, lieu: (lieu as string).trim() };
}

/** Un evenement fini ne s'ajoute plus : il n'y a plus rien a mettre dans un planning. */
export function estPasse(evenement: Pick<EvenementDAnnonce, 'fin'>, maintenant: number): boolean {
    return evenement.fin <= maintenant;
}
