/**
 * Une pastille : une icone, un libelle, un fond translucide.
 *
 * Relevee huit fois au caractere pres, toujours pour la meme chose — la distance a pied d'un lieu
 * (inventaire visuel, divergence 3.3). Deux des huit copies avaient deja diverge sur le nom de
 * l'icone (`walk` contre `directions-walk`) pour un rendu identique, ce qui est exactement la
 * mecanique que ce jalon supprime.
 *
 * Le fond par defaut reprend le motif releve, `${theme.primary}15`, et **non** `theme.primarySoft` :
 * les deux ne rendent pas la meme couleur en theme sombre (`#5E5CE615` contre `#0A84FF20`, divergence
 * 3.9). Les confondre changerait huit endroits en silence.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { tokens, AppThemeType, SemanticTone, toneColor, toneSoftColor } from '../theme/Theme';
import { Icon, type IconSpec } from './Icon';

export interface BadgeProps {
    label: string;
    theme: AppThemeType;
    icon?: IconSpec;
    /** Absent, la pastille prend la couleur d'action. Present, elle dit un etat. */
    tone?: SemanticTone;
}

export function Badge({ label, theme, icon, tone }: BadgeProps) {
    const couleur = tone !== undefined ? toneColor(theme, tone) : theme.primary;
    const fond = tone !== undefined ? toneSoftColor(theme, tone) : `${theme.primary}15`;

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: fond,
            paddingHorizontal: tokens.space.sm,
            paddingVertical: tokens.space.xs,
            borderRadius: tokens.radius.md,
        }}>
            {icon !== undefined ? (
                <Icon icon={icon} size={14} color={couleur} />
            ) : null}
            {/* Un libelle long — un nom d'emetteur — se tronque au lieu de deborder de la carte.
                Sans effet sur les usages courts : une distance ne remplit jamais la pastille. */}
            <Text
                numberOfLines={1}
                style={{
                    fontSize: tokens.fontSize.sm,
                    fontWeight: tokens.fontWeight.bold,
                    color: couleur,
                    marginLeft: icon !== undefined ? tokens.space.xs : 0,
                    flexShrink: 1,
                }}
            >
                {label}
            </Text>
        </View>
    );
}
