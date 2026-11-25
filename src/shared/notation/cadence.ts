/**
 * Quand proposer la fiche de notation du systeme (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) :
 * apres un usage reussi, rarement, et jamais le jour d'une question d'avis — un vote, un « moi aussi », un
 * retour —, que la regle de Google interdit de faire suivre d'une demande de note.
 *
 * Pur : le jour de Paris arrive en parametre, la memoire aussi.
 */

export interface MemoireDeNotation {
    /** Les jours de Paris ou un usage a reussi, les plus recents, sans doublon. */
    readonly jours: readonly string[];
    /** Le jour de la derniere demande. */
    readonly demandee: string | null;
    /** Le jour de la derniere question d'avis. */
    readonly avis: string | null;
}

export const MEMOIRE_VIDE: MemoireDeNotation = { jours: [], demandee: null, avis: null };

/** Quatre jours d'usage reussi avant la premiere demande, cent vingt jours entre deux. */
export const JOURS_D_USAGE = 4;
export const JOURS_ENTRE_DEUX_DEMANDES = 120;
const JOURS_GARDES = 10;

function ecartEnJours(de: string, a: string): number {
    return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export function noterUsage(memoire: MemoireDeNotation, jour: string): MemoireDeNotation {
    if (memoire.jours.includes(jour)) return memoire;
    return { ...memoire, jours: [...memoire.jours, jour].slice(-JOURS_GARDES) };
}

export function noterAvis(memoire: MemoireDeNotation, jour: string): MemoireDeNotation {
    return { ...memoire, avis: jour };
}

/** Faut-il demander, apres un usage reussi ce jour-la ? */
export function peutDemander(memoire: MemoireDeNotation, jour: string): boolean {
    if (memoire.avis === jour) return false;
    if (memoire.demandee !== null && ecartEnJours(memoire.demandee, jour) < JOURS_ENTRE_DEUX_DEMANDES) return false;
    // Les jours d'usage comptent depuis la derniere demande : une note se redemande sur un usage nouveau.
    const depuis = memoire.demandee;
    return memoire.jours.filter((j) => depuis === null || j > depuis).length >= JOURS_D_USAGE;
}

/** Une memoire relue d'AsyncStorage : une valeur illisible vaut une memoire vide. */
export function lireMemoire(brut: unknown): MemoireDeNotation {
    if (typeof brut !== 'object' || brut === null) return MEMOIRE_VIDE;
    const m = brut as Record<string, unknown>;
    const jour = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const jours = Array.isArray(m.jours) ? m.jours.map(jour).filter((j): j is string => j !== null) : [];
    return { jours, demandee: jour(m.demandee), avis: jour(m.avis) };
}
