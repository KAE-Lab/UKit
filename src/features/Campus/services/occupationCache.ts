/**
 * Le cache d'occupation des salles, par batiment et par jour : pur et teste.
 *
 * La fiche d'un batiment jouait une requete d'occupation **par salle a chaque ouverture** — dix-huit
 * pour l'A28 —, et le gaspillage mesure est le va-et-vient tableau de bord, fiche, retour, fiche,
 * dans la meme minute (jalon 7-C). Dix minutes, parce que l'occupation d'une salle est editoriale —
 * elle ne bouge pas dans l'heure — et que le plus petit creneau affiche dure quinze minutes.
 *
 * Chaque salle porte son `ok` : un lot ou une salle a echoue est mis en cache, mais cette salle-la
 * est rejouee a l'ouverture suivante, dans la fenetre — sans quoi elle passerait pour libre toute la
 * journee pendant dix minutes. Un lot ou **toutes** les salles echouent n'est pas mis en cache : un
 * cache vide masquerait une panne.
 *
 * La cle porte le jour affiche (l'horloge simulee, comme le reste de l'ecran) ; l'horodatage est
 * l'horloge reelle, comme tout horodatage de cache (groupListCache.ts). Sur le modele de ce dernier :
 * l'appelant lit et ecrit le magasin, ce module decide.
 */

import type { CampusEvent } from './CampusApiMapping';

export const TTL_OCCUPATION_MS = 10 * 60 * 1000;

/** Le prefixe de cle, versionne comme les surcouches publiees ; TimeMockService le purge. */
export const PREFIXE_OCCUPATION = 'occupation@1:';

export interface OccupationSalle {
    readonly roomId: string;
    /** Faux quand le run de cette salle a echoue : elle sera rejouee dans la fenetre. */
    readonly ok: boolean;
    readonly events: CampusEvent[];
}

export interface CacheOccupation {
    /** Horloge reelle (`Date.now()`), jamais la simulee. */
    readonly horodatage: number;
    readonly salles: readonly OccupationSalle[];
}

export function cleOccupation(batiment: string, jour: string): string {
    return `${PREFIXE_OCCUPATION}${batiment}:${jour}`;
}

function estUneSalle(valeur: unknown): valeur is OccupationSalle {
    if (typeof valeur !== 'object' || valeur === null) return false;
    const { roomId, ok, events } = valeur as Record<string, unknown>;
    return typeof roomId === 'string' && typeof ok === 'boolean' && Array.isArray(events);
}

/** Lecture defensive du magasin : une valeur illisible vaut un cache absent, jamais une exception. */
export function lireOccupation(brut: string | null): CacheOccupation | null {
    if (brut === null) return null;
    try {
        const valeur: unknown = JSON.parse(brut);
        if (typeof valeur !== 'object' || valeur === null) return null;
        const { horodatage, salles } = valeur as Record<string, unknown>;
        if (typeof horodatage !== 'number' || !Number.isFinite(horodatage) || !Array.isArray(salles)) return null;
        if (!salles.every(estUneSalle)) return null;
        return { horodatage, salles };
    } catch {
        return null;
    }
}

/** Frais : ecrit il y a moins de dix minutes. Une horloge qui recule compte comme perime. */
export function estFraiche(cache: CacheOccupation | null, maintenant: number, ttlMs: number = TTL_OCCUPATION_MS): boolean {
    if (cache === null) return false;
    const ecoule = maintenant - cache.horodatage;
    return ecoule >= 0 && ecoule < ttlMs;
}

/** Un lot merite le cache des qu'une salle a repondu. */
export function estCachable(salles: readonly OccupationSalle[]): boolean {
    return salles.some((salle) => salle.ok);
}

/** Les salles a rejouer malgre un cache frais : absentes, ou en echec. */
export function sallesARelire(cache: CacheOccupation, roomIds: readonly string[]): string[] {
    return roomIds.filter((roomId) => {
        const salle = cache.salles.find((candidate) => candidate.roomId === roomId);
        return salle === undefined || !salle.ok;
    });
}

/** Les salles rejouees remplacent les leurs ; l'horodatage du lot ne bouge pas : la fenetre finit a la meme heure. */
export function fusionner(cache: CacheOccupation, rejouees: readonly OccupationSalle[]): CacheOccupation {
    const remplacees = cache.salles.map((salle) => rejouees.find((rejouee) => rejouee.roomId === salle.roomId) ?? salle);
    const nouvelles = rejouees.filter((rejouee) => !cache.salles.some((salle) => salle.roomId === rejouee.roomId));
    return { horodatage: cache.horodatage, salles: [...remplacees, ...nouvelles] };
}
