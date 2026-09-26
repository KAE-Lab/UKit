/**
 * Appeler une fonction de la base (supabase/functions/) avec la session du compte connecte : `notifier`
 * pour un message de service, `editeurs` pour l'equipe (7-H). Chacune repond en JSON, meme en refus, et
 * c'est sa raison qu'on montre plutot que le statut HTTP.
 */

import { supabase } from '../supabase';

export async function appelerUneFonction<T>(nom: string, corps: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke<T | { readonly erreur: string }>(nom, { body: corps });
    if (error !== null) {
        const contexte = (error as { context?: Response }).context;
        const reponse = contexte === undefined ? null : await contexte.json().catch(() => null) as { erreur?: string } | null;
        throw new Error(reponse?.erreur ?? error.message);
    }
    if (data === null) throw new Error('Réponse vide.');
    if (typeof data === 'object' && 'erreur' in data) throw new Error(data.erreur);
    return data as T;
}
