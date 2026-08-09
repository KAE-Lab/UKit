/**
 * Un echec de source, tel qu'un ecran le montre.
 *
 * Le composant vivait dans `features/Campus/components/CampusLayoutComponents.tsx` jusqu'au jalon
 * 6-E, ou le planning a eu besoin du meme rendu. Il a donc remonte dans `shared/ui/` plutot que
 * d'etre importe d'une feature a l'autre — une dependance croisee entre deux dossiers de `features/`
 * est ce que [architecture.md](../../../docs/architecture.md) demande d'eviter, et deux copies du
 * meme message auraient diverge a la premiere retouche.
 *
 * Ce qu'il decide, il ne le decide pas lui-meme : **le bouton Reessayer n'apparait que si la famille
 * d'echec est reessayable.** Le proposer sur un echec que rejouer ne repare pas — une source qui a
 * change de contrat — serait pire que de ne rien proposer. C'est la table de
 * [`failures.ts`](../aetherius/failures.ts) qui tranche.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../i18n/Translator';
import { tokens, AppThemeType } from '../theme/Theme';
import type { UkitFailure } from '../aetherius';

interface SourceFailureNoticeProps {
    failure: UkitFailure;
    theme: AppThemeType;
    onRetry?: () => void;
}

export function SourceFailureNotice({ failure, theme, onRetry }: SourceFailureNoticeProps) {
    return (
        <View style={{
            alignItems: 'center',
            paddingVertical: tokens.space.xl,
            paddingHorizontal: tokens.space.lg,
            marginHorizontal: tokens.space.sm,
            backgroundColor: theme.cardBackground,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: theme.border
        }}>
            <MaterialCommunityIcons
                name="cloud-off-outline"
                size={48}
                color={theme.fontSecondary}
                style={{ marginBottom: tokens.space.sm }}
            />
            <Text style={{
                color: theme.fontSecondary,
                fontSize: tokens.fontSize.md,
                textAlign: 'center'
            }}>
                {Translator.get(failure.messageKey)}
            </Text>

            {failure.retryable && onRetry ? (
                <TouchableOpacity
                    onPress={onRetry}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: tokens.space.md,
                        paddingVertical: tokens.space.sm,
                        paddingHorizontal: tokens.space.lg,
                        borderRadius: tokens.radius.md,
                        backgroundColor: theme.primary,
                    }}
                >
                    {/* `lightFont` et non `accentFont` : ce dernier est le rouge destructif des messages
                        d'erreur (ScolariteLoginView), illisible sur le fond `primary` du bouton. */}
                    <MaterialCommunityIcons name="refresh" size={18} color={theme.lightFont} />
                    <Text style={{ color: theme.lightFont, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, marginLeft: tokens.space.xs }}>
                        {Translator.get('RETRY')}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
