/**
 * Une icone, quelle que soit sa famille.
 *
 * Le depot melange `MaterialIcons` et `MaterialCommunityIcons`, et les deux ne portent pas les memes
 * glyphes : la punaise de lieu est `location-on` chez l'un et n'existe pas chez l'autre, le
 * pieton est `directions-walk` ici et `walk` la. Un composant partage qui n'aurait connu qu'une
 * famille aurait donc oblige ses appelants a **changer de glyphe** pour l'utiliser — c'est-a-dire a
 * changer le rendu d'ecrans de reference pour un gain de facade.
 *
 * Le type est une union discriminee plutot qu'une chaine libre : le nom d'un glyphe reste verifie
 * par le compilateur dans les deux cas.
 */

import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

export type IconSpec =
    | { readonly family?: 'community'; readonly name: keyof typeof MaterialCommunityIcons.glyphMap }
    | { readonly family: 'material'; readonly name: keyof typeof MaterialIcons.glyphMap };

export interface IconProps {
    icon: IconSpec;
    size: number;
    color: string;
    style?: StyleProp<TextStyle>;
}

export function Icon({ icon, size, color, style }: IconProps) {
    if (icon.family === 'material') {
        return <MaterialIcons name={icon.name} size={size} color={color} style={style} />;
    }
    return <MaterialCommunityIcons name={icon.name} size={size} color={color} style={style} />;
}
