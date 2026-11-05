/**
 * Une case du ruban du Planning : un jour, ou une semaine (jalon 7-J).
 *
 * Le jour et la semaine dessinaient la meme case chacun de leur cote ; elle vit ici depuis que les
 * deux ont change de forme ensemble.
 *
 * **La case choisie est pleine**, de l'accentuation, son texte en blanc : un cadre de deux points se
 * perdait dans le ruban, et c'est la case qu'on cherche du regard. **Aujourd'hui** (ou cette semaine)
 * prend l'accentuation dans son texte et un point dessous, sans fond. Le dimanche s'estompe : il n'a
 * jamais de cours.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens, type AppThemeType } from '../theme/Theme';

/** La case est carree : `getItemLayout` du ruban (DayView) en depend. */
export const TAILLE_DE_CASE = 64;

export interface CaseDuRubanProps {
    theme: AppThemeType;
    /** Le grand chiffre : le quantieme, ou le numero de semaine. */
    haut: string | number;
    /** La legende : le jour de la semaine, ou « S45 ». */
    bas: string;
    choisie: boolean;
    courante: boolean;
    estompee?: boolean;
    /** La legende en capitales (« JEU. ») ; faux pour une unite qui s'ecrit en bas de casse (« h »). */
    basEnCapitales?: boolean;
    onPress: () => void;
    accessibilityLabel?: string;
}

export function CaseDuRuban({ theme, haut, bas, choisie, courante, estompee = false, basEnCapitales = true, onPress, accessibilityLabel }: CaseDuRubanProps) {
    const couleurHaut = choisie ? theme.lightFont : courante ? theme.accent : estompee ? theme.fontTertiary : theme.font;
    const couleurBas = choisie ? theme.lightFont : courante ? theme.accent : theme.fontTertiary;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: choisie }}
            accessibilityLabel={accessibilityLabel}
            style={[styles.case, choisie && { backgroundColor: theme.accent }]}
        >
            <Text
                style={[
                    styles.haut,
                    tokens.texte.chiffres,
                    { color: couleurHaut, fontWeight: choisie || courante ? tokens.fontWeight.bold : tokens.fontWeight.medium },
                ]}
            >
                {haut}
            </Text>
            <Text style={[styles.bas, !basEnCapitales && styles.basEnMinuscules, { color: couleurBas }]}>{bas}</Text>
            {courante && !choisie ? <View style={[styles.point, { backgroundColor: theme.accent }]} /> : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    case: {
        width: TAILLE_DE_CASE,
        height: TAILLE_DE_CASE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.md,
    },
    haut: {
        // Le parent a une largeur ferme : l'etirement mord, et Android cesse de tronquer.
        alignSelf: 'stretch',
        textAlign: 'center',
        fontSize: tokens.fontSize.xl,
        letterSpacing: -0.3,
    },
    bas: {
        alignSelf: 'stretch',
        textAlign: 'center',
        marginTop: tokens.space.xxs,
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    basEnMinuscules: {
        textTransform: 'none',
        letterSpacing: 0,
    },
    // Le point d'un etat : rond, comme les points d'etat du depot.
    point: {
        position: 'absolute',
        bottom: tokens.space.xs,
        width: 4,
        height: 4,
        borderRadius: tokens.radius.pill,
    },
});
