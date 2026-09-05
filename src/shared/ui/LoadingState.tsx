/**
 * L'attente **dans le flux** : l'indicateur au milieu d'un carrousel qui n'a pas encore ses cartes,
 * d'une section qui charge ses horaires, d'une etape d'accueil. Releve a l'identique dans les quatre
 * sections du tableau de bord.
 *
 * Ce n'est **pas** l'attente d'un ecran entier : celle-la est
 * [`ChargementPleinePage`](ChargementPleinePage.tsx), et elle exige sa phrase. Les deux ont vecu ici,
 * en variantes d'un meme composant, jusqu'au jalon 6.1-E — et c'est precisement ce qui a laisse les
 * trois ecrans plein ecran **muets** : la phrase y etait possible, donc facultative, donc oubliee.
 * Deux formes, deux noms, et le compilateur qui garde la seconde.
 *
 * La phrase reste optionnelle ici, et c'est voulu : un carrousel de tableau de bord qui annonce ce
 * qu'il attend ajouterait quatre lignes de texte a un ecran qui en porte deja beaucoup.
 *
 * Comme la forme plein ecran, il **ne montre rien pendant les premieres millisecondes** : voir
 * [`indicateurRetarde.ts`](indicateurRetarde.ts). Ici on ne rend alors rien du tout — contrairement a
 * la forme plein ecran, il n'y a pas de fond a tenir.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';
import { ApparitionEnFondu } from './ApparitionEnFondu';
import { useIndicateurRetarde } from './indicateurRetarde';

export interface LoadingStateProps {
    theme: AppThemeType;
    /**
     * Ce qu'on attend, en une phrase : « Lecture des horaires… ». Optionnelle ici — un carrousel de
     * tableau de bord n'a pas de place pour une ligne de plus — et **obligatoire** dans la forme
     * plein ecran, qui est un autre composant.
     */
    message?: string;
}

export function LoadingState({ theme, message }: LoadingStateProps) {
    const visible = useIndicateurRetarde();
    if (!visible) return null;

    const phrase = message !== undefined ? (
        <Text style={[styles.message, { color: theme.fontSecondary }]}>{message}</Text>
    ) : null;

    if (phrase === null) {
        return (
            <ApparitionEnFondu>
                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
            </ApparitionEnFondu>
        );
    }

    return (
        <ApparitionEnFondu style={styles.enLigne}>
            <ActivityIndicator color={theme.primary} />
            {phrase}
        </ApparitionEnFondu>
    );
}

const styles = StyleSheet.create({
    enLigne: {
        alignItems: 'center',
        margin: tokens.space.xl,
    },
    message: {
        marginTop: tokens.space.sm,
        fontSize: tokens.fontSize.sm,
        textAlign: 'center',
    },
});
