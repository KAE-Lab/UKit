/**
 * Les pages de detail des Reglages (7-J, troisieme passe), sans dessin.
 *
 * L'accueil des Reglages alignait interrupteurs, curseur et paragraphes d'aide sous chaque groupe : la
 * review du 2026-11-06 y voyait une manie d'interface generee. Il ne porte plus que des rangees qui
 * menent chacune a sa page, et c'est la page qui explique et qui bascule. Une page est servie par
 * l'ecran des Reglages lui-meme, qui en garde les gestes (permissions, confirmations).
 */

export type PageDeReglage = 'notifications' | 'apparence' | 'agenda' | 'confidentialite';

/** Le titre de la barre de chaque page, en cle de traduction. */
export const TITRE_DE_PAGE = {
    notifications: 'NOTIFICATIONS',
    apparence: 'APPEARANCE',
    agenda: 'AGENDA_SETTINGS',
    confidentialite: 'PRIVACY_SECTION',
} as const satisfies Record<PageDeReglage, string>;

/**
 * Le delai des rappels se regle au pas, « − 15 min + », de 5 a 60 minutes (7-J, troisieme passe).
 * Une liste cochee de sept durees l'avait remplace au curseur ; la review du 2026-11-06 n'y voyait
 * que des boutons en trop.
 */
export const DELAI = { minimum: 5, maximum: 60, pas: 5 } as const;

/**
 * Le delai voisin, d'un pas : un delai hors pas (25 d'un ancien curseur, 23 d'une ancienne version)
 * se cale sur le pas le plus proche dans le sens demande, et le resultat reste dans les bornes.
 */
export function delaiVoisin(courant: number, sens: -1 | 1): number {
    const base = Number.isFinite(courant) ? courant : 15;
    const voisin = sens > 0
        ? Math.floor(base / DELAI.pas) * DELAI.pas + DELAI.pas
        : Math.ceil(base / DELAI.pas) * DELAI.pas - DELAI.pas;
    return Math.min(DELAI.maximum, Math.max(DELAI.minimum, voisin));
}
