/**
 * Les lectures d'une table : une page filtree, triee et paginee ; une ligne par sa cle ; tout, par
 * lots. Chaque lecture est une requete TanStack Query, invalidee par les ecritures (useEcriture).
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { lireLigne, lirePage, lireTout, type Page } from '../lib/base';
import { cleDeSpec, type SpecDeRequete } from '../lib/requete';
import { cleDeLigne, type Descripteur } from '../schema/descripteurs';
import type { Ligne } from '../supabase';
import { cles } from './client';

export function useListe(descripteur: Descripteur, spec: SpecDeRequete) {
    return useQuery<Page>({
        queryKey: cles.liste(descripteur.table, cleDeSpec(spec)),
        queryFn: () => lirePage(descripteur.table, spec),
        // La page precedente reste affichee, estompee, le temps que la suivante arrive : rien ne saute.
        placeholderData: keepPreviousData,
    });
}

export function useLigne(descripteur: Descripteur, cle: Ligne | null) {
    return useQuery<Ligne | null>({
        queryKey: cles.ligne(descripteur.table, cle === null ? '' : cleDeLigne(descripteur, cle)),
        queryFn: () => (cle === null ? Promise.resolve(null) : lireLigne(descripteur, cle)),
        enabled: cle !== null,
    });
}

/** Toute une table, en colonnes legeres, pour ce qui se compte : le parc, les compteurs des retours. */
export function useTout(table: string, colonnes: string, spec: Omit<SpecDeRequete, 'plage'>) {
    return useQuery<Ligne[]>({
        queryKey: cles.tout(table, `${colonnes}|${JSON.stringify(spec)}`),
        queryFn: () => lireTout(table, spec, colonnes),
    });
}

/** Une lecture sans filtre ni tri, pour `useTout`. */
export const SANS_FILTRE: Omit<SpecDeRequete, 'plage'> = { tri: [], filtres: [], recherche: null, campus: null };
