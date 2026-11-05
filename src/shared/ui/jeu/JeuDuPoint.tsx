/**
 * Le jeu du point : de quoi occuper le pouce pendant que l'universite repond (jalon 7-J).
 *
 * Un dessin au trait de l'Epure, sur une carte : l'horizon et sa graduation qui defile, le point du
 * « i » du logo, et les **cotes** — une barre et ses deux butees, les traits d'un plan — qu'il saute.
 * La regle tient en un mot, « Touche pour sauter » ; une chute remet le compteur a zero apres une
 * courte pause, le record se garde sur l'appareil. Le jeu ne demande rien et ne retient personne :
 * l'ecran qui le porte s'efface a l'arrivee du dossier, partie en cours ou non.
 *
 * **La boucle ne tourne que pendant une partie** (`useFrameCallback`, sur le fil de l'interface), et
 * la physique est pure (physique.ts). Au repos, rien ne bouge et rien ne consomme. Sous « reduire les
 * animations », le jeu ne s'affiche pas : il n'existe que par le mouvement.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
    runOnJS,
    useAnimatedStyle,
    useFrameCallback,
    useReducedMotion,
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { tokens, type AppThemeType } from '../../theme/Theme';
import Translator from '../../i18n/Translator';
import { avancer, etatDeDepart, RAYON_DU_POINT, sauter, X_DU_POINT, type EtatDuJeu, type PhaseDuJeu } from './physique';

const HAUTEUR = 132;
/** La hauteur de l'horizon au-dessus du bas du dessin. */
const SOL = 30;
/** Le pas de la graduation de l'horizon : un trait tous les seize points. */
const PAS_DE_GRADUATION = 16;
const CLE_DU_RECORD = 'jeu.point.record';

/** Une cote du dessin, par son rang : sa position, sa hauteur et sa largeur viennent de l'etat. */
function CoteDessinee({ etat, rang, couleur }: { etat: SharedValue<EtatDuJeu>; rang: number; couleur: string }) {
    const style = useAnimatedStyle(() => {
        const cote = etat.value.cotes[rang];
        return cote === undefined
            ? { opacity: 0 }
            : { opacity: 1, height: cote.hauteur, width: cote.largeur, transform: [{ translateX: cote.x }] };
    });
    return (
        <Reanimated.View style={[styles.cote, style]}>
            <View style={[styles.buteeHaute, { backgroundColor: couleur }]} />
            <View style={[styles.barreGauche, { backgroundColor: couleur }]} />
            <View style={[styles.barreDroite, { backgroundColor: couleur }]} />
            <View style={[styles.buteeBasse, { backgroundColor: couleur }]} />
        </Reanimated.View>
    );
}

export function JeuDuPoint({ theme }: { theme: AppThemeType }) {
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

    const toucher = () => {
        if (etat.value.phase === 'chute') return;
        const depart = etat.value.phase === 'attente';
        etat.value = sauter(etat.value, largeur.value);
        if (depart) {
            setScore(0);
            setPhase('course');
            boucle.setActive(true);
        }
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    };

    const point = useAnimatedStyle(() => ({ transform: [{ translateY: -etat.value.y }] }));
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

    const encre = theme.fontSecondary;
    return (
        <Pressable
            onPressIn={toucher}
            onLayout={mesurer}
            accessibilityRole="button"
            accessibilityLabel={Translator.get('JEU_ACCESSIBILITE')}
            style={[styles.dessin, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}
        >
            <View style={styles.compteur} pointerEvents="none">
                <Text style={[styles.score, tokens.texte.chiffres, { color: theme.font }]}>{score}</Text>
                {record > 0 ? (
                    <Text style={[styles.record, tokens.texte.chiffres, { color: theme.fontTertiary }]}>
                        {Translator.get('JEU_RECORD', record)}
                    </Text>
                ) : null}
            </View>

            {phase === 'attente' ? (
                <Text style={[styles.consigne, { color: theme.fontSecondary }]} pointerEvents="none">
                    {Translator.get('JEU_CONSIGNE')}
                </Text>
            ) : null}

            <View style={[styles.horizon, { backgroundColor: theme.fontTertiary }]} pointerEvents="none" />
            <Reanimated.View style={[styles.graduation, graduation]} pointerEvents="none">
                {Array.from({ length: graduations }, (_, i) => (
                    <View key={i} style={[styles.trait, { backgroundColor: theme.fontTertiary }]} />
                ))}
            </Reanimated.View>

            {[0, 1, 2].map((rang) => <CoteDessinee key={rang} etat={etat} rang={rang} couleur={encre} />)}

            <Reanimated.View
                pointerEvents="none"
                style={[styles.point, { backgroundColor: phase === 'chute' ? theme.danger : theme.accent }, point]}
            />
        </Pressable>
    );
}

const EPAISSEUR = 2;

const styles = StyleSheet.create({
    dessin: {
        height: HAUTEUR,
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
        top: HAUTEUR / 2 - SOL,
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
        bottom: SOL - 6,
        flexDirection: 'row',
    },
    trait: {
        width: 1,
        height: 4,
        marginRight: PAS_DE_GRADUATION - 1,
        opacity: 0.5,
    },
    cote: {
        position: 'absolute',
        left: 0,
        bottom: SOL,
    },
    buteeHaute: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: EPAISSEUR,
    },
    buteeBasse: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: EPAISSEUR,
    },
    barreGauche: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '20%',
        width: EPAISSEUR,
    },
    barreDroite: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: '20%',
        width: EPAISSEUR,
    },
    // Le point du « i » : rond, comme sur le logo — un point d'etat, la seule forme ronde permise.
    point: {
        position: 'absolute',
        left: X_DU_POINT - RAYON_DU_POINT,
        bottom: SOL,
        width: RAYON_DU_POINT * 2,
        height: RAYON_DU_POINT * 2,
        borderRadius: RAYON_DU_POINT,
    },
});
