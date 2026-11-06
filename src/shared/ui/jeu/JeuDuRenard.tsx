/**
 * Encre, le petit jeu : de quoi occuper le pouce pendant que l'universite repond (jalon 7-J), et
 * jouable quand on veut au fond de « A propos ».
 *
 * Un renard a l'echarpe bleue court devant des montagnes et saute ce que la foret pose sur son
 * chemin (encre.ts pour les dessins, physique.ts pour la course, `DecorEncre` et `RenardDuJeu` pour
 * le rendu). La regle tient en un mot, « Touche pour sauter » ; une chute secoue le plateau et remet
 * le compteur a zero apres une courte pause, le record se garde sur l'appareil. Le jeu ne retient
 * personne : l'ecran de connexion qui le porte s'efface a l'arrivee du dossier, partie en cours ou non.
 *
 * **Un appui n'importe ou fait sauter**, hors des boutons : le jeu expose `sauter` par une poignee
 * (`CommandeDuJeu`), et l'ecran qui le porte l'appelle de partout.
 *
 * **La boucle ne tourne que pendant une partie** (`useFrameCallback`, sur le fil de l'interface), et
 * la physique est pure. Au repos, seul le clin d'oeil du renard bouge. Sous « reduire les
 * animations », le jeu ne s'affiche pas pendant la connexion ; ouvert expres (`toujours`), il joue,
 * sans secousse ni clin d'oeil.
 */

import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useFrameCallback,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { tokens, type AppThemeType } from '../../theme/Theme';
import { AppContext } from '../../services/AppCore';
import Translator from '../../i18n/Translator';
import { MONTAGNES, PIXEL } from './encre';
import { avancer, etatDeDepart, sauter, type EtatDuJeu, type PhaseDuJeu } from './physique';
import { DecorEncre, ObstacleEncre, type EncresDuDecor } from './DecorEncre';
import { RenardDuJeu } from './RenardDuJeu';
import type { Encres } from './SpritePixel';

/** La ligne de course, au-dessus du bas du plateau : la place des graviers sous elle. */
const SOL = PIXEL * 7;
/** Le record d'Encre : une autre cle que celle du jeu du point, dont les scores ne se comparent pas. */
const CLE_DU_RECORD = 'jeu.renard.record';
/** Le clin d'oeil du renard qui attend : ouvert presque trois secondes, ferme le temps d'un battement. */
const CLIN = { ouvert: 2600, ferme: 140 } as const;
/**
 * La hauteur pour laquelle la scene est dessinee. Un plateau plus haut l'agrandit d'autant (l'ecran
 * du jeu), sans toucher a la physique, qui compte en points de scene ; un plateau plus bas la garde a
 * l'echelle 1 (le parcours froid, 150 points). Sans elle, l'ecran du jeu montrait un renard minuscule
 * sous un ciel vide.
 */
const HAUTEUR_DE_SCENE = 210;
/**
 * La largeur de scene minimale : en dessous, un obstacle traverserait le plateau en moins d'une
 * seconde, et le jeu se jouerait aux reflexes plutot qu'au rythme.
 */
const LARGEUR_DE_SCENE = 280;

function echelleDu(hauteur: number, largeur: number): number {
    return Math.max(1, Math.min(hauteur / HAUTEUR_DE_SCENE, largeur / LARGEUR_DE_SCENE));
}
/** La secousse d'une chute : quelques points, trois allers-retours. */
const SECOUSSE = { ampleur: PIXEL * 2, duree: 45 } as const;

export interface CommandeDuJeu {
    /** Un saut, ou le depart d'une partie : ce que fait un toucher. */
    sauter: () => void;
}

function encresDu(theme: AppThemeType): { trait: Encres; decor: EncresDuDecor } {
    const trait: Encres = { '#': theme.font, '+': theme.fontTertiary, o: theme.cardBackground, s: theme.accent };
    return {
        trait,
        decor: {
            trait,
            ciel: `${theme.fontTertiary}59`,
            montagnes: `${theme.fontTertiary}24`,
            collines: `${theme.fontTertiary}3D`,
            sapins: `${theme.fontTertiary}73`,
        },
    };
}

/**
 * Le record, lu une fois et ecrit quand une chute le bat : la seule memoire du jeu. Il passe par une
 * ref : la chute arrive de la boucle d'images, dont la fermeture peut dater d'avant la lecture, et un
 * record lu dans l'etat y vaudrait encore zero.
 *
 * `proposer` rend vrai quand un record existant tombe : le tout premier score n'en bat aucun.
 */
function useRecord(): [number, (points: number) => boolean] {
    const [record, setRecord] = useState(0);
    const connu = useRef(0);
    useEffect(() => {
        AsyncStorage.getItem(CLE_DU_RECORD)
            .then((brut) => {
                if (brut === null || !Number.isFinite(Number(brut))) return;
                connu.current = Math.max(connu.current, Number(brut));
                setRecord(connu.current);
            })
            .catch(() => undefined);
    }, []);
    const proposer = useCallback((points: number) => {
        const ancien = connu.current;
        if (points <= ancien) return false;
        connu.current = points;
        setRecord(points);
        void AsyncStorage.setItem(CLE_DU_RECORD, String(points)).catch(() => undefined);
        return ancien > 0;
    }, []);
    return [record, proposer];
}

