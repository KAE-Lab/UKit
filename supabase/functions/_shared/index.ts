/**
 * Ce que les fonctions de la base partagent : les en-tetes CORS de la console, la reponse JSON, et qui
 * appelle — le compte de la session, et son role dans l'equipe (jalon 7-H).
 *
 * `_shared/` n'est pas une fonction : Supabase ne le deploie pas seul, il l'embarque dans chaque
 * fonction qui l'importe. Et le module s'appelle `index.ts` pour tomber sous les memes exclusions que
 * les points d'entree Deno (tsconfig.json, eslint.config.mjs) : ses imports `jsr:` ne se resolvent pas
 * sous Node. Ce qui se teste vit a cote de chaque fonction, sans import (`regles.ts`).
 */

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function reponse(statut: number, corps: Record<string, unknown>): Response {
    return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export type Role = 'admin' | 'redacteur' | 'lecteur';

export interface Appelant {
    readonly email: string;
    /** `null` : un compte connecte qui n'est pas dans l'equipe. */
    readonly role: Role | null;
    /**
     * Un client qui parle avec la session de l'appelant : ce qu'il ecrit passe par les politiques, et le
     * journal porte son nom. C'est par lui que les fonctions ecrivent les tables de la console.
     */
    readonly client: SupabaseClient;
}

const SANS_SESSION = { persistSession: false, autoRefreshToken: false };

function lireRole(valeur: unknown): Role | null {
    return valeur === 'admin' || valeur === 'redacteur' || valeur === 'lecteur' ? valeur : null;
}

/**
 * L'appelant, d'apres le jeton de sa session : verifie aupres du service d'authentification, puis son
 * role lu dans `editeurs` — sa propre ligne, que la politique laisse lire a chacun. `null` quand la
 * session n'est pas valide ; une base injoignable leve.
 */
export async function appelant(autorisation: string): Promise<Appelant | null> {
    const jeton = autorisation.replace(/^Bearer\s+/i, '').trim();
    if (jeton === '') return null;
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: `Bearer ${jeton}` } },
        auth: SANS_SESSION,
    });
    const { data, error } = await client.auth.getUser(jeton);
    const email = data.user?.email?.toLowerCase();
    if (error !== null || email === undefined) return null;
    const { data: ligne, error: erreurDeRole } = await client.from('editeurs').select('role').eq('email', email).maybeSingle();
    if (erreurDeRole !== null) throw new Error(erreurDeRole.message);
    return { email, role: lireRole(ligne?.role), client };
}

/** Un client avec la cle de service, fournie par la plateforme : elle ne sort jamais de la fonction. */
export function service(): SupabaseClient {
    return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: SANS_SESSION });
}
