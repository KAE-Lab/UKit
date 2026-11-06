/**
 * Les pages de detail des Reglages (7-J, troisieme passe), sans dessin.
 *
 * L'accueil des Reglages alignait interrupteurs, curseur et paragraphes d'aide sous chaque groupe : la
 * review du 2026-11-06 y voyait une manie d'interface generee. Il ne porte plus que des rangees qui
 * menent chacune a sa page, et c'est la page qui explique et qui bascule. Une page est servie par
 * l'ecran des Reglages lui-meme, qui en garde les gestes (permissions, confirmations).
 */

export type PageDeReglage = 'notifications' | 'apparence' | 'agenda' | 'confidentialite' | 'demarrage';

/** Le titre de la barre de chaque page, en cle de traduction. */
export const TITRE_DE_PAGE = {
    notifications: 'NOTIFICATIONS',
    apparence: 'APPEARANCE',
    agenda: 'AGENDA_SETTINGS',
    confidentialite: 'PRIVACY_SECTION',
    demarrage: 'APP_LAUNCHING',
} as const satisfies Record<PageDeReglage, string>;

/** Les delais de rappel proposes, en minutes : ceux qu'on choisit, plutot qu'un curseur de 5 en 5. */
export const DELAIS_PROPOSES = [5, 10, 15, 20, 30, 45, 60] as const;

/**
 * Les delais a cocher : les delais proposes, et le delai en cours s'il n'en est pas (un reglage fait
 * au curseur, 25 minutes par exemple, reste visible et coche au lieu de disparaitre).
 */
export function delaisAProposer(courant: number): number[] {
    const delais = new Set<number>(DELAIS_PROPOSES);
    if (Number.isFinite(courant) && courant > 0) delais.add(courant);
    return [...delais].sort((a, b) => a - b);
}
