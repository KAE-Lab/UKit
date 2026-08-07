/**
 * L'acces a la base, porte d'entree unique.
 *
 * La base est un **point de publication**, pas un intermediaire : aucune requete vers une source
 * universitaire ne passe par elle, aucun identifiant ne la traverse, et l'application fonctionne
 * sans jamais la joindre. Voir docs/backend.md.
 */

export { getSupabase, getSupabaseConfig } from './client';
export type {
    AnnonceRow,
    AppReleaseRow,
    BatimentRow,
    BlueprintRow,
    EtablissementRow,
    ServiceMessageRow,
} from './types';
