/**
 * La fenetre de fraicheur du Planning : un run **automatique** sur une cle relue a l'instant ne part
 * pas.
 *
 * Revenir sur l'onglet Planning rejouait la journee affichee a chaque focus — quitter, revenir,
 * quitter, revenir dans la meme minute faisait quatre requetes a Celcat pour un contenu qui n'avait
 * pas bouge (jalon 7-C). Soixante secondes : assez pour le va-et-vient, trop court pour qu'un cours
 * deplace echappe a la relecture suivante. Un geste — « Reessayer », un autre jour — passe toujours.
 *
 * La derniere lecture n'est notee que sur une **reponse fraiche**, jamais sur un repli de cache : un
 * cache servi pendant une panne ne doit pas retarder la relecture qui la constaterait finie. Ce qui
 * s'affiche ne change pas ; la vraie politique *stale-while-revalidate*, visible, est un sujet de la
 * 6.3 (docs/phase-7/7-j-ecrans.md).
 *
 * Module pur : l'heure arrive en parametre, sur l'horloge reelle (docs/qualite.md).
 */

export const FENETRE_DE_FRAICHEUR_MS = 60_000;

export interface DerniereLecture {
    readonly cle: string;
    /** Horloge reelle (`Date.now()`) : la simulation temporelle ne doit pas figer ni liberer la fenetre. */
    readonly quand: number;
}

export function relectureInutile(
    derniere: DerniereLecture | null,
    cle: string,
    maintenant: number,
    fenetreMs: number = FENETRE_DE_FRAICHEUR_MS,
): boolean {
    if (derniere === null || derniere.cle !== cle) return false;
    const ecoule = maintenant - derniere.quand;
    // Une horloge qui recule compte comme perimee : mieux vaut une relecture de trop.
    return ecoule >= 0 && ecoule < fenetreMs;
}
