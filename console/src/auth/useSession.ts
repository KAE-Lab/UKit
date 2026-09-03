/**
 * La session de la console : qui est connecte, et s'il a le droit d'ecrire.
 *
 * Le droit d'ecrire est une ligne dans `editeurs`, que la politique ne laisse lire qu'a son
 * proprietaire : la console la lit pour le DIRE — un compte sans droits verra chaque ecriture refusee
 * de toute facon (42501), mais mieux vaut l'annoncer que le laisser decouvrir.
 */

import { useEffect, useState } from 'react';

import { supabase } from '../supabase';

export interface Session {
    readonly email: string;
    /** `null` tant que la reponse n'est pas revenue. */
    readonly editeur: boolean | null;
}

export type EtatDeSession =
    | { readonly etat: 'chargement' }
    | { readonly etat: 'anonyme' }
    | { readonly etat: 'connecte'; readonly session: Session };

async function estEditeur(email: string): Promise<boolean> {
    const { data } = await supabase.from('editeurs').select('email').eq('email', email).maybeSingle();
    return data !== null;
}

export function useSession(): EtatDeSession {
    const [etat, setEtat] = useState<EtatDeSession>({ etat: 'chargement' });

    useEffect(() => {
        let vivant = true;

        const poser = (email: string | undefined) => {
            if (!vivant) return;
            if (email === undefined) {
                setEtat({ etat: 'anonyme' });
                return;
            }
            setEtat({ etat: 'connecte', session: { email, editeur: null } });
            void estEditeur(email).then((editeur) => {
                if (vivant) setEtat({ etat: 'connecte', session: { email, editeur } });
            });
        };

        void supabase.auth.getSession().then(({ data }) => poser(data.session?.user.email));
        const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
            poser(session?.user.email);
        });

        return () => {
            vivant = false;
            abonnement.subscription.unsubscribe();
        };
    }, []);

    return etat;
}

export async function seDeconnecter(): Promise<void> {
    await supabase.auth.signOut();
}
