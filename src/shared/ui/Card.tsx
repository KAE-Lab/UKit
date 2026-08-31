/**
 * La surface d'une carte.
 *
 * Elle n'est pas dessinee ici : elle est **relevee**. La meme declaration — fond `cardBackground`,
 * rayon `radius.xl`, ombre `shadow.md`, `overflow: 'hidden'` — etait recopiee six fois au caractere
 * pres (inventaire visuel, divergence 3.1), avec la meme enveloppe `Reanimated` dans quatre d'entre
 * elles. C'est le motif le plus recopie du depot, et donc le premier a remonter.
 *
 * Ce qu'elle ne decide pas : la **largeur et les marges**. Une carte de liste occupe la largeur et
 * s'espace verticalement, une carte de carrousel a une largeur fixe et s'espace a droite. Les figer
 * ici aurait force l'un des deux a passer outre, et un composant qu'on contourne ne sert plus a rien.
 * Elles arrivent par `style`.
 *
 * Elle ne decide pas non plus du contenu : image, titre, favori et lignes d'information sont des
 * compositions de domaine — voir `CampusCard` pour celle de Campus.
 */

import React from 'react';
import { StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { tokens, AppThemeType } from '../theme/Theme';

export interface CardProps {
    theme: AppThemeType;
    children: React.ReactNode;
    /** Largeur et marges : ce que la surface ne decide pas. */
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    /**
     * L'apparition et le reflux quand la liste se reordonne. Actifs par defaut : les six cartes
     * relevees les portaient. Une carte qui n'est pas dans une liste animee peut les couper.
     */
    animated?: boolean;
}

export function Card({ theme, children, style, onPress, animated = true }: CardProps) {
    const surface: ViewStyle = {
        backgroundColor: theme.cardBackground,
        borderRadius: tokens.radius.xl,
        ...tokens.shadow.md,
        overflow: 'hidden',
    };

    // Sans `onPress`, une carte reste une surface : lui coller un `TouchableOpacity` inerte
    // annoncerait une interaction qui n'existe pas, y compris aux lecteurs d'ecran.
    const corps = onPress !== undefined ? (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[surface, style]}>
            {children}
        </TouchableOpacity>
    ) : (
        <Reanimated.View style={[surface, style]}>{children}</Reanimated.View>
    );

    if (!animated) return corps;

    return (
        <Reanimated.View entering={FadeIn} layout={LinearTransition.springify()}>
            {corps}
        </Reanimated.View>
    );
}
