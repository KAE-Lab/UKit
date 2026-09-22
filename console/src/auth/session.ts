/**
 * La session de la console, partagee par contexte : qui est connecte, et s'il a le droit d'ecrire.
 *
 * Le droit d'ecrire est une ligne dans `editeurs`, que la politique ne laisse lire qu'a son
 * proprietaire : la console la lit pour le DIRE — chaque page qui ecrit affiche « lecture seule » a
 * un compte sans droits et desactive ses boutons (defaut 3 du jalon 7-E). Un compte sans droits
 * verrait chaque ecriture refusee de toute facon (42501).
 */

import { createContext, useContext } from 'react';

export interface Session {
    readonly email: string;
    /** `null` tant que la reponse n'est pas revenue. */
    readonly editeur: boolean | null;
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

/** Les droits d'ecriture : `true`, `false`, ou `null` tant qu'on ne sait pas. */
export function useDroits(): boolean | null {
    return useContext(SessionContexte)?.editeur ?? null;
}