/** Le score en haut a droite, et dessous le record, ou l'annonce qu'il vient de tomber. */
function Compteur({ score, record, nouveauRecord, theme }: { score: number; record: number; nouveauRecord: boolean; theme: AppThemeType }) {
    return (
        <View style={styles.compteur} pointerEvents="none">
            <Text style={[styles.score, tokens.texte.chiffres, { color: theme.font }]}>{score}</Text>
            {nouveauRecord ? (
                <Text style={[styles.record, { color: theme.accent }]}>{Translator.get('JEU_NOUVEAU_RECORD')}</Text>
            ) : record > 0 ? (
                <Text style={[styles.record, tokens.texte.chiffres, { color: theme.fontTertiary }]}>{Translator.get('JEU_RECORD', record)}</Text>
            ) : null}
        </View>
    );
}

export const JeuDuRenard = forwardRef<CommandeDuJeu, {
    theme: AppThemeType;
    hauteur?: number;
    /** Ouvert expres (l'ecran du jeu) : il s'affiche meme sous « reduire les animations ». */
    toujours?: boolean;
}>(function JeuDuRenard({ theme, hauteur = 150, toujours = false }, poignee) {
    const { themeName } = useContext(AppContext) as { themeName?: 'light' | 'dark' };
    const mouvementReduit = useReducedMotion();
    const largeur = useSharedValue(320);
    const etat = useSharedValue<EtatDuJeu>(etatDeDepart(320));
    const cligne = useSharedValue(0);
    const secousse = useSharedValue(0);
    const [score, setScore] = useState(0);
    const [phase, setPhase] = useState<PhaseDuJeu>('attente');
    const [nouveauRecord, setNouveauRecord] = useState(false);
    const [largeurVue, setLargeurVue] = useState(320);
    const [echelle, setEchelle] = useState(1);
    const [record, proposer] = useRecord();

    const surChute = useCallback((points: number) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        setNouveauRecord(proposer(points));
        if (!mouvementReduit) {
            secousse.value = withSequence(
                ...[1, -1, 1, -1, 0].map((sens) => withTiming(sens * SECOUSSE.ampleur, { duration: SECOUSSE.duree })),
            );
        }
    }, [proposer, mouvementReduit, secousse]);

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

    // Au repos, la boucle s'arrete et le renard cligne de l'oeil ; en course, il a les yeux ouverts.
    useEffect(() => {
        if (phase === 'attente') boucle.setActive(false);
        if (phase === 'attente' && !mouvementReduit) {
            cligne.value = withRepeat(withSequence(
                withDelay(CLIN.ouvert, withTiming(1, { duration: 0 })),
                withDelay(CLIN.ferme, withTiming(0, { duration: 0 })),
            ), -1);
        } else {
            cancelAnimation(cligne);
            cligne.value = 0;
        }
    }, [phase, boucle, cligne, mouvementReduit]);

    const toucher = useCallback(() => {
        if (etat.value.phase === 'chute') return;
        const depart = etat.value.phase === 'attente';
        etat.value = sauter(etat.value, largeur.value);
        if (depart) {
            setScore(0);
            setNouveauRecord(false);
            setPhase('course');
            boucle.setActive(true);
        }
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }, [etat, largeur, boucle]);

    useImperativeHandle(poignee, () => ({ sauter: toucher }), [toucher]);

    const tremble = useAnimatedStyle(() => ({ transform: [{ translateX: secousse.value }] }));

    const mesurer = (evenement: LayoutChangeEvent) => {
        const agrandie = echelleDu(hauteur, evenement.nativeEvent.layout.width);
        const l = evenement.nativeEvent.layout.width / agrandie;
        setEchelle(agrandie);
        largeur.value = l;
        etat.value = etatDeDepart(l);
        setLargeurVue(l);
    };

    if (mouvementReduit && !toujours) return null;

    const { trait, decor } = encresDu(theme);
    const sombre = themeName === 'dark';
    return (
        <Pressable
            onPressIn={toucher}
            onLayout={mesurer}
            accessibilityRole="button"
            accessibilityLabel={Translator.get('JEU_ACCESSIBILITE')}
            style={[styles.plateau, { height: hauteur, backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}
        >
            <View
                pointerEvents="none"
                style={[styles.scene, { width: largeurVue, height: hauteur / echelle, transform: [{ scale: echelle }] }]}
            >
                <Reanimated.View style={[StyleSheet.absoluteFill, tremble]}>
                    <DecorEncre etat={etat} largeur={largeurVue} hauteur={hauteur / echelle} sol={SOL} sombre={sombre} encres={decor} />
                    {[0, 1, 2].map((rang) => <ObstacleEncre key={rang} etat={etat} rang={rang} sol={SOL} encres={trait} />)}
                    <RenardDuJeu etat={etat} cligne={cligne} encres={trait} sol={SOL} />
                </Reanimated.View>
            </View>

            <Compteur score={score} record={record} nouveauRecord={nouveauRecord} theme={theme} />

            {phase === 'attente' ? (
                <Text style={[styles.consigne, { color: theme.fontSecondary, bottom: (SOL + (MONTAGNES.hauteur + 4) * PIXEL) * echelle }]} pointerEvents="none">
                    {Translator.get('JEU_CONSIGNE')}
                </Text>
            ) : null}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    plateau: {
        alignSelf: 'stretch',
        borderRadius: tokens.radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    // Agrandie depuis son coin bas gauche : la ligne de course reste a sa place dans le plateau.
    scene: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        transformOrigin: 'left bottom',
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
});
