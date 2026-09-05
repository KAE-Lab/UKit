/**
 * La politique du cache de la liste des groupes, pure et testee.
 *
 * Un seul cache depuis 6.1-C : l'ecran de recherche de groupes en tenait un second (`groups`, sans
 * expiration, avec sa date embarquee) a cote de celui du manager (`groupList`, sept jours, horodatage
 * a part). Deux formats, deux politiques, deux ecritures pour la meme reponse reseau — et une seule
 * invalidation au changement d'etablissement. Ce module fige ce que les deux faisaient de juste, pour
 * que la reconciliation ne change rien a l'ecran : une liste fraiche sans date, un cache avec la sienne.
 *
 * Voir docs/features/planning.md.
 */

/** Sept jours : la liste des groupes bouge a la rentree, pas dans la semaine. */
export const LIMITE_CACHE_GROUPES_MS = 7 * 24 * 60 * 60 * 1000;

export interface CacheGroupes {
    readonly liste: string[];
    /** Horloge reelle (`Date.now()`), jamais la simulee : un cache ne se perime pas au menu de developpement. */
    readonly horodatage: number | null;
}

/** Lecture defensive du magasin : une valeur illisible vaut un cache absent, jamais une exception. */
export function lireCache(brut: string | null, horodatageBrut: string | null): CacheGroupes {
    let liste: string[] = [];
    try {
        const valeur: unknown = brut === null ? null : JSON.parse(brut);
        if (Array.isArray(valeur)) liste = valeur.filter((e): e is string => typeof e === 'string');
    } catch {
        liste = [];
    }
    const horodatage = horodatageBrut === null ? Number.NaN : Number.parseInt(horodatageBrut, 10);
    return { liste, horodatage: Number.isFinite(horodatage) ? horodatage : null };
}

/** Faut-il redemander la liste ? Absente, sans date, ou plus vieille que la limite. */
export function doitRafraichir(cache: CacheGroupes, maintenant: number, limiteMs = LIMITE_CACHE_GROUPES_MS): boolean {
    if (cache.liste.length === 0 || cache.horodatage === null) return true;
    return maintenant - cache.horodatage >= limiteMs;
}

/**
 * Ce que l'ecran affiche apres une lecture : la liste fraiche sans date, ou le cache avec la sienne.
 *
 * `dateCache` non nul est ce qui fait apparaitre le bandeau « affichage hors ligne du … » ; un cache
 * vide ne rend rien, l'ecran garde alors son etat plutot que d'afficher une liste vide datee.
 */
export function formeAffichee(cache: CacheGroupes, fraiche: string[] | null): { liste: string[]; dateCache: number | null } | null {
    if (fraiche !== null) return { liste: fraiche, dateCache: null };
    if (cache.liste.length === 0) return null;
    return { liste: cache.liste, dateCache: cache.horodatage };
}
