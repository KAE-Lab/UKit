/**
 * Les annonces du tableau de bord, lues **une fois** et servies a toutes ses sections.
 *
 * Depuis 7-I, une annonce vit dans plusieurs carrousels : le sien, et ceux des lieux ou la console
 * l'a placee (cartes speciales). Chaque section qui les lirait de son cote ferait autant de requetes,
 * et verrait des listes differentes pendant un rafraichissement. La section des annonces et les trois
 * sections de lieux lisent donc ce contexte, et la lecture declare au tableau de bord qu'elle est en
 * vol, comme le faisait la section des annonces (rafraichissement.tsx).
 *
 * Il vit dans le tableau de bord et non dans `AppCore`, qui est a sa limite de lignes : c'est le seul
 * ecran qui melange les annonces a d'autres listes. La liste complete garde son hook.
 */

import React, { createContext, useContext, useMemo } from 'react';

import { useBdeAnnonces, type BdeAnnoncesState } from '../hooks/useBdeAnnonces';
import { useChargementDeSection, useRevisionDuTableauDeBord } from './rafraichissement';
import { cartesSpeciales, type EmplacementDeLieux } from './carrouselMixte';
import type { BdeAnnonce } from '../services/BdeService';

const AUCUNE: BdeAnnoncesState = {
    annonces: [],
    failure: undefined,
    loading: false,
    enCours: false,
    retry: () => undefined,
};

// Hors du tableau de bord, aucune annonce et rien en attente : une section ne se bloque pas dessus.
const AnnoncesContext = createContext<BdeAnnoncesState>(AUCUNE);

/** Pose sous le `RafraichissementProvider` : la lecture suit la revision du tirer. */
export function AnnoncesDuTableauProvider({ children }: { children: React.ReactNode }) {
    const revision = useRevisionDuTableauDeBord();
    const etat = useBdeAnnonces(revision);
    useChargementDeSection('annonces', etat.enCours);
    return <AnnoncesContext.Provider value={etat}>{children}</AnnoncesContext.Provider>;
}

/** Les annonces du tableau de bord et l'etat de leur lecture. */
export function useAnnoncesDuTableau(): BdeAnnoncesState {
    return useContext(AnnoncesContext);
}

/**
 * Si la premiere lecture des annonces est faite. Une section de lieux l'attend avant de rendre ses
 * cartes : une carte speciale arrivee apres coup s'inserait en tete et pousserait tout le carrousel
 * (docs/theme.md, « les donnees sont pretes avant le premier rendu »). Un echec ne bloque rien : la
 * section montre ses lieux, sans speciale.
 */
export function useAnnoncesLues(): boolean {
    return !useAnnoncesDuTableau().loading;
}

/** Les cartes speciales d'un carrousel de lieux, dans l'ordre ou le service a range les annonces. */
export function useCartesSpeciales(emplacement: EmplacementDeLieux): BdeAnnonce[] {
    const { annonces } = useAnnoncesDuTableau();
    return useMemo(() => cartesSpeciales(annonces, emplacement), [annonces, emplacement]);
}
