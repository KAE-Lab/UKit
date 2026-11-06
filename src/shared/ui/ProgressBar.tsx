/**
 * Une jauge horizontale.
 *
 * Relevee trois fois — la liste des bibliotheques, la carte du tableau de bord, la fiche — en
 * **deux hauteurs** : 6 px dans les listes, 8 px dans la fiche (inventaire visuel, divergence 3.4).
 * Les deux sont voulues : la fiche est plus grande. Ce qui etait recopie sans raison, c'est le
 * rayon — toujours la moitie de la hauteur, ecrit en dur a 3 et a 4.
 *
 * Il est donc **calcule** ici. Les trois appelants gardent leur hauteur et rendent au pixel pres, et
 * deux litteraux de rayon disparaissent sans qu'aucun arbitrage visuel n'ait ete pris.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { tokens } from '../theme/tokens';

export interface ProgressBarProps {
    percent: number | Animated.Value;
    color: string;
    trackColor: string;
    height: number;
    style?: StyleProp<ViewStyle>;
    /**
     * Le remplissage dans un degrade (les deux couleurs du logo, pour une progression neutre comme le
     * parcours froid) : il couvre toute la piste et le remplissage le revele, au lieu de s'etirer
     * avec lui. Une jauge d'etat (l'affluence) garde sa couleur, qui porte l'information.
     */
    degrade?: readonly [string, string];
}

/** La duree du remplissage d'une valeur chiffree : se voir sans se faire attendre. */
const REMPLISSAGE_MS = tokens.mouvement.couture * 3;

/**
 * Une valeur chiffree se remplit au lieu d'apparaitre (7-J, troisieme passe) : depuis zero a
 * l'arrivee, puis d'une valeur a l'autre. Une valeur deja animee (le parcours froid) passe telle
 * quelle. Sous « reduire les animations », la barre se pose d'emblee.
 */
export function ProgressBar({ percent, color, trackColor, height, style, degrade }: ProgressBarProps) {
    const mouvementReduit = useReducedMotion();
    const anime = useRef(new Animated.Value(0)).current;
    const [largeurPiste, setLargeurPiste] = useState(0);

    useEffect(() => {
        if (typeof percent !== 'number') return;
        const cible = Math.max(0, Math.min(100, percent));
        if (mouvementReduit) {
            anime.setValue(cible);
            return;
        }
        Animated.timing(anime, { toValue: cible, duration: REMPLISSAGE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [percent, anime, mouvementReduit]);

    const source = typeof percent === 'number' ? anime : percent;
    const largeur = source.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

    return (
        <View
            onLayout={degrade !== undefined ? (evenement) => setLargeurPiste(evenement.nativeEvent.layout.width) : undefined}
            style={[{ height, backgroundColor: trackColor, borderRadius: height / 2, overflow: 'hidden' }, style]}
        >
            <Animated.View style={{
                width: largeur,
                height: '100%',
                backgroundColor: degrade !== undefined ? undefined : color,
                borderRadius: height / 2,
                overflow: 'hidden',
            }}>
                {degrade !== undefined ? (
                    <LinearGradient
                        colors={degrade}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: largeurPiste }}
                    />
                ) : null}
            </Animated.View>
        </View>
    );
}
