/**
 * La session de la console, partagee par contexte : qui est connecte, ce que son role lui permet, et
 * s'il doit d'abord choisir son mot de passe.
 *
 * Les droits sont la ligne du compte dans `editeurs` — son role et, pour un redacteur, ses campus —, que
 * la politique laisse lire a son proprietaire. La console les lit pour le DIRE (droits.ts) : chaque page
 * affiche ce que le role permet, et desactive le reste. La base, elle, refuse de toute facon.
 */

import { createContext, useContext, useMemo } from 'react';

import type { CompteQuiAgit } from '../schema/descripteurs';
import type { DroitsDeSession } from './droits';

export interface Session {
    readonly email: string;
    /** `undefined` tant que la reponse n'est pas revenue ; `null` pour un compte qui n'est pas dans l'equipe. */
    readonly droits: DroitsDeSession;
    /**
     * Le compte a ete cree, ou son mot de passe remplace, par un admin (7-H) : un mot de passe
     * provisoire, transmis de vive voix, que la console fait remplacer avant toute autre page.
     */
    readonly provisoire: boolean;
}

export type EtatDeSession =
    | { readonly etat: 'chargement' }
    | { readonly etat: 'anonyme' }
    | { readonly etat: 'connecte'; readonly session: Session };

export const SessionContexte = createContext<Session | null>(null);

/** La session courante ; `null` pendant la verification. */
export function useSessionCourante(): Session | null {
    return useContext(SessionContexte);
}

/** Les droits du compte : `undefined` tant qu'on ne sait pas, `null` s'il n'en a aucun. */
export function useDroits(): DroitsDeSession {
    return useContext(SessionContexte)?.droits;
}

/** Le compte qui agit sur une ligne : de quoi dire ce qu'il peut, et ne pas lui proposer de se revoquer. */
export function useCompteQuiAgit(): CompteQuiAgit {
    const session = useContext(SessionContexte);
    return useMemo(() => ({ email: session?.email ?? '', droits: session?.droits }), [session]);
}
