/**
 * La session : l'evenement d'authentification de Supabase, et les droits lus par une requete
 * (TanStack Query), pour que la ligne d'`editeurs` ne se relise pas a chaque changement de session
 * quand l'e-mail n'a pas change.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { cles } from '../requetes/client';
import { supabase } from '../supabase';
import type { EtatDeSession } from './session';

type Compte = { readonly etat: 'chargement' } | { readonly etat: 'anonyme' } | { readonly etat: 'connecte'; readonly email: string };

async function estEditeur(email: string): Promise<boolean> {
    const { data, error } = await supabase.from('editeurs').select('email').eq('email', email).maybeSingle();
    if (error !== null) throw new Error(error.message);
    return data !== null;
}

export function useSession(): EtatDeSession {
    const [compte, setCompte] = useState<Compte>({ etat: 'chargement' });

    useEffect(() => {
        let vivant = true;
        const poser = (email: string | undefined) => {
            if (!vivant) return;
            setCompte(email === undefined ? { etat: 'anonyme' } : { etat: 'connecte', email });
        };
        void supabase.auth.getSession().then(({ data }) => poser(data.session?.user.email));
        const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => poser(session?.user.email));
        return () => {
            vivant = false;
            abonnement.subscription.unsubscribe();
        };
    }, []);

    const email = compte.etat === 'connecte' ? compte.email : '';
    const droits = useQuery({ queryKey: cles.droits(email), queryFn: () => estEditeur(email), enabled: email !== '', staleTime: 5 * 60_000 });

    if (compte.etat !== 'connecte') return compte;
    return { etat: 'connecte', session: { email: compte.email, editeur: droits.data ?? null } };
}

export async function seDeconnecter(): Promise<void> {
    await supabase.auth.signOut();
}
