/**
 * L'en-tete d'une section de tableau de bord : un titre, un chevron, et l'ecran complet derriere.
 *
 * Releve a l'identique dans les quatre sections du tableau de bord Campus — annonces, restaurants,
 * bibliotheques, salles libres (inventaire visuel, divergence 3.2). Meme taille, meme police, meme
 * chevron, meme ecart de 2 px : quatre copies qui n'avaient aucune raison de rester quatre.
 *
 * La hierarchie tient a la taille et a la graisse, pas a une police de titrage : l'application est
 * entierement en police systeme depuis le 2026-08-16 (docs/theme.md).
 */

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { tokens, AppThemeType } from '../theme/Theme';

export interface SectionHeaderProps {
    title: string;
    theme: AppThemeType;
    /** Absent, l'en-tete n'est plus tactile et le chevron disparait : on n'annonce pas une destination qui n'existe pas. */
    onPress?: () => void;
}

export function SectionHeader({ title, theme, onPress }: SectionHeaderProps) {
    return (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: tokens.space.md,
                marginBottom: tokens.space.sm,
            }}
            onPress={onPress}
            disabled={onPress === undefined}
            activeOpacity={0.7}
        >
            <Text style={{
                fontSize: tokens.fontSize.xl,
                fontWeight: tokens.fontWeight.bold,
                color: theme.font,
            }}>
                {title}
            </Text>

            {onPress !== undefined ? (
                <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color={theme.fontSecondary}
                    style={{ marginLeft: tokens.space.xxs }}
                />
            ) : null}
        </TouchableOpacity>
    );
}
