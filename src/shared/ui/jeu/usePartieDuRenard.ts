/**
 * La partie d'Encre : son etat, sa boucle, son record, et le geste qui la commande (7-J, troisieme
 * passe). Le jeu (`JeuDuRenard`) ne fait que la dessiner ; l'ecran qui le porte pose le geste sur la
 * zone qu'il veut rendre jouable, souvent la page entiere :
 *
 * ```tsx
 * const partie = usePartieDuRenard({ toujours: true });
 * <GestureDetector gesture={partie.geste}><View>… <JeuDuRenard partie={partie} … /></View></GestureDetector>
 * ```
 *
 * **Le geste vit sur le fil de l'interface.** Le doigt qui se pose lance le saut dans le meme
 * worklet que la boucle d'images lit : aucun aller-retour par JavaScript entre l'appui et le saut.
 * Les trois ecrans passaient par un `Pressable` ou un repondeur, donc par le fil JavaScript, plus
 * lent en developpement : la cause probable du retard ressenti a la review du 2026-11-06. Le geste ne s'active
 * jamais : il ecoute les doigts sans prendre la main aux boutons, au defilement ni au glissement
 * entre onglets.
 *
 * Seul le depart d'une partie repasse par JavaScript, pour allumer la boucle : au repos, rien ne
 * tourne.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
    cancelAnimation,
    runOnJS,
    useFrameCallback,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { PIXEL } from './encre';
import { appuyer, avancer, baisser, etatDeDepart, relacher, type EtatDuJeu, type PhaseDuJeu } from './physique';

/** Le record d'Encre : une autre cle que celle du jeu du point, dont les scores ne se comparent pas. */
const CLE_DU_RECORD = 'jeu.renard.record';
/** Le clin d'oeil du renard qui attend : ouvert presque trois secondes, ferme le temps d'un battement. */
const CLIN = { ouvert: 2600, ferme: 140 } as const;
/** La secousse d'une chute : quelques points, trois allers-retours. */
const SECOUSSE = { ampleur: PIXEL * 2, duree: 45 } as const;
/** La course du doigt vers le bas qui fait baisser le renard, en points. */
const SEUIL_DU_GLISSEMENT = 14;

export interface PartieDuRenard {
    etat: SharedValue<EtatDuJeu>;
    cligne: SharedValue<number>;
    secousse: SharedValue<number>;
    /** A poser sur la zone jouable, par un `GestureDetector`. */
    geste: ReturnType<typeof Gesture.Manual>;
    score: number;
    record: number;
    nouveauRecord: boolean;
    phase: PhaseDuJeu;
    /** Faux sous « reduire les animations », hors de l'ecran du jeu : le jeu ne s'affiche pas. */
    visible: boolean;
    /** La largeur de la scene, en points de scene, a la mesure du plateau. */
    mesurer: (largeur: number) => void;
    /** Un saut bref, pour les lecteurs d'ecran, qui activent sans geste. */
    sauterUneFois: () => void;
}

/**
 * Le record, lu une fois et ecrit quand une chute le bat : la seule memoire du jeu. Il passe par une
 * ref : la chute arrive de la boucle d'images, dont la fermeture peut dater d'avant la lecture.
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

/** Le clin d'oeil du renard au repos ; en course, il a les yeux ouverts. */
function useClin(cligne: SharedValue<number>, auRepos: boolean) {
    useEffect(() => {
        if (auRepos) {
            cligne.value = withRepeat(withSequence(
                withDelay(CLIN.ouvert, withTiming(1, { duration: 0 })),
                withDelay(CLIN.ferme, withTiming(0, { duration: 0 })),
            ), -1);
        } else {
            cancelAnimation(cligne);
            cligne.value = 0;
        }
    }, [cligne, auRepos]);
}

function vibrer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function usePartieDuRenard({ toujours = false, actif = true }: {
    /** Ouvert expres (l'ecran du jeu) : il s'affiche meme sous « reduire les animations ». */
    toujours?: boolean;
    /** Faux quand la zone ne doit pas jouer (le formulaire de connexion, hors session). */
    actif?: boolean;
} = {}): PartieDuRenard {
    const mouvementReduit = useReducedMotion();
    const visible = toujours || !mouvementReduit;
    const largeur = useSharedValue(320);
    const etat = useSharedValue<EtatDuJeu>(etatDeDepart(320));
    const cligne = useSharedValue(0);
    const secousse = useSharedValue(0);
    const depart = useSharedValue(0);
    const [score, setScore] = useState(0);
    const [phase, setPhase] = useState<PhaseDuJeu>('attente');
    const [nouveauRecord, setNouveauRecord] = useState(false);
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

    // Revenue au repos apres une chute, la boucle s'arrete : rien ne tourne entre deux parties.
    useEffect(() => {
        if (phase === 'attente') boucle.setActive(false);
    }, [phase, boucle]);
    useClin(cligne, phase === 'attente' && !mouvementReduit);

    const demarrer = useCallback(() => {
        setScore(0);
        setNouveauRecord(false);
        setPhase('course');
        boucle.setActive(true);
    }, [boucle]);

    const geste = useMemo(() => Gesture.Manual()
        .enabled(actif && visible)
        .onTouchesDown((evenement) => {
            const doigt = evenement.changedTouches[0];
            if (doigt === undefined) return;
            depart.value = doigt.absoluteY;
            const avant = etat.value;
            const apres = appuyer(avant, largeur.value);
            if (apres === avant) return;
            etat.value = apres;
            if (avant.phase === 'attente') runOnJS(demarrer)();
            runOnJS(vibrer)();
        })
        .onTouchesMove((evenement) => {
            const doigt = evenement.allTouches[0];
            if (doigt !== undefined && doigt.absoluteY - depart.value > SEUIL_DU_GLISSEMENT) etat.value = baisser(etat.value);
        })
        .onTouchesUp(() => { etat.value = relacher(etat.value); })
        .onFinalize(() => { etat.value = relacher(etat.value); }),
    [actif, visible, depart, etat, largeur, demarrer]);

    const mesurer = useCallback((l: number) => {
        largeur.value = l;
        etat.value = etatDeDepart(l);
    }, [largeur, etat]);

    const sauterUneFois = useCallback(() => {
        const avant = etat.value;
        etat.value = relacher(appuyer(avant, largeur.value));
        if (avant.phase === 'attente') demarrer();
    }, [etat, largeur, demarrer]);

    return { etat, cligne, secousse, geste, score, record, nouveauRecord, phase, visible, mesurer, sauterUneFois };
}
