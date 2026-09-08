/**
 * Envoyer un message de service en notification push : la console appelle la fonction `notifier`
 * de la base (supabase/functions/notifier), avec la session de l'editeur. La fonction cible,
 * envoie, elague et marque le message notifie ; ici on ne fait que demander et redire sa reponse.
 */

import { supabase } from '../supabase';

interface BilanDEnvoi {
    readonly vises: number;
    readonly envoyes: number;
    readonly retires: number;
    readonly erreurs: readonly string[];
    /** Rien n'est parti : la fonction a rendu sa reservation, le message peut etre renvoye. */
    readonly renvoyable?: boolean;
}

export async function notifierMessage(id: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke<BilanDEnvoi | { erreur: string }>('notifier', { body: { id } });
    if (error !== null) {
        // La fonction repond en JSON, meme en refus : la raison vaut mieux que le statut.
        const contexte = (error as { context?: Response }).context;
        const corps = contexte === undefined ? null : await contexte.json().catch(() => null) as { erreur?: string } | null;
        throw new Error(corps?.erreur ?? error.message);
    }
    if (data === null || 'erreur' in data) throw new Error(data === null ? 'Réponse vide.' : data.erreur);
    const suite = data.erreurs.length > 0 ? ` Erreurs : ${data.erreurs.join(' ; ')}.` : '';
    const bilan = `${data.vises} appareil(s) visé(s), ${data.envoyes} accepté(s) par Expo, ${data.retires} jeton(s) mort(s) retiré(s).${suite}`;
    // Un envoi dont rien n'est parti ne consomme pas le message : la fonction a rendu sa reservation.
    if (data.renvoyable === true) throw new Error(`Rien n’est parti. ${bilan} Le message reste notifiable : corrige, puis réessaie.`);
    return bilan;
}
