/**
 * Le glissement entre onglets : un geste sur la **barre**, pas sur les pages.
 *
 * Trois versions pour en arriver la. Le jalon 6.1-E l'avait pose par un pager, qu'Android a defait :
 * `ViewPager2` intercepte le toucher avant les listes horizontales du Planning (6.1.x-B). La 6.2.x a
 * d'abord essaye un geste de react-native-gesture-handler sur chaque page, auquel chaque liste
 * horizontale opposait sa priorite : tenu sur iPhone, pas sur Android — mesure sur le Galaxy A8 le
 * 2026-09-13, la liste rendue active des le toucher coupait net le defilement des que le doigt la
 * quittait, et le tableau de bord Campus ne defilait plus qu'entre ses carrousels. La lecon est
 * simple : **des pages pleines de listes horizontales ne peuvent pas porter un geste horizontal.**
 *
 * Le geste vit donc sur la barre d'onglets, la seule surface du bas qui n'a rien a defiler
 * (proposition du proprietaire du produit) : glisser sur la barre passe a l'onglet voisin au
 * relacher, avec la transition `shift` des onglets — celle d'un appui. Un appui reste un appui : le
 * geste ne s'active qu'apres dix points de course horizontale.
 *
 * `directionDuGlissement` (pur, teste) decide du voisin. Voir docs/navigation.md.
 */

import { useMemo } from 'react';
import { I18nManager } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import type { NavigationHelpers, ParamListBase, TabNavigationState } from '@react-navigation/native';

import { directionDuGlissement } from './directionDuGlissement';

/** Au-dela de ces points horizontaux le geste s'active ; un appui n'y arrive jamais. */
const ACTIVATION_X = 10;

/** Le geste de la barre d'onglets, pour un `GestureDetector` autour d'elle. */
export function useGlissementDeBarre(
    state: TabNavigationState<ParamListBase>,
    navigation: NavigationHelpers<ParamListBase>,
) {
    return useMemo(() => Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-ACTIVATION_X, ACTIVATION_X])
        .runOnJS(true)
        .onEnd((e) => {
            const direction = directionDuGlissement(e.translationX, e.velocityX, state.index, state.routeNames.length, I18nManager.isRTL);
            if (direction !== 0) navigation.navigate(state.routeNames[state.index + direction]);
        }), [state.index, state.routeNames, navigation]);
}
