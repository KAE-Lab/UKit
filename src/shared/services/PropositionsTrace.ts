/**
 * La trace de la derniere proposition calculee — ce que la sonde du menu flottant affiche.
 *
 * Elle existe pour une raison precise : **cette fonctionnalite peut ne rien faire sans que ce soit un
 * defaut.** Un dossier qui ne publie pas d'UE, un etudiant inscrit a tout ce que son planning porte,
 * un emploi du temps deja accepte — les quatre cas rendent le meme ecran : aucun dialogue. Sans
 * trace, « rien ne s'est passe » est indistinguable de « la lecture a echoue », et on en est reduit a
 * supposer. La campagne biometrique a deja coute une aller-retour pour cette exacte raison : une
 * sonde doit garder la trace de **chaque** etape, pas seulement du verdict final (docs/qualite.md).
 *
 * Elle vit dans `shared` et ne porte que des valeurs simples, pour que le panneau du menu la lise
 * sans qu'un composant partage ait a connaitre la Scolarite. C'est le meme montage que
 * `reportFailure` face a `ModMenuBlueprints`.
 *
 * En memoire seulement, et remise a zero avec l'application : c'est un instrument de diagnostic, pas
 * une donnee.
 */

/**
 * Ce que la **lecture du dossier** a rendu, avant toute decision.
 *
 * Elle est posee par la session, pas par la modale, et c'est deliberé : si les propositions
 * n'atteignent jamais l'ecran, une trace posee par l'ecran ne dit rien. Celle-ci separe les deux
 * questions — « le run a-t-il rendu quelque chose ? » et « qu'en a-t-on fait ? » — qui n'ont pas le
 * meme remede.
 */
export interface TraceLecture {
    readonly heure: string;
    /** Le Blueprint joue. */
    readonly blueprint: string;
    /** Les sorties rendues par le run, avec leur nature : `appartenances: liste(39)`. */
    readonly sorties: readonly string[];
    /** Ce que la projection en a tire. */
    readonly uesInscrites: readonly string[];
    readonly edtLu: string | null;
}

/** Ce que la derniere decision a vu, et ce qu'elle en a conclu. */
export interface TracePropositions {
    /** L'heure de la lecture, telle que l'appareil la porte. */
    readonly heure: string;
    /** Les codes d'UE que le dossier a rendus. Vide = l'annuaire n'a rien donne. */
    readonly uesInscrites: readonly string[];
    /** L'emploi du temps propose par la source, avant toute decision. */
    readonly edtLu: string | null;
    /** Le nombre d'UE rencontrees dans les plannings deja charges. */
    readonly uesDuPlanning: number;
    /** Les filtres deja poses. */
    readonly filtres: number;
    readonly decision: 'rien' | 'attendre' | 'demander';
    /** Ce que la modale afficherait : le complement, et l'emploi du temps retenu. */
    readonly complement: readonly string[];
    readonly edtRetenu: string | null;
}

let derniereLecture: TraceLecture | null = null;
let derniere: TracePropositions | null = null;

/** La nature d'une sortie de run, en un mot : c'est elle qui distingue une liste vide d'une absence. */
export function natureDeSortie(valeur: unknown): string {
    if (valeur === null || valeur === undefined) return 'absente';
    if (Array.isArray(valeur)) return `liste(${valeur.length})`;
    if (typeof valeur === 'string') return valeur === '' ? 'texte vide' : `texte(${valeur.length})`;
    return typeof valeur;
}

/** Enregistre ce que la lecture du dossier a rendu. Appelee a chaque parcours froid. */
export function tracerLectureDossier(trace: TraceLecture): void {
    derniereLecture = trace;
}

/** La derniere lecture, ou `null` si aucun parcours froid n'a eu lieu depuis le demarrage. */
export function derniereLectureDossier(): TraceLecture | null {
    return derniereLecture;
}

/** Enregistre ce que la decision vient de voir. Appelee a chaque calcul, y compris `rien`. */
export function tracerPropositions(trace: TracePropositions): void {
    derniere = trace;
}

/** La derniere trace, ou `null` si aucun dossier n'a ete lu depuis le demarrage. */
export function dernierePropositionsTrace(): TracePropositions | null {
    return derniere;
}
