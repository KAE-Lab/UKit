/**
 * Une ligne d'information secondaire : une icone, un texte, et de quoi poser quelque chose a droite.
 *
 * C'est la ligne qui compose le corps de toutes les cartes Campus — le campus d'une bibliotheque, la
 * description d'un restaurant, les horaires d'un batiment — relevee neuf fois avec les memes valeurs :
 * icone de 16, texte `fontSize.sm` en `fontSecondary`, texte qui prend la place restante.
 *
 * Trois details du releve sont **des props et non des constantes**, parce que les originaux
 * divergeaient et que ce jalon ne les unifie pas (inventaire visuel, divergence 3.5) :
 *
 * - `gap`, l'ecart icone → texte, vaut 4 dans trois cartes et 6 dans trois autres ;
 * - `align`, parce qu'une ligne de deux lignes de texte remonte son icone (`flex-start` + un decalage
 *   optique de 2 px) la ou une ligne simple la centre ;
 * - `textStyle`, pour la hauteur de ligne des lignes a deux lignes.
 *
 * Les figer aurait deplace des pixels dans des ecrans de reference. Les exposer laisse a une session
 * d'ecran le soin de trancher, sans rien casser aujourd'hui.
 */

import React from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';
import { Icon, type IconSpec } from './Icon';

export interface MetaRowProps {
    label: string;
    theme: AppThemeType;
    icon: IconSpec;
    /** Ce qui se pose a droite : une pastille de distance, un pourcentage. */
    trailing?: React.ReactNode;
    /** L'ecart icone → texte. Le releve porte 4 et 6 ; ni l'un ni l'autre n'est le defaut « juste ». */
    gap?: number;
    align?: 'center' | 'flex-start';
    /** Decalage optique de l'icone quand la ligne s'aligne en haut : le releve pose 2 px. */
    iconOffset?: number;
    numberOfLines?: number;
    marginBottom?: number;
    textStyle?: StyleProp<TextStyle>;
}

export function MetaRow({
    label,
    theme,
    icon,
    trailing,
    gap = tokens.space.xs,
    align = 'center',
    iconOffset = 0,
    numberOfLines,
    marginBottom = 0,
    textStyle,
}: MetaRowProps) {
    return (
        <View style={{ flexDirection: 'row', alignItems: align, marginBottom }}>
            <Icon
                icon={icon}
                size={16}
                color={theme.fontSecondary}
                style={iconOffset > 0 ? { marginTop: iconOffset } : undefined}
            />
            <Text
                numberOfLines={numberOfLines}
                style={[
                    { fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: gap, flex: 1 },
                    textStyle,
                ]}
            >
                {label}
            </Text>
            {trailing}
        </View>
    );
}
