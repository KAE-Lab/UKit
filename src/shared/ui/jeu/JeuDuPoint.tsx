/**
 * Le jeu du point : de quoi occuper le pouce pendant que l'universite repond (jalon 7-J).
 *
 * Le « i » du logo court sur l'horizon et saute ce que le campus pose sur son chemin, devant la
 * silhouette des batiments qui defile au loin (`DecorDuJeu`, `PersonnageDuJeu`). La regle tient en un
 * mot, « Touche pour sauter » ; une chute remet le compteur a zero apres une courte pause, le record se
 * garde sur l'appareil. Le jeu ne demande rien et ne retient personne : l'ecran qui le porte s'efface a
 * l'arrivee du dossier, partie en cours ou non.
 *
 * **Un appui n'importe ou fait sauter**, hors des boutons (deuxieme passe, review du 2026-11-05) : le
 * jeu expose `sauter` par une poignee (`CommandeDuJeu`), et l'ecran qui le porte l'appelle de partout.
 * Toucher la carte seule faisait viser une cible trop petite.
 *
 * **La boucle ne tourne que pendant une partie** (`useFrameCallback`, sur le fil de l'interface), et
 * la physique est pure (physique.ts). Au repos, rien ne bouge et rien ne consomme. Sous « reduire les
 * animations », le jeu ne s'affiche pas : il n'existe que par le mouvement.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useFrameCallback,
    useReducedMotion,
    useSharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { tokens, type AppThemeType } from '../../theme/Theme';
import Translator from '../../i18n/Translator';
import { avancer, etatDeDepart, sauter, type EtatDuJeu, type PhaseDuJeu } from './physique';
import { Nuages, Obstacle, Silhouette } from './DecorDuJeu';
import { PersonnageDuJeu } from './PersonnageDuJeu';

/** La hauteur de l'horizon au-dessus du bas du dessin. */
const SOL = 30;
/** Le pas de la graduation de l'horizon : un trait tous les seize points. */
const PAS_DE_GRADUATION = 16;
const CLE_DU_RECORD = 'jeu.point.record';

export interface CommandeDuJeu {
    /** Un saut, ou le depart d'une partie : ce que fait un toucher. */
    sauter: () => void;
}

