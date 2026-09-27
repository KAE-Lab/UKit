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
 *
 * ## Le mouvement (jalon 7-I)
 *
 * - **L'entree** est un fondu de la duree de la couture (`tokens.mouvement`), et non plus le defaut
 *   de Reanimated : deux fondus de la meme couture n'avaient pas la meme duree
 *   (docs/inventaire-mouvement.md, 6.3). Une liste qui arrive d'un coup passe le `rang` de chaque
 *   carte, et les premieres s'echelonnent.
 * - **Le reflux** — une carte qui change de place parce qu'un favori l'a remontee — prend le ressort
 *   unique de l'application.
 * - **Une carte pressee se reduit, elle ne palit pas.** L'opacite d'appui de `TouchableOpacity`
 *   s'applique vue par vue sur Android, la ou iOS compose le groupe : deux couches empilees y
 *   deviennent translucides l'une sur l'autre, et c'est ce qui avait fait transparaitre le repli
 *   d'une image sous le doigt (VisuelAvecRepli). Une echelle ne traverse rien.
 *
 * L'entree et le reflux viennent du vocabulaire partage (mouvement.ts), et Reanimated y applique de
 * lui-meme le reglage « reduire les animations » du systeme : rien a ajouter ici.
 */

import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { tokens, AppThemeType } from '../theme/Theme';
import { entreeEnCascade, REFLUX } from './mouvement';

const { pression, ressort } = tokens.mouvement;

export interface CardProps {
    theme: AppThemeType;
    children: React.ReactNode;
    /** Largeur et marges : ce que la surface ne decide pas. */
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    /**
     * L'apparition et le reflux quand la liste se reordonne. Actifs par defaut : les six cartes
     * relevees les portaient. Une carte qui n'est pas dans une liste animee peut les couper — un
     * squelette, qui doit etre la tout de suite.
     */
    animated?: boolean;
    /**
     * Le rang de la carte dans une liste qui arrive d'un coup : son entree attend d'autant
     * (`entreeEnCascade`, mouvement.ts). Absent, la carte entre sans attendre.
     */
    rang?: number;
    /** Ce qu'annonce un lecteur d'ecran pour une carte qu'on touche. */
    accessibilityLabel?: string;
}

function SurfacePressable({ surface, style, onPress, accessibilityLabel, children }: {
    surface: ViewStyle;
    style?: StyleProp<ViewStyle>;
    onPress: () => void;
    accessibilityLabel?: string;
    children: React.ReactNode;
}) {
    const echelle = useSharedValue(1);
    const enfonce = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

    // Le style de placement va au `Pressable` : la zone qui repond au doigt est la carte, jamais la
    // gouttiere qui la separe de sa voisine.
    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => { echelle.value = withSpring(pression, ressort); }}
            onPressOut={() => { echelle.value = withSpring(1, ressort); }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={style}
        >
            <Reanimated.View style={[surface, enfonce]}>{children}</Reanimated.View>
        </Pressable>
    );
}

export function Card({ theme, children, style, onPress, animated = true, rang, accessibilityLabel }: CardProps) {
    const surface: ViewStyle = {
        backgroundColor: theme.cardBackground,
        borderRadius: tokens.radius.xl,
        ...tokens.shadow.md,
        overflow: 'hidden',
    };

    // Sans `onPress`, une carte reste une surface : lui donner une zone d'appui inerte annoncerait
    // une interaction qui n'existe pas, y compris aux lecteurs d'ecran.
    const corps = onPress !== undefined ? (
        <SurfacePressable surface={surface} style={style} onPress={onPress} accessibilityLabel={accessibilityLabel}>
            {children}
        </SurfacePressable>
    ) : (
        <Reanimated.View style={[surface, style]}>{children}</Reanimated.View>
    );

    if (!animated) return corps;

    return (
        <Reanimated.View entering={entreeEnCascade(rang)} layout={REFLUX}>
            {corps}
        </Reanimated.View>
    );
}
