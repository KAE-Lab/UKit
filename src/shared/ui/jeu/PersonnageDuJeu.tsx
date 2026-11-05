/**
 * Le personnage du jeu : le « i » de UKit, son point et son corps (7-J, deuxieme passe).
 *
 * La premiere passe faisait courir le point du « i » seul : « juste un petit point, trop simpliste »
 * (review du 2026-11-05). Il a gagne le corps de sa lettre, dans le degrade du logo, et deux yeux qui
 * regardent ou il va. Ce n'est le personnage d'aucun jeu existant : c'est la lettre de l'application.
 *
 * **Il vit de sa physique, sans animation a lui** : le corps s'etire quand il monte et s'ecrase quand
 * il retombe (sa vitesse verticale), se balance en courant (la distance), et le point suit le corps
 * avec un temps de retard — c'est ce qui le rend vivant, et cela ne coute aucune minuterie. Il rougit
 * le temps d'une chute.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import type { AppThemeType } from '../../theme/Theme';
import { DEMI_LARGEUR, IMPULSION, X_DU_POINT, type EtatDuJeu } from './physique';

const TETE = DEMI_LARGEUR * 2;
const CORPS = { largeur: 10, hauteur: 20 } as const;
const ECART = 3;
const OEIL = 2.5;

export function PersonnageDuJeu({ etat, theme, chute, sol }: { etat: SharedValue<EtatDuJeu>; theme: AppThemeType; chute: boolean; sol: number }) {
    const ensemble = useAnimatedStyle(() => ({ transform: [{ translateY: -etat.value.y }] }));
    const corps = useAnimatedStyle(() => {
        const { y, vy, phase, distance } = etat.value;
        const enLAir = y > 0;
        const etirement = enLAir
            ? 1 + Math.max(-1, Math.min(1, vy / IMPULSION)) * 0.12
            : phase === 'course' ? 1 + 0.04 * Math.sin(distance / 5) : 1;
        return { transform: [{ translateY: (CORPS.hauteur * (1 - etirement)) / 2 }, { scaleY: etirement }] as const };
    });
    const tete = useAnimatedStyle(() => {
        const { y, vy } = etat.value;
        // Le point suit le corps avec un temps de retard : il traine quand le corps monte, flotte
        // quand il retombe.
        const retard = y > 0 ? Math.max(-3, Math.min(3.5, vy * 0.006)) : 0;
        return { transform: [{ translateY: retard }] };
    });
    const couleurs: [string, string] = chute ? [theme.danger, theme.danger] : [theme.logo.bleu, theme.logo.indigo];

    return (
        <Reanimated.View pointerEvents="none" style={[styles.ensemble, { bottom: sol }, ensemble]}>
            <Reanimated.View style={[styles.tete, { backgroundColor: couleurs[0] }, tete]}>
                <View style={[styles.oeil, styles.oeilGauche, { backgroundColor: theme.lightFont }]} />
                <View style={[styles.oeil, styles.oeilDroit, { backgroundColor: theme.lightFont }]} />
            </Reanimated.View>
            <Reanimated.View style={[styles.corps, corps]}>
                <LinearGradient colors={couleurs} style={StyleSheet.absoluteFill} />
            </Reanimated.View>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    ensemble: {
        position: 'absolute',
        left: X_DU_POINT - DEMI_LARGEUR,
        width: TETE,
        alignItems: 'center',
    },
    // Le point du « i » : rond, comme sur le logo.
    tete: {
        width: TETE,
        height: TETE,
        borderRadius: TETE / 2,
        marginBottom: ECART,
    },
    oeil: {
        position: 'absolute',
        top: TETE / 2 - OEIL,
        width: OEIL,
        height: OEIL,
        borderRadius: OEIL / 2,
    },
    oeilGauche: {
        left: TETE / 2 - 0.5,
    },
    oeilDroit: {
        left: TETE / 2 + OEIL + 0.5,
    },
    corps: {
        width: CORPS.largeur,
        height: CORPS.hauteur,
        borderRadius: CORPS.largeur / 2,
        overflow: 'hidden',
    },
});
