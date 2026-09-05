/**
 * Charger les restaurants, et retenir l'echec quand il y en a un.
 *
 * Le carrousel du tableau de bord et la liste complete lisent la meme source avec la meme machinerie
 * — chargement, echec, nouvel essai. L'ecrire une fois evite qu'elles divergent, comme
 * `useBdeAnnonces` l'a fait pour les annonces au jalon 6-B.
 *
 * Ce que le hook ne fait pas : mettre en cache. Un menu change tous les jours et une liste de
 * restaurants ne pese rien ; la decision est ecrite dans docs/donnees-et-persistance.md. Le
 * tirer-pour-rafraichir du tableau de bord passe par `revision` (6.1-C) ; une relecture qui a deja
 * des restaurants a montrer ne repasse pas par l'attente.
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
    /** L'attente visible : rien a montrer encore. */
    readonly loading: boolean;
    /** Une lecture est en vol, visible ou non — ce que le tirer-pour-rafraichir attend. */
    readonly enCours: boolean;
    readonly retry: () => void;
}

/**
 * Une position `undefined` veut dire « pas encore prete » : le chargement attend, sans se declarer
 * termine. C'est deja la semantique des sections du tableau de bord.
 */
export function useCrousRestaurants(lat?: number, lon?: number, revision = 0): CrousRestaurantsState {
    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [enCours, setEnCours] = useState<boolean>(true);
    const aQuelqueChose = useRef(false);
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

        setLoading(!aQuelqueChose.current);
        setEnCours(true);
        CrousService.fetchRestaurantsBordeaux(lat, lon)
            .then((resultat) => {
                if (!monte.current) return;

                // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne
                // restreint pas l'union. Voir shared/aetherius/runBlueprint.ts.
                if (resultat.ok === false) {
                    setRestaurants([]);
                    aQuelqueChose.current = false;
                    setFailure(resultat.failure);
                } else {
                    setRestaurants(resultat.restaurants);
                    aQuelqueChose.current = resultat.restaurants.length > 0;
                    setFailure(undefined);
                }
                setLoading(false);
                setEnCours(false);
            })
            .catch(() => {
                // Le service ne leve pas ; ce filet existe pour que le chargement se termine quand
                // meme si un jour il le faisait.
                if (monte.current) {
                    setLoading(false);
                    setEnCours(false);
                }
            });

        return () => {
            monte.current = false;
        };
    }, [lat, lon, essai, revision]);

    const retry = useCallback(() => setEssai((n) => n + 1), []);

    return { restaurants, failure, loading, enCours, retry };
}
