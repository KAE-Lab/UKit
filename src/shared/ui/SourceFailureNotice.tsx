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
 *
 * Depuis le jalon 6-J il porte aussi une **action qui n'est pas une reprise** : « colle ton lien »,
 * « connecte ton compte ». La distinction est la meme que celle du bouton Reessayer, prise par l'autre
 * bout — reessayer repare une panne, une action repare une **absence**. Un echec de famille `config`
 * n'a jamais de bouton Reessayer et peut parfaitement avoir une action, et c'est precisement le cas
 * qui a motive ce jalon : l'onglet Planning d'une universite qui attend un lien n'est pas en panne, il
 * attend un geste. Les deux ne s'affichent jamais ensemble.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Translator from '../i18n/Translator';
import { tokens, AppThemeType } from '../theme/Theme';
import type { UkitFailure } from '../aetherius';

/** Le geste qui remplirait l'ecran, quand il en existe un. Jamais une reprise. */
export interface NoticeAction {
    readonly label: string;
    readonly onPress: () => void;
    readonly icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface SourceFailureNoticeProps {
    failure: UkitFailure;
    theme: AppThemeType;
    onRetry?: () => void;
    action?: NoticeAction;
}

export function SourceFailureNotice({ failure, theme, onRetry, action }: SourceFailureNoticeProps) {
    // Une action proposee remplace la reprise : les deux au meme endroit rendraient la cible ambigue,
    // et un echec qui porte une action n'est de toute facon jamais reessayable (famille `config`).
    const bouton: NoticeAction | null = action
        ? action
        : failure.retryable && onRetry
            ? { label: Translator.get('RETRY'), onPress: onRetry, icon: 'refresh' }
            : null;

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

            {bouton !== null ? (
                <TouchableOpacity
                    onPress={bouton.onPress}
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
                    {bouton.icon !== undefined && (
                        <MaterialCommunityIcons name={bouton.icon} size={18} color={theme.lightFont} />
                    )}
                    <Text style={{ color: theme.lightFont, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, marginLeft: tokens.space.xs }}>
                        {bouton.label}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
