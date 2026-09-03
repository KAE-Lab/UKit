/**
 * Charger les bibliotheques et leurs affluences, et retenir ce qui a echoue.
 *
 * Meme role que `useCrousRestaurants`, avec deux particularites qui viennent de la source :
 *
 *   - **le chargement est en deux temps.** La liste s'affiche des que la decouverte a repondu, les
 *     pastilles d'affluence se remplissent ensuite. C'etait deja le comportement, et il tient a un
 *     fait simple : une requete d'affluence par bibliotheque trouvee ;
 *   - **la couverture peut etre partielle.** Le balayage joue plusieurs points (trois depuis 6.1-C :
 *     la position de l'etudiant et les deux du catalogue) ; un point muet ne doit pas emporter les
 *     autres, mais l'utilisateur doit le savoir. `secteursMuets` porte cette information jusqu'a
 *     l'ecran.
 *
 * L'echec d'une affluence, lui, reste discret : il est journalise par le service, et la bibliotheque
 * s'affiche sans pastille — ce que l'application faisait deja. Huit messages d'erreur pour huit
 * pastilles seraient pires que le defaut. Le tirer-pour-rafraichir du tableau de bord passe par
 * `revision` (6.1-C) ; une relecture qui a deja des bibliotheques a montrer ne repasse pas par
 * l'attente.
 *
 * Voir docs/features/campus-bibliotheques.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import LibraryService, { type AffluencesData, type LibraryInfo } from '../services/LibraryService';
import type { UkitFailure } from '../../../shared/aetherius';

export interface NearbyLibrariesState {
    readonly libraries: LibraryInfo[];
    readonly affluences: Record<string, AffluencesData>;
    readonly failure: UkitFailure | undefined;
    /** Le nombre de points de balayage muets. Zero quand la couverture est complete. */
    readonly secteursMuets: number;
    /** L'attente visible : rien a montrer encore. */
    readonly loading: boolean;
    /** Une lecture est en vol, visible ou non — ce que le tirer-pour-rafraichir attend. */
    readonly enCours: boolean;
    readonly retry: () => void;
}

export function useNearbyLibraries(lat?: number, lon?: number, revision = 0): NearbyLibrariesState {
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [affluences, setAffluences] = useState<Record<string, AffluencesData>>({});
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [secteursMuets, setSecteursMuets] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [enCours, setEnCours] = useState<boolean>(true);
    const [essai, setEssai] = useState<number>(0);
    const monte = useRef(true);
    const aQuelqueChose = useRef(false);

    useEffect(() => {
        monte.current = true;
        if (lat === undefined || lon === undefined) {
            return () => {
                monte.current = false;
            };
        }

        const charger = async () => {
            setLoading(!aQuelqueChose.current);
            setEnCours(true);
            const resultat = await LibraryService.fetchNearbyLibraries(lat, lon);
            if (!monte.current) return;

            if (resultat.ok === false) {
                setLibraries([]);
                aQuelqueChose.current = false;
                setAffluences({});
                setSecteursMuets(0);
                setFailure(resultat.failure);
                setLoading(false);
                setEnCours(false);
                return;
            }

            setLibraries(resultat.libraries);
            aQuelqueChose.current = resultat.libraries.length > 0;
            setSecteursMuets(resultat.secteursMuets);
            setFailure(undefined);
            setLoading(false);

            const releves = await Promise.all(
                resultat.libraries.map(async (bibliotheque) => ({
                    id: bibliotheque.id,
                    resultat: await LibraryService.getAffluencesData(bibliotheque.slug),
                })),
            );
            if (!monte.current) return;

            const trouvees: Record<string, AffluencesData> = {};
            for (const releve of releves) {
                if (releve.resultat.ok === true) trouvees[releve.id] = releve.resultat.affluence;
            }
            setAffluences(trouvees);
            setEnCours(false);
        };

        charger().catch(() => {
            // Le service ne leve pas ; ce filet existe pour que le chargement se termine quand meme
            // si un jour il le faisait.
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

    return { libraries, affluences, failure, secteursMuets, loading, enCours, retry };
}
