/**
 * Charger les annonces, et retenir l'echec quand il y en a un.
 *
 * Le carrousel du tableau de bord et la liste complete lisent la meme source avec la meme machinerie
 * — chargement, echec, nouvel essai. L'ecrire une fois evite qu'elles divergent, et c'est ce que
 * demande la regle « la logique vit dans un hook ou un service, pas dans un ecran »
 * (CONTRIBUTING.md).
 *
 * Ce que le hook ne fait pas : mettre en cache. Les annonces sont rechargees a chaque montage
 * d'ecran, comme avant la base (docs/donnees-et-persistance.md) — et, depuis 6.1-C, **au retour au
 * premier plan** et au tirer-pour-rafraichir du tableau de bord (`revision`) : le tableau de bord ne
 * se demonte jamais, et une annonce publiee ne l'atteignait qu'au lancement suivant. Une relecture
 * qui a deja quelque chose a montrer ne repasse pas par l'attente : le contenu reste, puis change.
 *
 * Voir docs/features/campus-vie-etudiante.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRetourAuPremierPlan } from '../../../shared/services/premierPlan';
import BdeService, { type BdeAnnonce } from '../services/BdeService';
import type { UkitFailure } from '../../../shared/aetherius';

export interface BdeAnnoncesState {
    readonly annonces: BdeAnnonce[];
    /** Absent quand tout va bien. Sa presence est ce qui distingue une panne d'une liste vide. */
    readonly failure: UkitFailure | undefined;
    /** L'attente visible : rien a montrer encore. */
    readonly loading: boolean;
    /** Une lecture est en vol, visible ou non — ce que le tirer-pour-rafraichir attend. */
    readonly enCours: boolean;
    readonly retry: () => void;
}

export function useBdeAnnonces(revision = 0): BdeAnnoncesState {
    const [annonces, setAnnonces] = useState<BdeAnnonce[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState<boolean>(true);
    const [enCours, setEnCours] = useState<boolean>(true);
    // Un compteur plutot qu'un appel direct : la lecture reste dans l'effet, donc un nouvel essai
    // profite du meme demontage propre que le chargement initial.
    const [essai, setEssai] = useState<number>(0);
    const monte = useRef(true);
    const aQuelqueChose = useRef(false);

    useEffect(() => {
        monte.current = true;
        // L'attente ne s'affiche que s'il n'y a rien a montrer : un nouvel essai apres un echec, ou le
        // premier chargement. Une relecture par-dessus des annonces les garde a l'ecran.
        setLoading(!aQuelqueChose.current);
        setEnCours(true);

        BdeService.fetchAnnonces()
            .then((resultat) => {
                if (!monte.current) return;

                // `=== false` et non `!resultat.ok` : sans `strictNullChecks`, la seconde forme ne
                // restreint pas l'union. Voir shared/aetherius/runBlueprint.ts.
                if (resultat.ok === false) {
                    setAnnonces([]);
                    aQuelqueChose.current = false;
                    setFailure(resultat.failure);
                } else {
                    setAnnonces(resultat.annonces);
                    aQuelqueChose.current = resultat.annonces.length > 0;
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
    }, [essai, revision]);

    const retry = useCallback(() => setEssai((n) => n + 1), []);
    useRetourAuPremierPlan(retry);

    return { annonces, failure, loading, enCours, retry };
}
