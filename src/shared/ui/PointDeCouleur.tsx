/**
 * Le point de couleur : un disque de huit points qui dit un etat ou une appartenance.
 *
 * Releve quatre fois sous la meme forme — la pastille de synchronisation des Reglages, le menu de
 * developpement, la fiche d'annonce — et remonte au jalon 6.1.x-D quand l'ecran des calendriers du
 * telephone en a eu besoin une cinquieme fois. C'est la seule forme ronde que l'application
 * s'autorise en dehors des compteurs et des jauges (docs/theme.md) : le rayon se calcule, il ne
 * s'ecrit pas.
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { tokens } from '../theme/Theme';

export const POINT_DE_COULEUR = 8;

export interface PointDeCouleurProps {
    couleur: string;
    /** Le diametre, huit points par defaut. */
    taille?: number;
    /** Marges et alignement : ce que le point ne decide pas. */
    style?: StyleProp<ViewStyle>;
}

export function PointDeCouleur({ couleur, taille = POINT_DE_COULEUR, style }: PointDeCouleurProps) {
    return <View style={[{ width: taille, height: taille, borderRadius: tokens.radius.pill, backgroundColor: couleur }, style]} />;
}
