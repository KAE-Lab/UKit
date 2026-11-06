/**
 * Une liste horizontale d'onglet qui glisse, signalee au glissement entre onglets (7-J, troisieme
 * passe). Le geste de page laisse la main aux listes : sur Android, la liste native fait annuler le
 * geste des qu'elle prend le toucher ; sur iOS, rien ne le garantit, et un glissement sur un carrousel
 * pourrait le faire defiler **et** changer d'onglet. Les listes signalent donc leur glissement, et la
 * page ne change pas d'onglet si une liste a glisse pendant le geste. Le delai de grace couvre l'ordre
 * des evenements au lever du doigt : la fin du glissement de la liste peut arriver avant celle du
 * geste de page.
 */

const GRACE_MS = 350;

let enCours = 0;
let derniereFin = Number.NEGATIVE_INFINITY;

export function listeCommenceAGlisser(): void {
    enCours += 1;
}

export function listeFinitDeGlisser(maintenant: number = Date.now()): void {
    enCours = Math.max(0, enCours - 1);
    derniereFin = maintenant;
}

/** Vrai pendant le glissement d'une liste, et un court instant apres. */
export function uneListeGlisse(maintenant: number = Date.now()): boolean {
    return enCours > 0 || maintenant - derniereFin < GRACE_MS;
}

/** Les deux evenements a poser sur une liste horizontale d'un onglet. */
export const SIGNAL_DE_GLISSEMENT = {
    onScrollBeginDrag: () => listeCommenceAGlisser(),
    onScrollEndDrag: () => listeFinitDeGlisser(),
} as const;
