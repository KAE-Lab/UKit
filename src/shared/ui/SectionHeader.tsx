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
import { Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';
import { Icon } from './Icon';

export interface SectionHeaderProps {
    title: string;
    theme: AppThemeType;
    /** Absent, l'en-tete n'est plus tactile et le chevron disparait : on n'annonce pas une destination qui n'existe pas. */
    onPress?: () => void;
    /**
     * Les marges d'un intertitre de fiche (7-J, deuxieme passe) : une fiche s'intertitre comme le
     * tableau Campus, mais dans un conteneur souvent deja en retrait.
     */
    style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, theme, onPress, style }: SectionHeaderProps) {
    return (
        <TouchableOpacity
            style={[{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: tokens.space.md,
                marginBottom: tokens.space.sm,
            }, style]}
            onPress={onPress}
            disabled={onPress === undefined}
            activeOpacity={0.7}
        >
            <Text style={[tokens.texte.titreDeSection, { color: theme.font }]}>
                {title}
            </Text>

            {/* Le chevron en retrait (7-J) : il dit qu'il y a une suite, il ne doit pas peser comme
                le titre qu'il prolonge. */}
            {onPress !== undefined ? (
                <Icon
                    icon={{ family: 'material', name: 'chevron-right' }}
                    size={24}
                    color={theme.fontTertiary}
                    style={{ marginLeft: tokens.space.xxs }}
                />
            ) : null}
        </TouchableOpacity>
    );
}