export const JeuDuPoint = forwardRef<CommandeDuJeu, { theme: AppThemeType; hauteur?: number }>(function JeuDuPoint({ theme, hauteur = 150 }, poignee) {
    const mouvementReduit = useReducedMotion();
    const largeur = useSharedValue(320);
    const etat = useSharedValue<EtatDuJeu>(etatDeDepart(320));
    const [score, setScore] = useState(0);
    const [record, setRecord] = useState(0);
    const [phase, setPhase] = useState<PhaseDuJeu>('attente');
    const [graduations, setGraduations] = useState(24);

    useEffect(() => {
        AsyncStorage.getItem(CLE_DU_RECORD)
            .then((brut) => { if (brut !== null && Number.isFinite(Number(brut))) setRecord(Number(brut)); })
            .catch(() => undefined);
    }, []);

    const surChute = useCallback((points: number) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        setRecord((ancien) => {
            if (points <= ancien) return ancien;
            void AsyncStorage.setItem(CLE_DU_RECORD, String(points)).catch(() => undefined);
            return points;
        });
    }, []);

    const boucle = useFrameCallback((image) => {
        const avant = etat.value;
        const apres = avancer(avant, image.timeSincePreviousFrame ?? 16, largeur.value, Math.random());
        etat.value = apres;
        if (apres.score !== avant.score) runOnJS(setScore)(apres.score);
        if (apres.phase !== avant.phase) {
            runOnJS(setPhase)(apres.phase);
            if (apres.phase === 'chute') runOnJS(surChute)(avant.score);
        }
    }, false);

    // Revenue au repos apres une chute, la boucle s'arrete : rien ne tourne entre deux parties.
    useEffect(() => {
        if (phase === 'attente') boucle.setActive(false);
    }, [phase, boucle]);

    const toucher = useCallback(() => {
        if (etat.value.phase === 'chute') return;
        const depart = etat.value.phase === 'attente';
        etat.value = sauter(etat.value, largeur.value);
        if (depart) {
            setScore(0);
            setPhase('course');
            boucle.setActive(true);
        }
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }, [etat, largeur, boucle]);

    useImperativeHandle(poignee, () => ({ sauter: toucher }), [toucher]);

    const graduation = useAnimatedStyle(() => ({
        transform: [{ translateX: -(etat.value.distance % PAS_DE_GRADUATION) }],
    }));

    const mesurer = (evenement: LayoutChangeEvent) => {
        const l = evenement.nativeEvent.layout.width;
        largeur.value = l;
        etat.value = etatDeDepart(l);
        setGraduations(Math.ceil(l / PAS_DE_GRADUATION) + 2);
    };

    if (mouvementReduit) return null;

    const trait = theme.fontSecondary;
    return (
        <Pressable
            onPressIn={toucher}
            onLayout={mesurer}
            accessibilityRole="button"
            accessibilityLabel={Translator.get('JEU_ACCESSIBILITE')}
            style={[styles.dessin, { height: hauteur, backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}
        >
            <Nuages etat={etat} couleur={`${theme.fontTertiary}26`} largeur={largeur} />
            <Silhouette etat={etat} couleur={`${theme.fontTertiary}2E`} sol={SOL} />

            <View style={styles.compteur} pointerEvents="none">
                <Text style={[styles.score, tokens.texte.chiffres, { color: theme.font }]}>{score}</Text>
                {record > 0 ? (
                    <Text style={[styles.record, tokens.texte.chiffres, { color: theme.fontTertiary }]}>
                        {Translator.get('JEU_RECORD', record)}
                    </Text>
                ) : null}
            </View>

            {phase === 'attente' ? (
                <Text style={[styles.consigne, { color: theme.fontSecondary, top: hauteur / 2 - SOL - tokens.space.md }]} pointerEvents="none">
                    {Translator.get('JEU_CONSIGNE')}
                </Text>
            ) : null}

            <View style={[styles.horizon, { backgroundColor: theme.fontTertiary }]} pointerEvents="none" />
            <Reanimated.View style={[styles.graduation, graduation]} pointerEvents="none">
                {Array.from({ length: graduations }, (_, i) => (
                    <View key={i} style={[styles.trait, { backgroundColor: theme.fontTertiary }]} />
                ))}
            </Reanimated.View>

            {[0, 1, 2].map((rang) => <Obstacle key={rang} etat={etat} rang={rang} couleur={trait} accent={theme.accent} sol={SOL} />)}

            <PersonnageDuJeu etat={etat} theme={theme} chute={phase === 'chute'} sol={SOL} />
        </Pressable>
    );
});

const styles = StyleSheet.create({
    dessin: {
        alignSelf: 'stretch',
        borderRadius: tokens.radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    compteur: {
        position: 'absolute',
        top: tokens.space.sm,
        right: tokens.space.md,
        alignItems: 'flex-end',
    },
    score: {
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.semibold,
    },
    record: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.medium,
    },
    consigne: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.medium,
    },
    horizon: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: SOL,
        height: StyleSheet.hairlineWidth * 2,
        opacity: 0.6,
    },
    // La graduation sous l'horizon : la regle d'un plan, qui dit le defilement.
    graduation: {
        position: 'absolute',
        left: 0,
        bottom: SOL - tokens.space.sm + tokens.space.xxs,
        flexDirection: 'row',
    },
    trait: {
        width: StyleSheet.hairlineWidth * 3,
        height: tokens.space.xs,
        marginRight: PAS_DE_GRADUATION - StyleSheet.hairlineWidth * 3,
        opacity: 0.5,
    },
});
