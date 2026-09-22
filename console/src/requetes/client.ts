/**
 * Le client de requetes de la console (TanStack Query) : un cache, une politique de reprise, et les
 * cles que toutes les lectures partagent — c'est par elles qu'une ecriture invalide ce qu'elle change.
 */

import { QueryClient } from '@tanstack/react-query';

export const clientDeRequetes = new QueryClient({
    defaultOptions: {
        queries: {
            // Une lecture en echec se dit tout de suite avec « Reessayer » ; une reprise silencieuse
            // suffit pour un accroc reseau, deux feraient attendre devant un squelette.
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
        },
    },
});

// En developpement, le client se lit depuis la console du navigateur : l'etat de chaque requete,
// ses tentatives, son erreur. Rien en production.
if (import.meta.env.DEV) (window as unknown as { __requetes?: QueryClient }).__requetes = clientDeRequetes;

/** Les cles de cache. Une table entiere s'invalide par `table(nom)`. */
export const cles = {
    droits: (email: string) => ['droits', email] as const,
    etablissements: ['etablissements'] as const,
    table: (nom: string) => ['table', nom] as const,
    liste: (nom: string, spec: string) => ['table', nom, 'liste', spec] as const,
    ligne: (nom: string, cle: string) => ['table', nom, 'ligne', cle] as const,
    tout: (nom: string, empreinte: string) => ['table', nom, 'tout', empreinte] as const,
};
