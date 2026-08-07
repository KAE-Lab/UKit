/**
 * Le client de la base, en lecture publique.
 *
 * Un seul client pour toute l'application, instancie au niveau module. Aucun service ne construit le
 * sien.
 *
 * **La base se lit depuis un service, jamais depuis un composant** — la meme regle que le reseau
 * depuis toujours (docs/architecture.md). Elle vaut d'etre posee maintenant, tant qu'il n'y a qu'un
 * appelant.
 *
 * La cle `anon` est **publique par conception** : elle est lisible dans n'importe quel binaire. Ce
 * n'est pas un secret mal garde, c'est un identifiant — la frontiere de securite, ce sont les
 * politiques RLS (supabase/policies.sql). La cle `service_role`, elle, ne doit jamais approcher ce
 * fichier : elle vit dans les secrets de CI et sur le poste du publieur.
 *
 * Voir docs/backend.md et docs/phase-6/6-b-supabase.md.
 */

import Constants from 'expo-constants';

interface SupabaseConfig {
    readonly url: string;
    readonly anonKey: string;
}

/**
 * Les valeurs arrivent par l'environnement, comme `SENTRY_DSN` — app.config.ts charge deja
 * `dotenv/config`, et les secrets EAS les portent pour les builds.
 *
 * Une configuration absente n'est pas fatale : l'application doit demarrer et s'utiliser sur son
 * socle embarque, sans jamais joindre la base. C'est la promesse du jalon 6-B, et la seule sonde qui
 * la verifie est celle qui rend les cles fausses.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
    const url = typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '';
    const anonKey = typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '';
    return url && anonKey ? { url, anonKey } : null;
}

/**
 * TODO(6-B) : instancier le client.
 *
 * ```ts
 * import { createClient, type SupabaseClient } from '@supabase/supabase-js';
 *
 * let client: SupabaseClient<Database> | null = null;
 *
 * export function getSupabase(): SupabaseClient<Database> | null {
 *     if (client) return client;
 *     const config = getSupabaseConfig();
 *     if (!config) return null;             // pas de base configuree : on vit sur le socle
 *     client = createClient<Database>(config.url, config.anonKey, {
 *         auth: { persistSession: false }, // aucun compte aujourd'hui : rien a persister
 *     });
 *     return client;
 * }
 * ```
 *
 * `persistSession: false` est le bon defaut tant qu'il n'y a pas de compte : ecrire une session
 * vide dans le stockage serait du bruit, et le jour ou la partie sociale arrivera, ce sera une
 * decision explicite plutot qu'un heritage.
 */
export function getSupabase(): null {
    return null;
}
