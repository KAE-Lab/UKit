/**
 * L'attente, dans les deux formes que le depot utilise reellement.
 *
 * - `inline` : l'indicateur au milieu d'un carrousel qui n'a pas encore ses cartes. Releve a
 *   l'identique dans les quatre sections du tableau de bord.
 * - `fullScreen` : l'indicateur centre d'un ecran qui n'a encore rien. Releve dans `CampusListLayout`.
 *
 * Les deux differaient sur un detail — `size` et la clé de couleur — sans qu'aucune raison ne
 * l'explique. La forme reste un choix de l'appelant, la valeur ne l'est plus.
 */

import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';

export interface LoadingStateProps {
    theme: AppThemeType;
    /** Plein ecran, centre verticalement. Par defaut l'indicateur se pose dans le flux. */
    fullScreen?: boolean;
}

export function LoadingState({ theme, fullScreen = false }: LoadingStateProps) {
    if (fullScreen) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
            </View>
        );
    }

    return <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />;
}
