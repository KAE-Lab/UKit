/**
 * Les reglages qui appartiennent a **un** etablissement, et leur lecture depuis le disque.
 *
 * Les groupes favoris et les filtres d'UE nomment des groupes et des unites d'enseignement d'une
 * universite donnee. Jusqu'ici la bascule les **effacait**, ce qui evitait bien de melanger deux facs
 * mais obligeait a tout reselectionner a chaque aller-retour. Ils sont desormais cloisonnes : a tout
 * instant seuls ceux de l'etablissement actif sont en jeu, et revenir en arriere les retrouve.
 *
 * Ce module ne contient que la **lecture**, et il est separe d'`AppCore` pour une raison : il porte
 * une migration, et une migration qui se trompe perd les favoris de quelqu'un sans rien dire. Ici
 * elle est jouable sous Node, donc verifiable (docs/qualite.md).
 *
 * Voir docs/features/settings.md.
 */

/** Les entrees exploitables d'une liste persistee : tout ce qui n'est pas une chaine est ignore. */
function chaines(valeur: unknown): string[] {
    return Array.isArray(valeur) ? valeur.filter((entree): entree is string => typeof entree === 'string') : [];
}

/**
 * Lit une valeur persistee qui a **deux formes**, et rend celle de l'etablissement demande.
 *
 * Avant le cloisonnement, ces reglages etaient une simple liste. Une installation existante en porte
 * donc une, et elle appartient a l'universite que cette installation utilisait — c'est-a-dire a
 * l'etablissement actif au moment de la lecture. Aucun ecran, aucune question : demander a quelqu'un
 * de confirmer quelque chose qu'il n'a jamais choisi serait inventer une decision. C'est la meme
 * regle que la migration `groupName` -> `favoriteGroups`, et que celle du code d'etablissement du
 * jalon 6-G.
 */
export function commeListeDeGroupes(valeur: unknown, etablissement: string): string[] {
    if (Array.isArray(valeur)) return chaines(valeur);
    if (valeur !== null && typeof valeur === 'object') {
        return chaines((valeur as Record<string, unknown>)[etablissement]);
    }
    return [];
}

/** La meme valeur, vue comme la table complete. Une ancienne liste devient l'entree de l'actif. */
export function commeTableParEtablissement(valeur: unknown, etablissement: string): Record<string, string[]> {
    if (Array.isArray(valeur)) return { [etablissement]: chaines(valeur) };
    if (valeur === null || typeof valeur !== 'object') return {};

    const table: Record<string, string[]> = {};
    for (const [code, entrees] of Object.entries(valeur as Record<string, unknown>)) {
        if (Array.isArray(entrees)) table[code] = chaines(entrees);
    }
    return table;
}

/** Ce qu'une lecture de reglages rend : les deux tables, et la vue de l'etablissement actif. */
export interface ReglagesRestaures {
    readonly favoris: string[];
    readonly filtres: string[];
    readonly favorisParEtablissement: Record<string, string[]>;
    readonly filtresParEtablissement: Record<string, string[]>;
}

/**
 * Restaure les deux reglages cloisonnes depuis le document persiste.
 *
 * Rassemble ici les trois formes qu'une installation peut porter — `groupName` d'avant les favoris
 * multiples, la liste d'avant le cloisonnement, et la table — pour qu'`AppCore` n'ait qu'un appel et
 * que les migrations se relisent au meme endroit. Elles disparaitront ensemble le jour ou on les
 * retirera.
 */
export function restaurerReglages(settings: Record<string, unknown>, etablissement: string): ReglagesRestaures {
    const favoris =
        settings.groupName && !settings.favoriteGroups
            ? [settings.groupName as string]
            : commeListeDeGroupes(settings.favoriteGroups, etablissement);

    // Le repli sur `favoris` ne sert qu'a **ranger un `groupName` migre** : sans lui, la vue le
    // porterait et la table non, et le premier `saveSettings` — qui ecrit la table — l'effacerait. Il
    // ne joue que s'il y a quelque chose a ranger, sinon une installation neuve se retrouverait avec
    // une entree vide pour un etablissement qu'elle n'a pas encore choisi.
    const memoire = settings.favoriteGroups ?? (favoris.length > 0 ? favoris : undefined);

    return {
        favoris,
        filtres: commeListeDeGroupes(settings.filters, etablissement),
        favorisParEtablissement: commeTableParEtablissement(memoire, etablissement),
        filtresParEtablissement: commeTableParEtablissement(settings.filters, etablissement),
    };
}
