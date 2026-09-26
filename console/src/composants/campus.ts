/**
 * Le campus choisi dans l'en-tete, partage par contexte et retenu sur le poste : il filtre toute
 * ressource qui declare un `campus` (annonces, messages, jetons push).
 */

import { createContext, useContext } from 'react';

export interface ChoixDeCampus {
    readonly code: string | null;
    readonly choisir: (code: string | null) => void;
}

export const CampusContexte = createContext<ChoixDeCampus>({ code: null, choisir: () => undefined });

export function useCampusChoisi(): string | null {
    return useContext(CampusContexte).code;
}
