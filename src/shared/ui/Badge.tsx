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
import { TexteMasque } from './TexteMasque';

export interface BadgeProps {
    label: string;
    theme: AppThemeType;
    icon?: IconSpec;
    /** Absent, la pastille prend la couleur d'action. Present, elle dit un etat. */
    tone?: SemanticTone;
    /**
     * La pastille d'un squelette (7-I) : un bloc plein de sa taille exacte, sans couleur d'action —
     * une pastille coloree qui attend attirerait l'oeil sur ce qui n'est pas encore la.
     */
    masque?: boolean;
}

/** La largeur d'un libelle court, celle d'une distance : un squelette n'en connait pas d'autre. */
const LARGEUR_LIBELLE_MASQUE = 36;

export function Badge({ label, theme, icon, tone, masque = false }: BadgeProps) {
    const couleur = masque ? theme.border : tone !== undefined ? toneColor(theme, tone) : theme.primary;
    const fond = masque ? theme.border : tone !== undefined ? toneSoftColor(theme, tone) : `${theme.primary}15`;
    const styleDuLibelle = {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.bold,
        marginLeft: icon !== undefined ? tokens.space.xs : 0,
    };

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
            {masque ? (
                <TexteMasque
                    style={styleDuLibelle}
                    largeur="100%"
                    couleur={fond}
                    boite={{ width: LARGEUR_LIBELLE_MASQUE }}
                />
            ) : (
                <Text numberOfLines={1} style={[styleDuLibelle, { color: couleur, flexShrink: 1 }]}>
                    {label}
                </Text>
            )}
        </View>
    );
}
