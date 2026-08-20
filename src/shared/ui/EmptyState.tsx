/**
 * Le bloc « il n'y a rien a montrer, et voila pourquoi ».
 *
 * Il porte deux situations que l'application distingue soigneusement depuis la Phase 6 — une liste
 * legitimement vide, et une source en panne — et c'est **volontairement le meme bloc** : ce qui les
 * separe est l'icone, le message et l'action, pas la mise en page. Ils etaient deja identiques au
 * caractere pres dans `CampusListEmptyState` et `SourceFailureNotice`, ecrits a deux endroits.
 *
 * Deux dispositions, et une seule raison de choisir :
 *
 * - `card` — le bloc s'inscrit **dans une liste** qui defile, entoure d'une surface et d'un filet.
 *   C'est la disposition des ecrans Campus et de tout echec de source ;
 * - `plain` — le bloc **est** l'ecran : il occupe la hauteur et se centre, sans surface. Une carte
 *   posee au milieu d'un ecran vide flotterait sans rien pour l'ancrer.
 *
 * Le Planning avait sa propre version de `plain`, en trois exemplaires et trois tailles d'icone
 * (`style.schedule.course.noCourse`, une journee sans cours, une recherche sans resultat, aucun
 * favori). Elle a converge ici au jalon 6-K : l'echec y etait deja une carte partagee, seul l'etat
 * vide restait un dialecte.
 */

import React from 'react';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, AppThemeType } from '../theme/Theme';

/** Le geste qui remplirait l'ecran, quand il en existe un. */
export interface EmptyStateAction {
    readonly label: string;
    readonly onPress: () => void;
    readonly icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export interface EmptyStateProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    message: string;
    theme: AppThemeType;
    /** Une phrase courte au-dessus du message, quand celui-ci a besoin d'etre annonce. */
    title?: string;
    action?: EmptyStateAction | null;
    /** `card` dans une liste, `plain` quand le bloc occupe l'ecran. */
    variant?: 'card' | 'plain';
}

export function EmptyState({ icon, message, theme, title, action, variant = 'card' }: EmptyStateProps) {
    const conteneur: ViewStyle = variant === 'card'
        ? {
            alignItems: 'center',
            paddingVertical: tokens.space.xl,
            paddingHorizontal: tokens.space.lg,
            marginHorizontal: tokens.space.sm,
            backgroundColor: theme.cardBackground,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: theme.border,
        }
        : {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: tokens.space.xxl,
            paddingHorizontal: tokens.space.xl,
        };

    return (
        <View style={conteneur}>
            <MaterialCommunityIcons
                name={icon}
                size={48}
                color={theme.fontSecondary}
                style={{ marginBottom: tokens.space.sm }}
            />

            {title !== undefined ? (
                <Text style={{
                    color: theme.font,
                    fontSize: tokens.fontSize.lg,
                    fontWeight: tokens.fontWeight.bold,
                    textAlign: 'center',
                    marginBottom: tokens.space.sm,
                }}>
                    {title}
                </Text>
            ) : null}

            <Text style={{
                color: theme.fontSecondary,
                fontSize: tokens.fontSize.md,
                textAlign: 'center',
            }}>
                {message}
            </Text>

            {action ? (
                <TouchableOpacity
                    onPress={action.onPress}
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
                    {action.icon !== undefined ? (
                        <MaterialCommunityIcons name={action.icon} size={18} color={theme.lightFont} />
                    ) : null}
                    <Text style={{
                        color: theme.lightFont,
                        fontSize: tokens.fontSize.md,
                        fontWeight: tokens.fontWeight.bold,
                        marginLeft: action.icon !== undefined ? tokens.space.xs : 0,
                    }}>
                        {action.label}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
