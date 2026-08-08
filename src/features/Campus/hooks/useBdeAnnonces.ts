/**
 * Charger les annonces, et retenir l'echec quand il y en a un.
 *
 * Le carrousel du tableau de bord et la liste complete lisent la meme source avec la meme machinerie
 * — chargement, echec, nouvel essai. L'ecrire une fois evite qu'elles divergent, et c'est ce que
 * demande la regle « la logique vit dans un hook ou un service, pas dans un ecran »
 * (CONTRIBUTING.md).
 *
 * Ce que le hook ne fait pas : mettre en cache. Les annonces sont rechargees a chaque montage
 * d'ecran, comme avant la base (docs/donnees-et-persistance.md).
 *
 * Voir docs/features/campus-vie-etudiante.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import BdeService, { type BdeAnnonce } from '../services/BdeService';
import type { UkitFailure } from '../../../shared/aetherius';

export interface BdeAnnoncesState {
    readonly annonces: BdeAnnonce[];
    /** Absent quand tout va bien. Sa presence est ce qui distingue une panne d'une liste vide. */
    readonly failure: UkitFailure | undefined;
    readonly loading: boolean;
    readonly retry: () => void;
}

export function useBdeAnnonces(): BdeAnnoncesState {
    const [annonces, setAnnonces] = useState<BdeAnnonce[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    // Un compteur plutot qu'un appel direct : la lecture reste dans l'effet, donc un nouvel essai
    // profite du meme demontage propre que le chargement initial.
    const [essai, setEssai] = useState<number>(0);
    const monte = useRef(true);

    useEffect(() => {
        monte.current = true;
        setLoading(true);

        BdeService.fetchAnnonces()
            .then((resultat) => {
                if (!monte.current) return;

                // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne
                // restreint pas l'union. Voir shared/aetherius/runBlueprint.ts.
                if (resultat.ok === false) {
                    setAnnonces([]);
                    setFailure(resultat.failure);
                } else {
                    setAnnonces(resultat.annonces);
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
    }, [essai]);

    const retry = useCallback(() => setEssai((n) => n + 1), []);

    return { annonces, failure, loading, retry };
}
