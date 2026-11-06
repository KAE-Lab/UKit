/**
 * Le renard a l'echarpe bleue : quatre images de course, un saut, une chute, et assis a l'attente,
 * qui cligne de l'oeil. Toutes les images sont montees, une seule visible : changer d'image ne coute
 * qu'une opacite, sur le fil de l'interface. A l'atterrissage, trois grains de poussiere.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { ASSIS, ASSIS_CLIGNE, CHUTE, COURSE_1, COURSE_2, COURSE_3, COURSE_4, PIXEL, SAUT, tailleDe, type Grille } from './encre';
import { X_DU_RENARD, type EtatDuJeu } from './physique';
import { SpritePixel, type Encres } from './SpritePixel';

const IMAGES: readonly Grille[] = [COURSE_1, COURSE_2, COURSE_3, COURSE_4, SAUT, CHUTE, ASSIS, ASSIS_CLIGNE];
const { largeur: LARGEUR, hauteur: HAUTEUR } = tailleDe(COURSE_1);
/** Une image de course tous les six pixels parcourus : la foulee suit la vitesse. */
const FOULEE = 6 * PIXEL;
/** La duree de la poussiere apres un atterrissage, en millisecondes. */
const POUSSIERE_MS = 320;

function ImageDuRenard({ rang, image, grille, encres }: { rang: number; image: SharedValue<number>; grille: Grille; encres: Encres }) {
    const visible = useAnimatedStyle(() => ({ opacity: image.value === rang ? 1 : 0 }));
    return (
        <Reanimated.View style={[StyleSheet.absoluteFill, visible]}>
            <SpritePixel grille={grille} encres={encres} />
        </Reanimated.View>
    );
}

function Grain({ etat, decalage, sens, couleur, sol }: { etat: SharedValue<EtatDuJeu>; decalage: number; sens: number; couleur: string; sol: number }) {
    const style = useAnimatedStyle(() => {
        const e = etat.value;
        const avance = Math.min(1, e.depuisLAtterrissage / POUSSIERE_MS);
        const visible = e.phase === 'course' && e.y === 0 && avance < 1;
        return {
            opacity: visible ? 1 - avance : 0,
            transform: [{ translateX: sens * avance * 4 * PIXEL }, { translateY: -avance * 2 * PIXEL }] as const,
        };
    });
    return <Reanimated.View pointerEvents="none" style={[styles.grain, { left: X_DU_RENARD + decalage * PIXEL, bottom: sol, backgroundColor: couleur }, style]} />;
}

export function RenardDuJeu({ etat, cligne, encres, sol }: { etat: SharedValue<EtatDuJeu>; cligne: SharedValue<number>; encres: Encres; sol: number }) {
    const image = useDerivedValue(() => {
        const e = etat.value;
        if (e.phase === 'chute') return 5;
        if (e.phase === 'attente') return cligne.value > 0.5 ? 7 : 6;
        if (e.y > 0) return 4;
        return Math.floor(e.distance / FOULEE) % 4;
    });
    const saut = useAnimatedStyle(() => ({ transform: [{ translateY: -etat.value.y }] }));
    return (
        <>
            <Reanimated.View pointerEvents="none" style={[styles.renard, { left: X_DU_RENARD, bottom: sol }, saut]}>
                {IMAGES.map((grille, rang) => <ImageDuRenard key={rang} rang={rang} image={image} grille={grille} encres={encres} />)}
            </Reanimated.View>
            <Grain etat={etat} decalage={7} sens={-1} couleur={encres['+']} sol={sol} />
            <Grain etat={etat} decalage={12} sens={-0.4} couleur={encres['+']} sol={sol} />
            <Grain etat={etat} decalage={19} sens={1} couleur={encres['+']} sol={sol} />
        </>
    );
}

const styles = StyleSheet.create({
    renard: {
        position: 'absolute',
        width: LARGEUR * PIXEL,
        height: HAUTEUR * PIXEL,
    },
    grain: {
        position: 'absolute',
        width: PIXEL,
        height: PIXEL,
    },
});
