/**
 * Le bandeau flottant en haut de l'ecran — la seule forme de bandeau de l'application.
 *
 * Une carte posee sous la barre d'etat, par-dessus le contenu, qui ne deplace aucun ecran : c'est la
 * decision durable prise pour les messages de service (docs/theme.md), et elle vaut pour tout
 * bandeau a venir. Il ne porte qu'une **information** : l'icone, un titre, une croix. Il se lit une
 * fois et se ferme d'un geste ; le toucher ouvre le detail.
 *
 * Il n'a plus de variante permanente : le rappel d'un incident en cours cachait le grand titre des
 * onglets (retour d'appareil du 2026-09-03) et vit desormais dans la rangee du titre, dans la
 * pastille d'etat de service (`shared/messages/PastilleService`). Ce qui flotte ici est transitoire
 * par construction.
 *
 * Son gabarit est celui des en-tetes — la hauteur des boutons d'en-tete, le corps `md` demi-gras —
 * pour qu'il se lise comme une piece de la barre et non comme une notification etrangere. L'hote est
 * absolu et laisse passer les touchers autour de la carte (`box-none`) : le bandeau se superpose, il
 * ne bloque pas.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../i18n/Translator';
import { tokens, type AppThemeType } from '../theme/Theme';
import { HEADER_BUTTON_ICON, HEADER_BUTTON_SIZE } from './HeaderButton';

export interface BandeauProps {
    theme: AppThemeType;
    titre: string;
    /** Le toucher sur la carte : ouvrir le detail. */
    onPress: () => void;
    /** La croix : fermer, et ne plus revenir. */
    onFermer: () => void;
}

const CROIX_SIZE = tokens.fontSize.lg;
const DUREE_ENTREE_MS = 200;
const GLISSEMENT_ENTREE = -tokens.space.md;
/** Sous le menu de developpement (9999), au-dessus de tout le reste. */
const Z_INDEX = 900;

export function Bandeau({ theme, titre, onPress, onFermer }: BandeauProps) {
    const insets = useSafeAreaInsets();
    const entree = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        entree.setValue(0);
        Animated.timing(entree, { toValue: 1, duration: DUREE_ENTREE_MS, useNativeDriver: true }).start();
    }, [entree, titre]);

    const translateY = entree.interpolate({ inputRange: [0, 1], outputRange: [GLISSEMENT_ENTREE, 0] });

    return (
        <View pointerEvents="box-none" style={[styles.hote, { top: insets.top + tokens.space.sm }]}>
            <Animated.View
                style={[
                    styles.carte,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    { opacity: entree, transform: [{ translateY }] },
                ]}
            >
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={titre}
                    activeOpacity={0.8}
                    onPress={onPress}
                    style={styles.contenu}
                >
                    <MaterialCommunityIcons name="information-outline" size={HEADER_BUTTON_ICON} color={theme.primary} />
                    <Text numberOfLines={2} style={[styles.titre, { color: theme.font }]}>
                        {titre}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={Translator.get('CLOSE')}
                    hitSlop={tokens.space.sm}
                    onPress={onFermer}
                    style={styles.croix}
                >
                    <MaterialCommunityIcons name="close" size={CROIX_SIZE} color={theme.fontSecondary} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    hote: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: Z_INDEX,
        paddingHorizontal: tokens.space.md,
    },
    carte: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: HEADER_BUTTON_SIZE,
        paddingVertical: tokens.space.xs,
        paddingLeft: tokens.space.md,
        paddingRight: tokens.space.xs,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        ...tokens.shadow.md,
    },
    contenu: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.sm,
    },
    titre: {
        flex: 1,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    croix: {
        padding: tokens.space.xs,
    },
});
