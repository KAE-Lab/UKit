/**
 * Charger les restaurants, et retenir l'echec quand il y en a un.
 *
 * Le carrousel du tableau de bord et la liste complete lisent la meme source avec la meme machinerie
 * — chargement, echec, nouvel essai. L'ecrire une fois evite qu'elles divergent, comme
 * `useBdeAnnonces` l'a fait pour les annonces au jalon 6-B.
 *
 * Ce que le hook ne fait pas : mettre en cache. Un menu change tous les jours et une liste de
 * restaurants ne pese rien ; la decision est ecrite dans docs/donnees-et-persistance.md.
 *
 * Voir docs/features/campus-crous.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { CrousService, type CrousRestaurant } from '../services/CrousService';
import type { UkitFailure } from '../../../shared/aetherius';

export interface CrousRestaurantsState {
    readonly restaurants: CrousRestaurant[];
    /** Absent quand tout va bien. Sa presence est ce qui distingue une panne d'une liste vide. */
    readonly failure: UkitFailure | undefined;
    readonly loading: boolean;
    readonly retry: () => void;
}

/**
 * Une position `undefined` veut dire « pas encore prete » : le chargement attend, sans se declarer
 * termine. C'est deja la semantique des sections du tableau de bord.
 */
export function useCrousRestaurants(lat?: number, lon?: number): CrousRestaurantsState {
    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    // Un compteur plutot qu'un appel direct : la lecture reste dans l'effet, donc un nouvel essai
    // profite du meme demontage propre que le chargement initial.
    const [essai, setEssai] = useState<number>(0);
    const monte = useRef(true);

    useEffect(() => {
        monte.current = true;
        if (lat === undefined || lon === undefined) {
            return () => {
                monte.current = false;
            };
        }

        setLoading(true);
        CrousService.fetchRestaurantsBordeaux(lat, lon)
            .then((resultat) => {
                if (!monte.current) return;

                // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne
                // restreint pas l'union. Voir shared/aetherius/runBlueprint.ts.
                if (resultat.ok === false) {
                    setRestaurants([]);
                    setFailure(resultat.failure);
                } else {
                    setRestaurants(resultat.restaurants);
                    setFailure(undefined);
                }
                setLoading(false);
            })
            .catch(() => {
                // Le service ne leve pas ; ce filet existe pour que le chargement se termine quand
                // meme si un jour il le faisait.
                if (monte.current) setLoading(false);
            });

        return () => {
            monte.current = false;
        };
    }, [lat, lon, essai]);

    const retry = useCallback(() => setEssai((n) => n + 1), []);

    return { restaurants, failure, loading, retry };
}
