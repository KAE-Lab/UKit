/**
 * Le tirer-pour-rafraichir du tableau de bord, et ce que ses sections lui doivent.
 *
 * Les quatre sources tierces du tableau de bord ne se rejouent pas au retour au premier plan — quatre
 * appels reseau silencieux a chaque bascule d'application seraient un arbitrage produit, pas un
 * correctif (docs/defauts-fonctionnels.md). Elles se rejouent sur un geste : le tirer. Chaque section
 * garde son contenu jusqu'a la reponse, et declare ici qu'une lecture est en vol ; le geste se termine
 * quand plus aucune ne l'est. Decision du 2026-09-03 (6.1-C).
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface RafraichissementTableauDeBord {
    /** Bousculee par le geste : une section qui la recoit en dependance recharge. */
    readonly revision: number;
    readonly signalerChargement: (section: string, enCours: boolean) => void;
}

const RafraichissementContext = createContext<RafraichissementTableauDeBord>({
    revision: 0,
    signalerChargement: () => undefined,
});

/** Une section hors du tableau de bord (la liste complete) lit ce contexte par defaut : rien ne bouge. */
export const RafraichissementProvider = RafraichissementContext.Provider;

/** Cote section : la revision du geste, a passer en dependance a son hook de donnees. */
export function useRevisionDuTableauDeBord(): number {
    return useContext(RafraichissementContext).revision;
}

/** Cote section : declare au tableau de bord qu'une lecture est en vol, et la retire au demontage. */
export function useChargementDeSection(section: string, enCours: boolean): void {
    const { signalerChargement } = useContext(RafraichissementContext);
    useEffect(() => {
        signalerChargement(section, enCours);
        return () => signalerChargement(section, false);
    }, [section, enCours, signalerChargement]);
}

/** Si aucune section ne se declare (toutes masquees par le catalogue), le geste ne tourne pas pour rien. */
const PLAFOND_SANS_SECTION_MS = 1500;

/** Cote tableau de bord : l'etat du geste, la valeur du contexte, et de quoi lancer. */
export function useRafraichissementTableauDeBord(): {
    readonly contexte: RafraichissementTableauDeBord;
    readonly refreshing: boolean;
    readonly lancer: () => void;
} {
    const [revision, setRevision] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const enVol = useRef(new Set<string>());
    const [nbEnVol, setNbEnVol] = useState(0);
    // Le geste ne se termine qu'apres qu'une section a commence : entre la bascule de revision et le
    // premier effet de section, rien n'est encore en vol, et s'arreter la fermerait le spinner aussitot.
    const aCommence = useRef(false);

    const signalerChargement = useCallback((section: string, actif: boolean) => {
        if (actif) enVol.current.add(section);
        else enVol.current.delete(section);
        setNbEnVol(enVol.current.size);
    }, []);

    const lancer = useCallback(() => {
        aCommence.current = false;
        setRefreshing(true);
        setRevision((r) => r + 1);
    }, []);

    useEffect(() => {
        if (!refreshing) return;
        if (nbEnVol > 0) {
            aCommence.current = true;
            return;
        }
        if (aCommence.current) {
            setRefreshing(false);
            return;
        }
        const plafond = setTimeout(() => setRefreshing(false), PLAFOND_SANS_SECTION_MS);
        return () => clearTimeout(plafond);
    }, [refreshing, nbEnVol]);

    return { contexte: { revision, signalerChargement }, refreshing, lancer };
}
