/**
 * La session : l'evenement d'authentification de Supabase, et les droits lus par une requete
 * (TanStack Query), pour que la ligne d'`editeurs` ne se relise pas a chaque changement de session
 * quand l'e-mail n'a pas change.
 */

import { useQuery } from '@tanstack/react-query';
import type { Session as SessionSupabase } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { cles } from '../requetes/client';
import { supabase } from '../supabase';
import { lireDroits, type Droits } from './droits';
import type { EtatDeSession } from './session';

type Compte =
    | { readonly etat: 'chargement' }
    | { readonly etat: 'anonyme' }
    | { readonly etat: 'connecte'; readonly email: string; readonly provisoire: boolean };

/** La ligne du compte dans `editeurs` : la politique ne lui laisse lire que la sienne, s'il n'est pas admin. */
async function lireLesDroits(email: string): Promise<Droits | null> {
    const { data, error } = await supabase.from('editeurs').select('role, etablissements').eq('email', email).maybeSingle();
    if (error !== null) throw new Error(error.message);
    return lireDroits(data);
}

function compteDe(session: SessionSupabase | null): Compte {
    const email = session?.user.email;
    if (email === undefined) return { etat: 'anonyme' };
    // Pose par la fonction `editeurs` quand un admin donne un mot de passe provisoire ; retire par la
    // personne quand elle choisit le sien (PremiereConnexion.tsx).
    return { etat: 'connecte', email, provisoire: session?.user.user_metadata?.mot_de_passe_provisoire === true };
}

export function useSession(): EtatDeSession {
    const [compte, setCompte] = useState<Compte>({ etat: 'chargement' });

    useEffect(() => {
        let vivant = true;
        const poser = (session: SessionSupabase | null) => {
            if (vivant) setCompte(compteDe(session));
        };
        void supabase.auth.getSession().then(({ data }) => poser(data.session));
        const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => poser(session));
        return () => {
            vivant = false;
            abonnement.subscription.unsubscribe();
        };
    }, []);

    const email = compte.etat === 'connecte' ? compte.email : '';
    const droits = useQuery({ queryKey: cles.droits(email), queryFn: () => lireLesDroits(email), enabled: email !== '', staleTime: 5 * 60_000 });

    if (compte.etat !== 'connecte') return compte;
    return { etat: 'connecte', session: { email: compte.email, droits: droits.data, provisoire: compte.provisoire } };
}

export async function seDeconnecter(): Promise<void> {
    await supabase.auth.signOut();
}
