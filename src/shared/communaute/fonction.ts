/**
 * L'appel de la fonction `communaute`, par le client unique de la base (shared/supabase) : la seule
 * porte par laquelle l'application ecrit un signalement ou un vote. Ne leve jamais : un transport mort
 * rend le statut 0, une base absente du binaire rend `null` — l'application vit sans elle.
 */

import { FunctionsHttpError } from '@supabase/supabase-js';

import { getSupabase } from '../supabase';

export interface ReponseDeLaFonction {
    readonly statut: number;
    readonly corps: unknown;
}

/** Une attestation App Attest passe par les serveurs d'Apple : le delai la couvre. */
const DELAI_MS = 20_000;

export async function appelerLaFonction(corps: Record<string, unknown>): Promise<ReponseDeLaFonction | null> {
    const supabase = getSupabase();
    if (supabase === null) return null;
    try {
        const { data, error } = await supabase.functions.invoke('communaute', { body: corps, timeout: DELAI_MS });
        if (error === null) return { statut: 200, corps: data };
        if (error instanceof FunctionsHttpError) {
            const reponse = error.context as Response;
            return { statut: reponse.status, corps: await reponse.json().catch(() => null) };
        }
        return { statut: 0, corps: { raison: 'reseau' } };
    } catch {
        return { statut: 0, corps: { raison: 'reseau' } };
    }
}

/** Un defi frais, ou `null` : sans defi, rien ne part. */
export async function demanderUnDefi(): Promise<string | null> {
    const r = await appelerLaFonction({ action: 'defi' });
    const defi = (r?.corps as { defi?: unknown } | null)?.defi;
    return r?.statut === 200 && typeof defi === 'string' ? defi : null;
}
