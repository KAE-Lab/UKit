/**
 * Le curseur de l'application, dessine — le pendant de [`Interrupteur`](Interrupteur.tsx), et pour
 * les memes raisons : une seule apparence sur les deux plateformes, et une dependance de moins
 * (`@react-native-community/slider` sort avec lui).
 *
 * ## Ce qu'il emet, et quand
 *
 * Deux rappels, parce que deux moments differents comptent :
 *
 *   - `onChange` a **chaque cran franchi**, pour le libelle qui suit le doigt (« 15 min ») — jamais a
 *     chaque pixel : sur l'echelle des rappels, cela fait douze appels sur toute la course au lieu de
 *     plusieurs centaines, et l'ecran hote n'a pas a se proteger ;
 *   - `onFin` **au relacher**, pour ce qui coute — ecrire le reglage, reprogrammer des notifications.
 *     `SettingsManager.notify` persiste a chaque emission : brancher l'ecriture sur `onChange`
 *     ecrirait le fichier de reglages douze fois par glissement.
 *
 * ## Le geste, et le glissement entre onglets
 *
 * L'ecran Reglages **accepte le glissement d'onglet** depuis ce meme jalon : deux gestes horizontaux
 * se disputent donc le doigt. Le `Pan` s'active des quatre points (`activeOffsetX`), avant le seuil
 * du pager, et abandonne au-dela de douze points verticaux (`failOffsetY`) pour laisser l'ecran
 * defiler. Si l'appareil dement ce reglage, le repli est ecrit : l'hote coupe `swipeEnabled` entre
 * `onDebut` et `onFin`.
 *
 * La bande sensible fait toute la hauteur de la cible tactile, pas celle de la piste : on attrape le
 * curseur sans viser la poignee. Mais **le simple toucher ne deplace rien** — le saut n'a lieu qu'a
 * l'activation du geste, sinon un doigt pose pour faire defiler l'ecran changerait la valeur.
 *
 * ## Ce qui est teste ailleurs
 *
 * Toute l'arithmetique — bornes, arrondi au cran, position — vit dans
 * [`echelleDeCurseur.ts`](echelleDeCurseur.ts), jouable sous Node et couverte par ses tests. Ce
 * fichier-ci ne fait que la brancher a un doigt.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import { AppThemeType } from '../theme/Theme';
import { OMBRE_DE_POIGNEE } from './controles';
import {
    bornerPosition,
    pasSuivant,
    positionDepuisValeur,
    valeurDepuisPosition,
    type EchelleDeCurseur,
} from './echelleDeCurseur';

const HAUTEUR_CIBLE = 44;
const HAUTEUR_PISTE = 4;
const POIGNEE = 28;
/** Le recalage de fin de geste : assez court pour ne pas se voir comme une animation. */
const DUREE_RECALAGE_MS = 120;

export interface CurseurProps {
    valeur: number;
    min: number;
    max: number;
    pas: number;
    /** A chaque cran franchi pendant le glissement. */
    onChange?: (valeur: number) => void;
    /** Au relacher — et apres une action d'accessibilite, qui n'en a pas. */
    onFin?: (valeur: number) => void;
    /** Le glissement commence : de quoi geler un geste parent, si l'appareil l'exige. */
    onDebut?: () => void;
    theme: AppThemeType['settings'];
    desactive?: boolean;
    accessibilityLabel?: string;
    /** Ce qu'un lecteur d'ecran annonce a la place du nombre nu : « 15 min ». */
    libelleValeur?: (valeur: number) => string;
    style?: StyleProp<ViewStyle>;
}

