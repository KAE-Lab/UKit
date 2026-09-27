/**
 * Une ligne de texte masquee : sa hauteur, et une barre a sa place.
 *
 * **Le texte n'est pas rendu du tout**, et c'est la seule facon d'etre sur. Le poser en couleur
 * `transparent` sous une barre laissait voir ce qui depassait de la barre sur Android (mesure le
 * 2026-09-08) : un caractere qui existe finit toujours par se montrer quelque part. Ici il n'y a
 * qu'une espace, qui ne dessine rien mais donne au `Text` la hauteur exacte de sa police — la ligne
 * garde donc le gabarit de sa voisine sans porter un seul caractere.
 *
 * Ne dans le teaser des rangees de la Scolarite (6.1.x-B, `LigneScolarite`), remonte ici quand le
 * squelette des cartes (7-I) en a fait le second usage : c'est ce qui rend un squelette de la hauteur
 * exacte de sa carte, dans les deux tailles de texte et sur les deux plateformes, sans constante a
 * tenir a jour.
 */

import React from 'react';
import { StyleSheet, Text, View, type DimensionValue, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { tokens } from '../theme/Theme';

export interface TexteMasqueProps {
    /** Le style du texte remplace : c'est lui, et lui seul, qui donne la hauteur de la ligne. */
    style: StyleProp<TextStyle>;
    /**
     * La longueur de la barre dans la boite du texte. Deux lignes voisines n'ont pas la meme : une
     * paire de barres egales se lit comme un gabarit de chargement, pas comme deux lignes.
     */
    largeur: DimensionValue;
    couleur: string;
    /** La place du texte dans sa rangee : `flex: 1` a cote d'une icone, une largeur dans une pastille. */
    boite?: StyleProp<ViewStyle>;
}

export function TexteMasque({ style, largeur, couleur, boite }: TexteMasqueProps) {
    return (
        <View style={boite}>
            <Text style={style} numberOfLines={1}> </Text>
            <View style={[styles.barre, { width: largeur, backgroundColor: couleur }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    /*
     * La barre occupe la boite du texte, moins trois points en haut et en bas : a pleine hauteur elle
     * touche sa voisine et la paire se lit comme un aplat, pas comme deux lignes.
     */
    barre: {
        position: 'absolute',
        top: 3,
        bottom: 3,
        left: 0,
        borderRadius: tokens.radius.pill,
    },
});
