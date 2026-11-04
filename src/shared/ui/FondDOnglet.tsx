/**
 * Le fond d'un onglet : deux teintes proches de la section qui glissent lentement en haut de
 * l'ecran, puis se fondent dans la page avant le contenu (jalon 7-I, variante K1 du labo).
 *
 * **Une petite touche, pas un decor.** Le fond se pose derriere le grand titre et le haut du
 * contenu, ne vole aucun toucher, et ne bouge que lentement : une periode du motif par minute
 * (`tokens.mouvement.fond`). Il ne glisse que quand l'onglet est affiche, et reste immobile sous
 * « reduire les animations ».
 *
 * Le motif est un `LinearGradient` horizontal, incline par une rotation : un degrade incline par
 * ses seuls points de depart et d'arrivee change d'angle avec les proportions de la vue, et ne se
 * repete plus d'une longueur connue. Ici la periode est mesuree le long de l'axe du motif, et le
 * glissement d'une periode retombe exactement sur son depart.
 *
 * A poser en premier enfant de la vue racine de l'onglet, sous l'en-tete et le contenu.
 */

import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import Reanimated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../theme/Theme';
import { GEOMETRIE_DU_FOND, motifDuFond, voileDuFond, type OngletAFond } from './fondDOnglet';

const { hauteur, periode, periodes, inclinaison } = GEOMETRIE_DU_FOND;
/** La hauteur du motif incline : assez pour couvrir le fond quel que soit l'angle. */
const EPAISSEUR_DU_MOTIF = 1200;

export interface FondDOngletProps {
    theme: AppThemeType;
    onglet: OngletAFond;
}

export function FondDOnglet({ theme, onglet }: FondDOngletProps) {
    const { width: largeur } = useWindowDimensions();
    const affiche = useIsFocused();
    const mouvementReduit = useReducedMotion();
    const glissement = useSharedValue(0);

    useEffect(() => {
        if (!affiche || mouvementReduit) return undefined;
        // Reprend ou il s'etait arrete : le motif ne saute pas au retour sur l'onglet.
        const reste = (periode + glissement.value) / periode;
        glissement.value = withTiming(-periode, { duration: tokens.mouvement.fond.cycle * reste, easing: Easing.linear }, (fini) => {
            if (!fini) return;
            glissement.value = 0;
            glissement.value = withRepeat(
                withTiming(-periode, { duration: tokens.mouvement.fond.cycle, easing: Easing.linear }),
                -1,
                false,
            );
        });
        return () => cancelAnimation(glissement);
    }, [affiche, mouvementReduit, glissement]);

    const incline = useAnimatedStyle(() => ({
        transform: [{ rotate: `${inclinaison}deg` }, { translateX: glissement.value }],
    }));

    const [teinteA, teinteB] = theme.fondDOnglet[onglet];
    const motif = motifDuFond(teinteA, teinteB, theme.background);
    const voile = voileDuFond(theme.background);
    const longueur = periode * periodes;

    return (
        <View pointerEvents="none" style={[styles.fond, { height: hauteur }]}>
            <Reanimated.View
                style={[
                    styles.motif,
                    {
                        width: longueur,
                        height: EPAISSEUR_DU_MOTIF,
                        // Centre sur l'ecran : la rotation tourne autour du centre de la vue.
                        left: largeur / 2 - longueur / 2,
                        top: hauteur / 2 - EPAISSEUR_DU_MOTIF / 2,
                    },
                    incline,
                ]}
            >
                <LinearGradient
                    colors={motif.colors}
                    locations={motif.locations}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Reanimated.View>
            <LinearGradient colors={voile.colors} locations={voile.locations} style={StyleSheet.absoluteFill} />
        </View>
    );
}

const styles = StyleSheet.create({
    fond: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    motif: {
        position: 'absolute',
    },
});
