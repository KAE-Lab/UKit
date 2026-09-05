/**
 * L'interrupteur de l'application, dessine plutot qu'emprunte au systeme.
 *
 * ## Pourquoi il existe
 *
 * Le `Switch` de React Native rend le controle **natif de chaque plateforme** : celui d'iOS, et celui
 * d'Android, qui a l'air d'un autre age a cote. Courir apres deux systemes qui evoluent chacun de son
 * cote coutait une divergence permanente pour un element que l'ecran Reglages montre quatre fois.
 * Decision du jalon 6.1-E, et elle est de la meme famille que la carte libre du projet : une seule
 * apparence, la notre, sur les deux plateformes.
 *
 * ## Sa forme, et l'exception qu'elle demande
 *
 * Les surfaces de UKit sont des **carres arrondis** ; la pilule y est reservee « a ce qui compte » —
 * points d'etat, compteurs, jauges (docs/theme.md). La piste d'un interrupteur en fait partie, et
 * c'est une decision, pas un oubli : ce n'est pas une **surface** — elle n'heberge aucun contenu —
 * c'est un indicateur a remplissage, de la meme famille que [`ProgressBar`](ProgressBar.tsx), ou la
 * couleur **est** la valeur. Une piste en carre arronди se lirait comme un bouton a deux etats ou une
 * case a cocher, c'est-a-dire comme l'entre-deux que ce jalon refuse.
 *
 * Le rayon se **calcule** (`hauteur / 2`), il ne s'ecrit pas : meme regle que les jauges.
 *
 * ## Controle, jamais optimiste
 *
 * La poignee suit la prop `valeur` et **rien d'autre**. C'est indispensable ici : eteindre la
 * synchronisation calendrier n'inverse pas le reglage, ca ouvre une confirmation — une poignee qui
 * partirait a l'appui reviendrait en arriere si l'on annule, et « toucher prepare, Confirmer
 * applique » est deja la regle des dialogues du depot (docs/theme.md).
 *
 * Le retour haptique, lui, acquitte le **geste** et se declenche donc a l'appui, jamais sur la
 * transition de la valeur : sans ca, la confirmation d'une modale ferait vibrer un interrupteur que
 * personne n'a touche.
 *
 * ## Pourquoi un appui et pas un glissement
 *
 * Trois raisons, et chacune suffit : la confirmation ci-dessus rendrait un glissement illisible ;
 * l'ecran Reglages accepte le **glissement entre onglets** (6.1-E), et un geste horizontal de
 * cinquante points s'y disputerait le doigt pour rien ; et les lecteurs d'ecran activent par un
 * appui, que `Pressable` recoit nativement.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Reanimated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { tokens, AppThemeType } from '../theme/Theme';
import { OMBRE_DE_POIGNEE } from './controles';

/** Le gabarit d'iOS, mesure : il n'y a aucune raison d'en inventer un autre. */
const LARGEUR_PISTE = 51;
const HAUTEUR_PISTE = 31;
const POIGNEE = 27;
const MARGE = (HAUTEUR_PISTE - POIGNEE) / 2;
const COURSE = LARGEUR_PISTE - POIGNEE - MARGE * 2;

/** La duree des transitions du depot : `transitions.ts` en pose 220, le fondu 200. */
const DUREE_MS = 200;

export interface InterrupteurProps {
    valeur: boolean;
    onChange: (valeur: boolean) => void;
    /** Le sous-arbre `settings` du theme : c'est la que vivent les couleurs de controle. */
    theme: AppThemeType['settings'];
    desactive?: boolean;
    accessibilityLabel?: string;
    /** Marges et alignement : ce que le controle ne decide pas, comme `Card`. */
    style?: StyleProp<ViewStyle>;
}

export function Interrupteur({
    valeur, onChange, theme, desactive = false, accessibilityLabel, style,
}: InterrupteurProps) {
    const progression = useSharedValue(valeur ? 1 : 0);

    useEffect(() => {
        progression.value = withTiming(valeur ? 1 : 0, {
            duration: DUREE_MS,
            easing: Easing.out(Easing.cubic),
        });
    }, [progression, valeur]);

    const piste = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            progression.value,
            [0, 1],
            [theme.switchTrack.false, theme.switchTrack.true],
        ),
    }));

    const poignee = useAnimatedStyle(() => ({
        transform: [{ translateX: progression.value * COURSE }],
    }));

    return (
        <Pressable
            onPress={() => {
                // L'ordre compte : le geste s'acquitte tout de suite, la valeur suivra si l'hote le
                // decide (voir l'en-tete).
                void Haptics.selectionAsync();
                onChange(!valeur);
            }}
            disabled={desactive}
            // Une piste de 31 points de haut n'est pas une cible de 44 : le debord la complete.
            hitSlop={{ top: tokens.space.sm, bottom: tokens.space.sm, left: tokens.space.sm, right: tokens.space.sm }}
            accessibilityRole="switch"
            accessibilityState={{ checked: valeur, disabled: desactive }}
            {...(accessibilityLabel !== undefined ? { accessibilityLabel } : {})}
            style={style}
        >
            <Reanimated.View style={[styles.piste, piste, desactive ? styles.desactive : null]}>
                <Reanimated.View style={[styles.poignee, { backgroundColor: theme.switchThumb }, poignee]} />
            </Reanimated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    piste: {
        width: LARGEUR_PISTE,
        height: HAUTEUR_PISTE,
        // Le rayon se calcule : voir l'en-tete, et la regle des jauges dans docs/theme.md.
        borderRadius: HAUTEUR_PISTE / 2,
        padding: MARGE,
        justifyContent: 'center',
    },
    poignee: {
        width: POIGNEE,
        height: POIGNEE,
        borderRadius: POIGNEE / 2,
        ...OMBRE_DE_POIGNEE,
    },
    // Le depot dit « desactive » par la transparence — la rangee de reglage le fait deja, le bouton
    // de navigation aussi. Un jeton de couleur de plus ouvrirait un second vocabulaire.
    desactive: {
        opacity: 0.5,
    },
});
