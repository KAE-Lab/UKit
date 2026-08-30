/**
 * La pastille d'emetteur d'une annonce, teintee par son identite (`couleur` en base).
 *
 * Le `Badge` partage ne connait que la couleur d'action et les tons semantiques — l'identite d'une
 * annonce est une couleur de palette arbitraire, donc la pastille se compose ici, au motif exact du
 * Badge (fond a 10 %, `radius.md`). Partagee par la carte de liste, le carrousel et la fiche : les
 * trois surfaces disent l'emetteur d'une seule voix, dans la teinte de l'annonce.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';

/** La teinte d'identite d'une annonce : sa couleur de palette, l'accent en repli. */
export function teinteDAnnonce(couleur: number | undefined, theme: AppThemeType): string {
    return theme.sectionsHeaders[couleur ?? -1] ?? theme.accent ?? theme.primary;
}

export function PastilleEmetteur({ nom, teinte }: { nom: string; teinte: string }) {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: `${teinte}1A`,
            paddingHorizontal: tokens.space.sm,
            paddingVertical: tokens.space.xs,
            borderRadius: tokens.radius.md,
        }}>
            <MaterialCommunityIcons name="account" size={14} color={teinte} />
            <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: teinte, marginLeft: tokens.space.xs, flexShrink: 1 }}>
                {nom}
            </Text>
        </View>
    );
}
