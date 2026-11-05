/**
 * Le fond d'un onglet : la teinte de la section, en haut de l'en-tete, qui se ferme a son bas sur la
 * couleur de la page (jalon 7-I, repris dans la deuxieme passe de 7-J).
 *
 * **Un degrade fixe**, en diagonale, de la teinte de la section a sa voisine puis a la page. Il
 * glissait lentement depuis 7-I, un motif incline de 3 000 points qui faisait le tour d'une periode
 * par minute. La deuxieme passe a confine la teinte a l'en-tete, un bandeau d'une centaine de points
 * ou ce glissement ne se percevait plus ; et cette couche tournee, posee au-dessus d'une liste qui
 * defile, faisait tomber le rendu logiciel de l'emulateur au premier defilement (isole sur le banc le
 * 2026-11-05) : un cout de composition que l'A8 payait aussi, pour un mouvement invisible.
 *
 * A poser en premier enfant de l'en-tete, sous le titre.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { type AppThemeType } from '../theme/Theme';
import { fondDeHauteur, GEOMETRIE_DU_FOND, voileDuFond, type OngletAFond } from './fondDOnglet';

export interface FondDOngletProps {
    theme: AppThemeType;
    onglet: OngletAFond;
    /** La hauteur de l'en-tete qui le porte ; le voile s'y recale et se ferme au bas du fond. */
    hauteur?: number;
}

export function FondDOnglet({ theme, onglet, hauteur }: FondDOngletProps) {
    const [teinteA, teinteB] = theme.fondDOnglet[onglet];
    const geometrie = hauteur !== undefined ? fondDeHauteur(hauteur) : GEOMETRIE_DU_FOND;
    const voile = voileDuFond(theme.background, geometrie);

    return (
        <View pointerEvents="none" style={[styles.fond, { height: geometrie.hauteur, backgroundColor: theme.background }]}>
            {/* La page reparait a droite : une teinte pleine sur toute la largeur se lisait comme un aplat. */}
            <LinearGradient
                colors={[teinteA, teinteB, theme.background]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.8 }}
                style={StyleSheet.absoluteFill}
            />
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
});
