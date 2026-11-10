/**
 * Une icone, dessinee au trait par Lucide depuis la deuxieme passe de 7-J.
 *
 * **Pourquoi Lucide.** L'application dessinait ses icones avec les deux familles de Material Design.
 * La review du 2026-11-05 les trouvait « moins premium » que celles des applications de reference, sans
 * savoir dire pourquoi. Trois raisons, relevees ecran par ecran : le glyphe de Material, pense pour
 * Android et ses formes pleines ; des pleins et des contours meles dans un meme ecran ; et une
 * epaisseur de trait qui suivait la taille, si bien qu'une icone de 14 et une de 24 n'avaient pas la
 * meme graisse. Lucide est une seule famille au trait, d'une seule main.
 *
 * **Le trait est le meme a toutes les tailles** (`nonScalingStroke`) : 1,75 point, comme la graisse
 * d'un texte ne change pas avec sa taille ; les petites icones de detail et les grandes
 * d'illustration descendent a 1,5, ou 1,75 epaississait les unes et alourdissait les autres.
 *
 * **Les noms restent ceux de Material**, verifies par le compilateur : l'union discriminee ci-dessous
 * garde chaque glyphe dans sa famille, et `tableDesIcones.ts` dit lequel de Lucide le dessine. Un nom
 * que la table ignore, un nom venu des donnees publiees, retombe sur sa famille Material plutot que de
 * ne rien afficher.
 */

import React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { ICONES_COMMUNITY, ICONES_MATERIAL } from './tableDesIcones';

export type IconSpec =
    | { readonly family?: 'community'; readonly name: keyof typeof MaterialCommunityIcons.glyphMap }
    | { readonly family: 'material'; readonly name: keyof typeof MaterialIcons.glyphMap };

export interface IconProps {
    icon: IconSpec;
    size: number;
    color: string;
    style?: StyleProp<TextStyle>;
}

/** L'epaisseur du trait pour une taille d'icone, en points d'ecran. */
export function traitPour(taille: number): number {
    return taille <= 14 || taille >= 40 ? 1.5 : 1.75;
}

const DECOR = { accessible: false, importantForAccessibility: 'no', accessibilityElementsHidden: true } as const;

export function Icon({ icon, size, color, style }: IconProps) {
    const entree = icon.family === 'material' ? ICONES_MATERIAL[icon.name] : ICONES_COMMUNITY[icon.name];
    if (entree !== undefined) {
        const Composant = entree.composant;
        return (
            <Composant
                size={size}
                color={color}
                strokeWidth={traitPour(size)}
                nonScalingStroke
                fill={entree.plein ? color : 'none'}
                style={style as StyleProp<ViewStyle>}
            />
        );
    }
    // Une police d'icones est un caractere de la zone privee : un lecteur d'ecran le lisait, et les
    // rangees des Reglages s'annoncaient « , Langue » (audit du lot 1, 2026-11-10). Une icone est un
    // decor ; ce qu'elle veut dire porte sur le bouton qui la contient.
    if (icon.family === 'material') {
        return <MaterialIcons name={icon.name} size={size} color={color} style={style} {...DECOR} />;
    }
    return <MaterialCommunityIcons name={icon.name} size={size} color={color} style={style} {...DECOR} />;
}
