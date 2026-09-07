/**
 * La derniere tentative de synchronisation du calendrier : ce qui s'est passe, quand, et pourquoi.
 *
 * Elle existe parce que le drapeau d'echec vivait en memoire et n'etait efface que par un succes.
 * Un utilisateur l'a signale le 2026-09-03 (« I tried to disable and enable the option but it
 * always says that the last sync is failed ») : son geste ne pouvait pas marcher, et rien ne le lui
 * disait. Persistee, la tentative survit a une relance — un echec de la tache de fond, application
 * fermee, se voit enfin — et elle porte sa **date**, pour que la ligne d'etat des reglages dise les
 * deux choses qui renseignent : ce qui a reussi, quand ; ce qui a echoue, depuis.
 *
 * Module pur : `SettingsManager` (AppCore) le persiste, `entretien.ts` decide avec lui. Ce qu'il ne
 * fait pas — lire l'heure — reste a l'appelant, comme partout (shared/services/Temps.ts).
 *
 * Voir docs/features/settings.md.
 */

/**
 * D'ou vient une tentative. Le menu de developpement l'affiche, la ligne d'etat non.
 * `activation` : l'interrupteur rallume, ou la cible change — l'agenda se remplit sans attendre.
 */
export type OrigineSynchro = 'manuel' | 'lancement' | 'premier-plan' | 'tache' | 'sonde' | 'favoris' | 'activation';

export interface TentativeSynchro {
    /** L'horloge **reelle** : c'est une trace, pas une decision (docs/qualite.md). */
    readonly at: number;
    readonly ok: boolean;
    readonly origine: OrigineSynchro;
}

/** Ce que la description des reglages promet : « environ toutes les 12 heures ». */
export const INTERVALLE_ENTRETIEN_MS = 12 * 60 * 60 * 1000;

const ORIGINES: readonly OrigineSynchro[] = ['manuel', 'lancement', 'premier-plan', 'tache', 'sonde', 'favoris', 'activation'];

/**
 * Relit une tentative persistee, defensivement : un stockage corrompu rend `null`, jamais une
 * exception — elle est lue sur le chemin de demarrage.
 */
export function lireTentative(brut: string | null): TentativeSynchro | null {
    if (brut === null || brut === '') return null;
    try {
        const valeur: unknown = JSON.parse(brut);
        if (typeof valeur !== 'object' || valeur === null) return null;
        const { at, ok, origine } = valeur as Record<string, unknown>;
        if (typeof at !== 'number' || !Number.isFinite(at) || typeof ok !== 'boolean') return null;
        if (typeof origine !== 'string' || !ORIGINES.includes(origine as OrigineSynchro)) return null;
        return { at, ok, origine: origine as OrigineSynchro };
    } catch {
        return null;
    }
}

/**
 * L'entretien est-il du ? Jamais joue, ou joue il y a plus d'un intervalle.
 *
 * Une horloge qui recule — une simulation, un changement de fuseau — compte comme « du » : mieux vaut
 * une synchronisation de trop qu'un agenda qui attend une date qui ne reviendra pas.
 */
export function estDu(dernierAt: number | null, maintenant: number, intervalle: number = INTERVALLE_ENTRETIEN_MS): boolean {
    if (dernierAt === null) return true;
    const ecoule = maintenant - dernierAt;
    return ecoule < 0 || ecoule >= intervalle;
}
