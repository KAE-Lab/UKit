/**
 * L'intertitre et la rangee de la recherche de groupes (jalon 7-J, 2026-11-05).
 *
 * Une **liste groupee** a la maniere des reglages du systeme : un intertitre en petites capitales
 * grises par prefixe, puis les groupes sur une carte, separes par un filet fin indente. Les sections
 * etaient des pastilles saturees — bleu, vert, orange — sur des rangees teintees de la meme couleur :
 * six couleurs qui ne disaient rien du contenu, et la regle du depot veut qu'une categorie de contenu
 * soit un intertitre gris (docs/theme.md, « La couleur d'action ne titre pas et ne nomme pas »).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';

export function SectionListHeader({ title, theme }: { title: string; theme: AppThemeType }) {
    return (
        // Fond plein : l'intertitre colle en haut de la liste, et ce qui defile passe dessous.
        <View style={[styles.intertitre, { backgroundColor: theme.background }]}>
            <Text style={[tokens.texte.intertitre, { color: theme.fontSecondary }]}>{title}</Text>
        </View>
    );
}

export interface GroupRowProps {
    name: string;
    theme: AppThemeType;
    /** La premiere et la derniere rangee de leur section arrondissent la carte. */
    premier: boolean;
    dernier: boolean;
    openGroup: (name: string) => void;
}

export function GroupRow({ name, theme, premier, dernier, openGroup }: GroupRowProps) {
    return (
        <Pressable
            onPress={() => requestAnimationFrame(() => openGroup(name))}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.rangee,
                {
                    backgroundColor: pressed ? theme.selection : theme.cardBackground,
                    borderColor: theme.contourDeCarte,
                },
                premier && styles.premiere,
                dernier && styles.derniere,
            ]}
        >
            <Text numberOfLines={2} style={[styles.nom, { color: theme.font }]}>{name}</Text>
            <Icon icon={{ name: 'chevron-right' }} size={20} color={theme.fontTertiary} />
            {/* Le filet separe, il n'encadre pas : aucun sous la derniere rangee, et il part sous le texte. */}
            {!dernier ? <View style={[styles.filet, { backgroundColor: theme.border }]} /> : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    intertitre: {
        paddingHorizontal: tokens.space.xl,
        paddingTop: tokens.space.lg,
        paddingBottom: tokens.space.sm,
    },
    rangee: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 52,
        marginHorizontal: tokens.space.md,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    premiere: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopLeftRadius: tokens.radius.lg,
        borderTopRightRadius: tokens.radius.lg,
    },
    derniere: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomLeftRadius: tokens.radius.lg,
        borderBottomRightRadius: tokens.radius.lg,
    },
    nom: {
        flex: 1,
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.medium,
    },
    filet: {
        position: 'absolute',
        left: tokens.space.md,
        right: 0,
        bottom: 0,
        height: StyleSheet.hairlineWidth,
    },
});