export function Curseur({
    valeur, min, max, pas, onChange, onFin, onDebut, theme,
    desactive = false, accessibilityLabel, libelleValeur, style,
}: CurseurProps) {
    const echelle: EchelleDeCurseur = { min, max, pas };
    const x = useSharedValue(0);
    const course = useSharedValue(0);
    const enCours = useSharedValue(false);
    const crantee = useSharedValue(valeur);
    /** La valeur de l'hote, lisible depuis le fil d'animation. */
    const valeurProp = useSharedValue(valeur);

    useEffect(() => { valeurProp.value = valeur; }, [valeur, valeurProp]);

    /*
     * Controle : hors geste, la poignee suit la valeur de l'hote — et la premiere mesure de la piste
     * la repose au bon endroit. Pendant le geste, elle suit le doigt, sans quoi elle se battrait
     * contre lui a chaque cran.
     */
    useAnimatedReaction(
        () => [valeurProp.value, course.value] as const,
        ([v, c]) => {
            if (enCours.value) return;
            x.value = positionDepuisValeur(v, c, echelle);
        },
    );

    const surCran = useCallback((v: number) => {
        void Haptics.selectionAsync();
        onChange?.(v);
    }, [onChange]);

    const surDebut = useCallback(() => { onDebut?.(); }, [onDebut]);
    const surFin = useCallback((v: number) => { onFin?.(v); }, [onFin]);

    const pan = Gesture.Pan()
        .enabled(!desactive)
        // Avant le seuil du pager d'onglets, et apres celui d'un defilement vertical : voir l'en-tete.
        .activeOffsetX([-4, 4])
        .failOffsetY([-12, 12])
        .onStart((e) => {
            enCours.value = true;
            x.value = bornerPosition(e.x - POIGNEE / 2, course.value);
            scheduleOnRN(surDebut);
        })
        .onUpdate((e) => {
            x.value = bornerPosition(e.x - POIGNEE / 2, course.value);
            const v = valeurDepuisPosition(x.value, course.value, echelle);
            if (v !== crantee.value) {
                crantee.value = v;
                scheduleOnRN(surCran, v);
            }
        })
        .onFinalize(() => {
            enCours.value = false;
            // La poignee rejoint son cran : elle etait sous le doigt, elle se pose sur la valeur.
            x.value = withTiming(
                positionDepuisValeur(crantee.value, course.value, echelle),
                { duration: DUREE_RECALAGE_MS },
            );
            scheduleOnRN(surFin, crantee.value);
        });

    const poignee = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
    const remplissage = useAnimatedStyle(() => ({ width: x.value + POIGNEE / 2 }));

    return (
        <GestureDetector gesture={pan}>
            <View
                onLayout={(e) => { course.value = Math.max(0, e.nativeEvent.layout.width - POIGNEE); }}
                style={[styles.cible, desactive ? styles.desactive : null, style]}
                accessible
                accessibilityRole="adjustable"
                accessibilityState={{ disabled: desactive }}
                accessibilityValue={{
                    min, max, now: valeur,
                    ...(libelleValeur !== undefined ? { text: libelleValeur(valeur) } : {}),
                }}
                {...(accessibilityLabel !== undefined ? { accessibilityLabel } : {})}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => {
                    const sens = e.nativeEvent.actionName === 'increment' ? 1 : -1;
                    const suivante = pasSuivant(valeur, sens, echelle);
                    if (suivante === valeur) return;
                    crantee.value = suivante;
                    onChange?.(suivante);
                    // Aucun relacher a attendre ici : ce qui coute se fait tout de suite.
                    onFin?.(suivante);
                }}
            >
                <View style={[styles.piste, { backgroundColor: theme.switchTrack.false }]}>
                    <Reanimated.View
                        style={[styles.remplissage, { backgroundColor: theme.switchTrack.true }, remplissage]}
                    />
                </View>
                <Reanimated.View
                    style={[styles.poignee, { backgroundColor: theme.switchThumb }, poignee]}
                />
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    cible: {
        height: HAUTEUR_CIBLE,
        justifyContent: 'center',
    },
    piste: {
        height: HAUTEUR_PISTE,
        // Le rayon se calcule, comme celui d'une jauge (docs/theme.md).
        borderRadius: HAUTEUR_PISTE / 2,
        overflow: 'hidden',
    },
    remplissage: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    poignee: {
        position: 'absolute',
        left: 0,
        width: POIGNEE,
        height: POIGNEE,
        borderRadius: POIGNEE / 2,
        ...OMBRE_DE_POIGNEE,
    },
    desactive: {
        opacity: 0.5,
    },
});
