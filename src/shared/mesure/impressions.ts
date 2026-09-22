/**
 * Les impressions d'annonces : une carte visible a moitie pendant une seconde, comptee une fois par
 * session (docs/mesure.md).
 *
 * `FlatList` porte deja la mesure de visibilite ; ce module lui donne un couple `viewabilityConfig` /
 * `onViewableItemsChanged` a identite stable — React Native refuse qu'ils changent en cours de route —
 * et garde, par liste montee et focalisee, l'ensemble des cartes visibles a l'instant. Ce registre
 * existe pour une raison mesuree : `onViewableItemsChanged` ne rappelle pas quand l'ensemble visible
 * n'a pas change, donc une nouvelle session — un retour au premier plan devant le meme carrousel — ne
 * compterait rien sans lui. Il se recompte a chaque session, par l'abonnement a l'index.
 *
 * Une liste qui n'est plus focalisee — un onglet quitte, une fiche poussee par-dessus — ne compte
 * rien ; quand elle le redevient, ce qu'elle montre compte a nouveau, et la session dedoublonne.
 *
 * Limite ecrite : la visibilite se juge dans la liste, pas dans la page. Le carrousel du tableau de
 * bord est une liste horizontale dans un `ScrollView` vertical — ses cartes comptent quand elles sont
 * dans sa fenetre, meme si la page est defilee plus bas. La section est la premiere de la page ;
 * l'ecart est borne.
 *
 * S'importe directement, jamais par l'index : il s'abonne a l'index, l'index ne le connait pas.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { ViewabilityConfig, ViewToken } from 'react-native';

import { compterImpressions, onNouvelleSession } from './index';

/** A moitie visible, une seconde durant. Constante de module : l'identite ne doit pas changer. */
export const VISIBILITE_IMPRESSION: ViewabilityConfig = { itemVisiblePercentThreshold: 50, minimumViewTime: 1000 };

interface CarteVisible {
    readonly id: string;
}

export interface PropsDeVisibilite<T extends CarteVisible> {
    readonly viewabilityConfig: ViewabilityConfig;
    readonly onViewableItemsChanged: (info: { viewableItems: ViewToken<T>[] }) => void;
}

/** Les listes montees et focalisees, avec les identifiants qu'elles montrent a l'instant. */
const listes = new Map<symbol, readonly string[]>();

/** Recompte ce que les listes focalisees montrent : le geste d'une nouvelle session. */
export function recompterLesImpressionsVisibles(): void {
    for (const ids of listes.values()) compterImpressions(ids);
}

onNouvelleSession(recompterLesImpressionsVisibles);

/** Le couple a etaler sur une liste d'annonces ; stable pour la vie du composant. `T` est le type des cartes de la liste. */
export function useImpressionsDAnnonces<T extends CarteVisible>(): PropsDeVisibilite<T> {
    const focalisee = useIsFocused();
    const cle = useRef(Symbol('liste')).current;
    const focaliseeRef = useRef(focalisee);
    focaliseeRef.current = focalisee;
    const visibles = useRef<readonly string[]>([]);

    useEffect(() => {
        if (!focalisee) return;
        listes.set(cle, visibles.current);
        // Revenir devant une liste deja montee : ce qu'elle montre compte a nouveau ; la session dedoublonne.
        compterImpressions(visibles.current);
        return () => {
            listes.delete(cle);
        };
    }, [focalisee, cle]);

    return useMemo((): PropsDeVisibilite<T> => ({
        viewabilityConfig: VISIBILITE_IMPRESSION,
        onViewableItemsChanged: ({ viewableItems }) => {
            visibles.current = viewableItems.filter((jeton) => jeton.isViewable).map((jeton) => jeton.item.id);
            if (!focaliseeRef.current) return;
            listes.set(cle, visibles.current);
            compterImpressions(visibles.current);
        },
    }), [cle]);
}
