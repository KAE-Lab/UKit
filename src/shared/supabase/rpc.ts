/**
 * L'appel d'une fonction SQL, type par `Args` de `types.ts`.
 *
 * Le client type par `Database` ne sait pas typer `rpc` : le schema du depot ne satisfait pas la
 * contrainte `GenericSchema` de supabase-js 2.109 — des `interface` de lignes sans signature d'index
 * —, et `from` y accepte deja n'importe quelle chaine (mesure le 2026-09-08, docs/backend.md,
 * limites). On garde le typage des arguments ici, et le client nu pour l'appel.
 *
 * Ne en `shared/push` avec le jeton (6.1.x-E), remonte ici quand la mesure (7-D) est devenue la
 * seconde ecriture de l'application : les deux passent par la meme porte, une fonction `security
 * definer` que `anon` peut appeler sans rien pouvoir lire ni ecrire d'autre.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

type Fonctions = Database['public']['Functions'];

export function appeler<F extends keyof Fonctions>(client: SupabaseClient, fonction: F, args: Fonctions[F]['Args']) {
    return client.rpc(fonction, args);
}
