/**
 * Les pieces de la section vie etudiante du tableau de bord.
 *
 * Sorties de `BdeSection` pour la garder sous la limite de lignes : la section compose et branche la
 * navigation, ces composants rendent. Meme decoupage que `CampusLayoutComponents` pour
 * `CampusListLayout`.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import type { BdeAnnonce } from '../../services/BdeService';
import type { UkitFailure } from '../../../../shared/aetherius';

interface BdeAnnonceCardProps {
    annonce: BdeAnnonce;
    width: number;
    theme: AppThemeType;
    onPress: () => void;
}

export function BdeAnnonceCard({ annonce, width, theme, onPress }: BdeAnnonceCardProps) {
    return (
        <Reanimated.View entering={FadeIn} layout={LinearTransition.springify()}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={{
                    width,
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl,
                    marginRight: tokens.space.md,
                    ...tokens.shadow.md,
                    overflow: 'hidden',
                }}
            >
                <View style={{ width: '100%', height: 160, backgroundColor: theme.greyBackground }}>
                    {annonce.image_url ? (
                        <Image source={{ uri: annonce.image_url }} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    ) : null}
                </View>

                <View style={{ padding: tokens.space.md }}>
                    <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1, marginBottom: tokens.space.xs }} numberOfLines={1}>
                        {annonce.title}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: annonce.info_label ? 4 : 0 }}>
                        <MaterialCommunityIcons name="account" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: tokens.space.xs, flex: 1 }} numberOfLines={1}>
                            {annonce.issuer_name}
                        </Text>
                    </View>

                    {annonce.info_label ? (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <MaterialCommunityIcons name="information-outline" size={16} color={theme.fontSecondary} style={{ marginTop: tokens.space.xxs }} />
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: tokens.space.xs, flex: 1, lineHeight: 20 }} numberOfLines={2}>
                                {annonce.info_label}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    );
}

interface BdeSectionErrorProps {
    failure: UkitFailure;
    theme: AppThemeType;
    onRetry: () => void;
}

/**
 * L'echec, en une ligne discrete plutot qu'en carte pleine.
 *
 * Le tableau de bord empile plusieurs sections : une carte d'erreur de la taille d'une annonce
 * donnerait a une panne editoriale l'importance d'un contenu. Une ligne suffit a dire ce qui se
 * passe et a proposer d'y revenir.
 *
 * Le bouton n'apparait que si la famille est reessayable : c'est la table de
 * shared/aetherius/failures.ts qui decide, pas ce composant.
 */
export function BdeSectionError({ failure, theme, onRetry }: BdeSectionErrorProps) {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: tokens.space.md,
            padding: tokens.space.md,
            backgroundColor: theme.cardBackground,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: theme.border,
        }}>
            <MaterialCommunityIcons name="cloud-off-outline" size={20} color={theme.fontSecondary} />
            <Text style={{ flex: 1, marginLeft: tokens.space.sm, fontSize: tokens.fontSize.sm, color: theme.fontSecondary }}>
                {Translator.get(failure.messageKey)}
            </Text>
            {failure.retryable ? (
                <TouchableOpacity onPress={onRetry} activeOpacity={0.7} style={{ paddingLeft: tokens.space.sm }}>
                    <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary }}>
                        {Translator.get('RETRY')}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
