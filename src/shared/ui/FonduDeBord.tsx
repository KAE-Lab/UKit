/**
 * Le fondu du bord haut d'une zone qui defile sous un en-tete fixe (7-J, deuxieme passe).
 *
 * **Le defaut qu'il corrige** (review du 2026-11-05) : depuis que les en-tetes se posent sur le fond
 * de la page, sans bloc qui les separe, le contenu qui passe dessous s'y coupait net, a une arete que
 * plus rien ne justifiait. Il s'y fond desormais, comme sous les barres d'iOS 26 (*scroll edge
 * effect*). Le flou progressif d'iOS demanderait un module natif : un fondu de la couleur unie de la
 * page en tient lieu, et il est exact, parce que l'en-tete se ferme deja sur cette couleur
 * (`fondDeHauteur`).
 *
 * `opacite` le fait paraitre au defilement, quand l'en-tete le lit ; sans elle, il est toujours la, et
 * la zone qui defile laisse au repos un rembourrage de sa hauteur (le Planning).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { tokens } from '../theme/Theme';
import { fonduDuBord } from './fondDOnglet';

/** La hauteur du fondu : assez pour qu'une ligne de texte s'y efface, pas assez pour manger une carte. */
export const HAUTEUR_DU_FONDU = tokens.space.lg;

export interface FonduDeBordProps {
    /** La couleur unie de la page, sur laquelle l'en-tete se ferme. */
    fond: string;
    /** Le haut du fondu, depuis le haut de son parent : le bas de l'en-tete. */
    haut?: number;
    /** De 0 a 1 ; absente, le fondu est toujours visible. */
    opacite?: SharedValue<number>;
}

export function FonduDeBord({ fond, haut = 0, opacite }: FonduDeBordProps) {
    const apparition = useAnimatedStyle(() => ({ opacity: opacite === undefined ? 1 : opacite.value }));
    const { colors, locations } = fonduDuBord(fond);
    return (
        <Reanimated.View pointerEvents="none" style={[styles.fondu, { top: haut }, apparition]}>
            <LinearGradient colors={colors} locations={locations} style={StyleSheet.absoluteFill} />
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    fondu: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: HAUTEUR_DU_FONDU,
    },
});
