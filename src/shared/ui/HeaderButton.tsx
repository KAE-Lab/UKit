/**
 * Le bouton carre d'une barre de navigation : le retour, un filtre, une carte, un favori.
 *
 * **Releve cinq fois, a cinq tailles.** Le bouton retour valait 50 x 50 avec une icone de 28, les
 * quatre autres 45 x 45 avec des icones de 24 ou de 26 selon l'endroit. L'ecart ne se voyait pas,
 * et pour une raison qui merite d'etre ecrite : `NavBarHelper` appliquait a tous les boutons
 * lateraux une mise a l'echelle animee dont la valeur au repos etait **1,14** — et 45 x 1,14 fait
 * 51, c'est-a-dire la taille du bouton retour.
 *
 * Cette animation ne decorait donc pas, elle **compensait une divergence**. La retirer (2026-08-29,
 * elle etait devenue statique sur le bouton de filtre du Campus) a rendu l'ecart visible d'un coup :
 * les boutons ont paru rapetisser alors qu'ils prenaient enfin leur taille declaree.
 *
 * Ce composant fixe la taille une fois. `50` et non `45` parce que c'est celle du bouton retour, qui
 * est sur tous les ecrans pousses et que personne n'a jamais trouve trop grand — et parce que c'est
 * la taille a laquelle l'application ressemblait a elle-meme avant qu'on retire la compensation.
 *
 * La surface est un **carre arrondi**, jamais un disque : la signature de forme de l'application, que
 * la regle ESLint ne voit pas (docs/theme.md).
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { tokens, type AppThemeType } from '../theme/Theme';

/** Le cote du carre, et la taille d'icone qui va avec. Deux nombres, un seul endroit. */
export const HEADER_BUTTON_SIZE = 50;
export const HEADER_BUTTON_ICON = 26;

export interface HeaderButtonProps {
    theme: AppThemeType;
    children: React.ReactNode;
    onPress?: () => void;
    /**
     * Le fond. Par defaut le gris neutre ; `theme.primary` pour un bouton **actif**, comme l'etoile
     * d'un groupe deja suivi.
     */
    fond?: string;
    style?: StyleProp<ViewStyle>;
}

export function HeaderButton({ theme, children, onPress, fond, style }: HeaderButtonProps) {
    const surface = (
        <View style={[styles.surface, { backgroundColor: fond ?? theme.greyBackground }, style]}>
            {children}
        </View>
    );

    // Sans `onPress`, le bouton est un cadre : l'appelant pose son propre tactile autour, ce que fait
    // le bouton retour de la pile pour recuperer le geste que React Navigation lui fournit.
    if (onPress === undefined) return surface;
    return <TouchableOpacity onPress={onPress}>{surface}</TouchableOpacity>;
}

const styles = StyleSheet.create({
    surface: {
        width: HEADER_BUTTON_SIZE,
        height: HEADER_BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: tokens.radius.md,
        // Il ne retrecit jamais : un titre long doit se tronquer avant qu'un bouton ne se deforme.
        flexShrink: 0,
    },
});

export default HeaderButton;
