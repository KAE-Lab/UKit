/**
 * L'attente **qui occupe l'ecran**, et qui dit ce qu'elle attend.
 *
 * Un indicateur seul est muet, et un indicateur muet qui dure ne se distingue pas d'un ecran casse :
 * c'est le constat qui ouvre le jalon 6.1-E — « les details qui separent ca bugue de ca charge ».
 * `LoadingState` avait recu une phrase au jalon 6.1-A, et **aucun de ses trois sites plein ecran ne la
 * passait** : la phrase etait possible, pas obligatoire, donc absente. Ici elle est dans le type,
 * comme le titre d'`EmptyState` — c'est le compilateur qui garantit qu'aucun ecran n'en oublie une,
 * pas une ligne de liste a cocher.
 *
 * Les deux formes portent donc deux noms : celle-ci occupe l'ecran, `LoadingState` se pose dans le
 * flux (le carrousel d'une section, une liste d'horaires). Un seul composant a variantes rendait
 * l'oubli possible dans un sens et pas dans l'autre.
 *
 * ## La seconde ligne, apres quatre secondes
 *
 * Une phrase d'attente reste vraie une seconde ; passe un certain temps, elle laisse croire que rien
 * n'avance. La seconde ligne ne s'affiche donc **que si l'attente dure** : elle n'annonce pas un
 * echec — le modele d'erreur s'en charge, et il a ses propres ecrans — elle dit que la lenteur est
 * connue. Quatre secondes parce que c'est le seuil ou une attente cesse d'etre percue comme une
 * reponse ; en deca, la faire clignoter serait pire que le silence.
 *
 * Elle arrive **en fondu** et non d'un coup, pour la meme raison que le libelle d'etape du parcours
 * froid : un texte qui apparait sec, sous un indicateur qui tourne, se lit comme un sursaut.
 *
 * ## Il ne montre rien pendant les premieres millisecondes
 *
 * Un chargement plus court que 300 ms n'affiche **aucun** indicateur : le montrer puis le retirer
 * aussitot se lit moins bien que ne rien montrer du tout. La regle et son seuil vivent dans
 * [`indicateurRetarde.ts`](indicateurRetarde.ts), qui explique aussi ce qu'on a decide de ne pas
 * faire. L'hote, lui, est rendu tout de suite : c'est son fond, et le faire apparaitre apres coup
 * ferait clignoter la couleur de la page.
 *
 * ## Ou il se pose
 *
 * Dans [`ScreenState`](ScreenState.tsx), l'hote commun des etats plein ecran : chargement, vide et
 * erreur se succedent sur le meme ecran, et s'ils ne se posent pas au meme endroit, le contenu
 * **saute** au moment ou la reponse arrive. C'est ce qui reste a corriger dans les ecrans qui
 * centraient leur indicateur a la main.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text } from 'react-native';

import { tokens, AppThemeType } from '../theme/Theme';
import { ApparitionEnFondu } from './ApparitionEnFondu';
import { useIndicateurRetarde } from './indicateurRetarde';
import { ScreenState } from './ScreenState';

/** Au-dela, l'attente a besoin de se justifier. En deca, elle n'a rien a ajouter. */
const DELAI_PATIENCE_MS = 4000;

export interface ChargementPleinePageProps {
    theme: AppThemeType;
    /**
     * Ce qu'on attend, en une phrase : « Recherche des salles libres… ». **Obligatoire** : c'est la
     * raison d'etre de ce composant.
     */
    message: string;
    /**
     * La seconde ligne, quand l'attente dure. Absente, l'attente reste muette au-dela de quatre
     * secondes — le bon choix pour une attente qu'on sait courte, et seulement pour celle-la.
     */
    patience?: string;
    /** Les options de l'hote, transmises telles quelles a [`ScreenState`](ScreenState.tsx). */
    background?: string;
    topOffset?: number;
}

/**
 * L'apparition de la seconde ligne : elle existe des le depart dans l'arbre, elle attend son heure.
 *
 * Le minuteur est **arme au montage et nettoye au demontage** : un chargement qui s'acheve avant le
 * seuil ne doit pas laisser derriere lui un `setState` sur un composant demonte.
 */
function usePatience(active: boolean) {
    const [visible, setVisible] = useState(false);
    const opacite = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!active) return;
        const minuteur = setTimeout(() => setVisible(true), DELAI_PATIENCE_MS);
        return () => clearTimeout(minuteur);
    }, [active]);

    useEffect(() => {
        if (!visible) return;
        const animation = Animated.timing(opacite, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [opacite, visible]);

    return { visible, opacite };
}

export function ChargementPleinePage({
    theme, message, patience, background, topOffset,
}: ChargementPleinePageProps) {
    const attente = usePatience(patience !== undefined);
    const indicateurVisible = useIndicateurRetarde();

    return (
        <ScreenState
            theme={theme}
            {...(background !== undefined ? { background } : {})}
            {...(topOffset !== undefined ? { topOffset } : {})}
        >
            {indicateurVisible ? (
                <ApparitionEnFondu>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                    <Text style={[styles.message, { color: theme.fontSecondary }]}>{message}</Text>
                    {attente.visible && patience !== undefined ? (
                        <Animated.Text
                            style={[styles.patience, { color: theme.fontSecondary, opacity: attente.opacite }]}
                        >
                            {patience}
                        </Animated.Text>
                    ) : null}
                </ApparitionEnFondu>
            ) : null}
        </ScreenState>
    );
}

const styles = StyleSheet.create({
    message: {
        marginTop: tokens.space.md,
        fontSize: tokens.fontSize.sm,
        textAlign: 'center',
    },
    patience: {
        marginTop: tokens.space.sm,
        fontSize: tokens.fontSize.xs,
        textAlign: 'center',
    },
});
