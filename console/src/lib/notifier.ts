/**
 * Envoyer un message de service en notification push : la console appelle la fonction `notifier`
 * de la base (supabase/functions/notifier), avec la session d'un admin. La fonction cible, envoie,
 * elague et marque le message notifie ; ici on ne fait que demander et redire sa reponse.
 *
 * La fonction ecrit le message — elle pose `notifie_le`, ou le reserve puis le rend quand rien n'est
 * parti —, donc sa version change (7-H). Le geste rend la ligne relue, que le formulaire suit : sans
 * elle, son prochain enregistrement se dirait devance, par la notification elle-meme.
 */

import type { ResultatDAction } from '../schema/descripteurs';
import { supabase, type Ligne } from '../supabase';
import { appelerUneFonction } from './fonctions';

interface BilanDEnvoi {
    readonly vises: number;
    readonly envoyes: number;
    readonly retires: number;
    readonly erreurs: readonly string[];
    /** Rien n'est parti : la fonction a rendu sa reservation, le message peut etre renvoye. */
    readonly renvoyable?: boolean;
}

async function relire(id: string): Promise<Ligne | undefined> {
    const { data } = await supabase.from('service_messages').select('*').eq('id', id).maybeSingle();
    return (data ?? undefined) as Ligne | undefined;
}

export async function notifierMessage(id: string): Promise<ResultatDAction> {
    const bilan = await appelerUneFonction<BilanDEnvoi>('notifier', { id });
    const suite = bilan.erreurs.length > 0 ? ` Erreurs : ${bilan.erreurs.join(' ; ')}.` : '';
    const texte = `${bilan.vises} appareil(s) visé(s), ${bilan.envoyes} accepté(s) par Expo, ${bilan.retires} jeton(s) mort(s) retiré(s).${suite}`;
    const ligne = await relire(id);
    // Un envoi dont rien n'est parti ne consomme pas le message : la fonction a rendu sa reservation.
    if (bilan.renvoyable === true) return { ton: 'erreur', texte: `Rien n’est parti. ${texte} Le message reste notifiable : corrige, puis réessaie.`, ligne };
    return { texte, ligne };
}
