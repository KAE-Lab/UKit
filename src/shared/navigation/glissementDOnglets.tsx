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
 *
 * **Quatrieme essai, sur les pages** (troisieme passe de 7-J, demande du proprietaire du produit) :
 * `GlissementDePage` remet un geste sur chaque page, mais **sans envelopper les listes**. Les deux
 * essais precedents donnaient la priorite aux listes horizontales en les inscrivant dans le systeme
 * de gestes, ce qui les rendait actives des le toucher et bloquait le defilement vertical. Ici les
 * listes restent natives : sur Android, une liste qui commence a defiler demande a ses parents de
 * lacher le toucher, et le gestionnaire de gestes annule alors le sien. Le geste de page ne s'active
 * qu'apres 25 points horizontaux, quand une liste prend la main des 8 ; il echoue des 10 points
 * verticaux, avant que la page ne defile. Il ne reste donc que les glissements francs, hors des
 * listes.
 */

import React, { useMemo } from 'react';
import { I18nManager, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { NavigationHelpers, ParamListBase, TabNavigationState } from '@react-navigation/native';

import { directionDuGlissement } from './directionDuGlissement';
import { uneListeGlisse } from './listesEnGlissement';

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

/** Le seuil horizontal d'une page : au-dela de la prise de main d'une liste native (8 points). */
const ACTIVATION_PAGE_X = 25;
/** Le seuil vertical : le geste echoue avant que la page ne defile. */
const ECHEC_PAGE_Y = 10;

interface NavigationDOnglet {
    getState: () => { index: number; routeNames: readonly string[] };
    navigate: (nom: string) => void;
}

/** Le glissement d'une page d'onglet, pose par `screenLayout` autour de chaque ecran d'onglet. */
export function GlissementDePage({ navigation, children }: { navigation: NavigationDOnglet; children: React.ReactElement }) {
    const geste = useMemo(() => Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-ACTIVATION_PAGE_X, ACTIVATION_PAGE_X])
        .failOffsetY([-ECHEC_PAGE_Y, ECHEC_PAGE_Y])
        .runOnJS(true)
        .onEnd((e) => {
            // Une liste horizontale a glisse pendant le geste : c'est elle qu'on faisait defiler.
            if (uneListeGlisse()) return;
            const etat = navigation.getState();
            const direction = directionDuGlissement(e.translationX, e.velocityX, etat.index, etat.routeNames.length, I18nManager.isRTL);
            if (direction !== 0) navigation.navigate(etat.routeNames[etat.index + direction]);
        }), [navigation]);
    return (
        <GestureDetector gesture={geste}>
            <View style={{ flex: 1 }} collapsable={false}>{children}</View>
        </GestureDetector>
    );
}
