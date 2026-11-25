/**
 * Les pieces du formulaire de retour qui n'existaient pas encore dans le vocabulaire des Reglages
 * (lot 3) : un champ de saisie pose dans la carte d'un groupe, une rangee qui dit sa valeur sous son
 * libelle avec son interrupteur, une puce d'action et un paragraphe de carte. Toutes au gabarit de
 * `GroupeDeReglages` : meme marge, meme filet, memes couleurs de champ que le formulaire du lien
 * d'abonnement (`LienEdtForm`).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';
import { Interrupteur } from '../../../shared/ui/Interrupteur';

/** Un champ de saisie dans la carte d'un groupe ; `lignes` en fait une zone de texte. */
export function Champ({ theme, lignes = 1, compte, ...props }: TextInputProps & { theme: AppThemeType; lignes?: number; compte?: string }) {
    const zone = lignes > 1;
    return (
        <View style={styles.champ}>
            <TextInput
                placeholderTextColor={theme.fontTertiary}
                multiline={zone}
                textAlignVertical={zone ? 'top' : 'center'}
                {...props}
                style={[styles.saisie, zone && { minHeight: lignes * tokens.fontSize.md * 1.5 }, { color: theme.font, backgroundColor: theme.field, borderColor: theme.fieldBorder }]}
            />
            {compte !== undefined ? <Text style={[styles.compte, tokens.texte.chiffres, { color: theme.fontTertiary }]}>{compte}</Text> : null}
        </View>
    );
}

/** Une rangee dont la valeur se lit sous le libelle, et son interrupteur : un bloc du contexte joint. */
export function RangeeAInterrupteur({ theme, libelle, valeur, actif, basculer }: {
    theme: AppThemeType; libelle: string; valeur?: string; actif: boolean; basculer: () => void;
}) {
    return (
        <View style={styles.rangee}>
            <View style={styles.textes}>
                <Text style={[styles.libelle, { color: actif ? theme.font : theme.fontTertiary }]}>{libelle}</Text>
                {valeur !== undefined ? (
                    <Text numberOfLines={3} style={[styles.valeur, { color: actif ? theme.fontSecondary : theme.fontTertiary }]}>{valeur}</Text>
                ) : null}
            </View>
            <Interrupteur theme={theme.settings} valeur={actif} onChange={basculer} accessibilityLabel={libelle} />
        </View>
    );
}

/** Une puce d'action, au gabarit des puces de la feuille de signalement. */
export function Puce({ theme, libelle, icone, onPress, desactivee = false, faite = false }: {
    theme: AppThemeType; libelle: string; icone?: 'check' | 'plus' | 'thumb-up-outline'; onPress: () => void; desactivee?: boolean; faite?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={desactivee || faite}
            hitSlop={tokens.space.xs}
            accessibilityRole="button"
            accessibilityState={{ disabled: desactivee || faite, selected: faite }}
            style={({ pressed }) => [
                styles.puce,
                { backgroundColor: faite ? theme.primarySoft : pressed ? theme.selection : theme.greyBackground },
                desactivee && styles.eteinte,
            ]}
        >
            {icone !== undefined ? <Icon icon={{ name: faite ? 'check' : icone }} size={16} color={theme.accent} /> : null}
            <Text numberOfLines={1} style={[styles.libelleDePuce, { color: theme.accent }]}>{libelle}</Text>
        </Pressable>
    );
}

/** Un paragraphe pose sur la carte d'un groupe. */
export function Paragraphe({ theme, children }: { theme: AppThemeType; children: React.ReactNode }) {
    return <Text style={[styles.paragraphe, { color: theme.fontSecondary }]}>{children}</Text>;
}

const styles = StyleSheet.create({
    champ: {
        padding: tokens.space.sm,
    },
    saisie: {
        borderRadius: tokens.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        fontSize: tokens.fontSize.md,
    },
    compte: {
        alignSelf: 'flex-end',
        marginTop: tokens.space.xs,
        marginRight: tokens.space.xs,
        fontSize: tokens.fontSize.xs,
    },
    rangee: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        gap: tokens.space.md,
    },
    textes: {
        flex: 1,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
    },
    valeur: {
        marginTop: tokens.space.xxs,
        fontSize: tokens.fontSize.sm,
    },
    puce: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space.xs,
        minHeight: 36,
        paddingHorizontal: tokens.space.md,
        borderRadius: tokens.radius.md,
    },
    eteinte: {
        opacity: 0.5,
    },
    libelleDePuce: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    paragraphe: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
        fontSize: tokens.fontSize.sm,
        lineHeight: 20,
    },
});
