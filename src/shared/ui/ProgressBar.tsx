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

import React from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';

export interface ProgressBarProps {
    /**
     * Entre 0 et 100. Au-dela, la barre sature — une source peut annoncer 110 %.
     *
     * Une `Animated.Value` est acceptee pour une barre qui **progresse** : elle est alors interpolee
     * et rendue sans repasser par un rendu React, donc a la frequence de l'ecran plutot qu'a celle
     * des mises a jour d'etat. Une jauge qui affiche une mesure — l'affluence d'une bibliotheque —
     * garde un nombre : il n'y a rien a animer.
     */
    percent: number | Animated.Value;
    color: string;
    trackColor: string;
    height: number;
    /**
     * Comment la barre prend sa place. Elle ne le decide pas : dans une ligne elle porte un `flex: 1`
     * et des marges laterales, dans un bloc elle s'etire d'elle-meme.
     */
    style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ percent, color, trackColor, height, style }: ProgressBarProps) {
    const largeur = typeof percent === 'number'
        ? (`${Math.max(0, Math.min(100, percent))}%` as const)
        : percent.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
        });

    return (
        <View style={[{
            height,
            backgroundColor: trackColor,
            borderRadius: height / 2,
            overflow: 'hidden',
        }, style]}>
            <Animated.View style={{
                width: largeur,
                height: '100%',
                backgroundColor: color,
                borderRadius: height / 2,
            }} />
        </View>
    );
}
