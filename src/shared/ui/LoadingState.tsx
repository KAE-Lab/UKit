/**
 * L'attente, dans les deux formes que le depot utilise reellement.
 *
 * - `inline` : l'indicateur au milieu d'un carrousel qui n'a pas encore ses cartes. Releve a
 *   l'identique dans les quatre sections du tableau de bord.
 * - `fullScreen` : l'indicateur centre d'un ecran qui n'a encore rien.
 *
 * Les deux differaient sur un detail — `size` et la clé de couleur — sans qu'aucune raison ne
 * l'explique. La forme reste un choix de l'appelant, la valeur ne l'est plus.
 *
 * La forme plein ecran passe par [`ScreenState`](ScreenState.tsx), le meme hote que l'etat vide et
 * l'etat d'erreur. Ce n'est pas un raffinement : chargement, vide et erreur se succedent sur le meme
 * ecran, et s'ils ne se centrent pas au meme endroit, le contenu **saute** au moment ou la reponse
 * arrive. C'etait le cas — l'indicateur se centrait sur l'ecran entier, l'etat vide se collait sous
 * l'en-tete.
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';
import { ScreenState } from './ScreenState';

export interface LoadingStateProps {
    theme: AppThemeType;
    /** Plein ecran, centre comme les autres etats. Par defaut l'indicateur se pose dans le flux. */
    fullScreen?: boolean;
    /**
     * Les options de l'hote, transmises telles quelles a [`ScreenState`](ScreenState.tsx) et ignorees
     * hors plein ecran. Elles voyagent ici plutot que d'obliger l'appelant a composer lui-meme :
     * un ecran qui enveloppe `LoadingState` dans son propre `ScreenState` finit par y mettre autre
     * chose, et le dialecte revient par la.
     */
    background?: string;
    topOffset?: number;
}

export function LoadingState({ theme, fullScreen = false, background, topOffset }: LoadingStateProps) {
    if (fullScreen) {
        return (
            <ScreenState
                theme={theme}
                {...(background !== undefined ? { background } : {})}
                {...(topOffset !== undefined ? { topOffset } : {})}
            >
                <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
            </ScreenState>
        );
    }

    return <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />;
}
