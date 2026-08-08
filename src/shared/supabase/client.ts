/**
 * Le client de la base, en lecture publique.
 *
 * Un seul client pour toute l'application, construit **au premier usage** et non a l'import. Aucun
 * service ne construit le sien. La paresse n'est pas un detail : instancier au chargement du module
 * mettrait la base sur le chemin de demarrage de l'application, ce que ce jalon promet exactement de
 * ne pas faire. C'est la meme raison qui rend `getAetheriusClient` paresseux (shared/aetherius).
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

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import type { Database } from './types';

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

let client: SupabaseClient<Database> | null = null;

/**
 * Le client, ou `null` si l'application a ete construite sans cle.
 *
 * **Rendre `null` est un resultat, pas une panne.** Une application sans base doit demarrer et
 * s'utiliser entierement : chaque chose que la base publie a un socle embarque dans le binaire. Un
 * appelant traite ce cas comme un echec de lecture ordinaire (`baseNonConfiguree` dans failures.ts),
 * jamais en levant.
 *
 * Les trois options d'authentification disent la meme chose de trois facons : il n'y a pas de compte.
 * Rien a persister, rien a rafraichir, et aucune redirection a analyser — cette derniere n'a de sens
 * que sur le web, ou elle irait lire l'URL de la page. Le jour ou la partie sociale arrivera, les
 * changer sera une decision explicite plutot qu'un heritage.
 */
export function getSupabase(): SupabaseClient<Database> | null {
    if (client !== null) {
        return client;
    }

    const config = getSupabaseConfig();
    if (config === null) {
        return null;
    }

    try {
        client = createClient<Database>(config.url, config.anonKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        return client;
    } catch (error) {
        // `createClient` construit un client Realtime au passage, et celui-ci **leve** si l'hote ne
        // fournit pas de `WebSocket` — mesure sous Node 20, ou la construction echoue alors que rien
        // dans notre code n'utilise Realtime. React Native en fournit un, donc le cas ne se produit
        // pas sur appareil ; mais une construction qui peut lever se trouve sur le chemin de
        // demarrage, et un ecran blanc serait exactement le contraire de ce que ce jalon promet.
        // Retomber sur `null` degrade vers le socle embarque, ce que l'application sait deja faire.
        console.warn(`[supabase] client indisponible : ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}
