/**
 * Le renard a l'echarpe bleue : quatre temps de galop, deux temps baisse, un saut, une chute, et assis
 * a l'attente, qui cligne de l'oeil. A l'atterrissage, trois grains de poussiere.
 *
 * Toutes les images sont montees, une seule visible. Changer d'image ne coute qu'une opacite, et
 * Reanimated ne renvoie un style que s'il a change : a chaque image de jeu, deux vues au plus. Une
 * bande d'images decalee derriere une fenetre a ete essayee et ecartee : elle n'economise aucune
 * mise a jour, et les images cachees par la fenetre se dessinent quand meme, celles a opacite nulle
 * non.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import {
    ASSIS, ASSIS_CLIGNE, BAISSE_1, BAISSE_2, CHUTE, COURSE_1, COURSE_2, COURSE_3, COURSE_4, PIXEL, SAUT, tailleDe, type Grille,
} from './encre';
import { X_DU_RENARD, type EtatDuJeu } from './physique';
import { SpritePixel, type Encres } from './SpritePixel';

const IMAGES: readonly Grille[] = [COURSE_1, COURSE_2, COURSE_3, COURSE_4, SAUT, CHUTE, ASSIS, ASSIS_CLIGNE, BAISSE_1, BAISSE_2];
const IMAGE = { saut: 4, chute: 5, assis: 6, cligne: 7, baisse: 8 } as const;
const { largeur: LARGEUR, hauteur: HAUTEUR } = tailleDe(COURSE_1);
/** Un temps de galop tous les cinq pixels parcourus : la foulee suit la vitesse. */
const FOULEE = 5 * PIXEL;
/** La duree de la poussiere apres un atterrissage, en millisecondes. */
const POUSSIERE_MS = 320;

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

function ImageDuRenard({ rang, image, grille, encres }: { rang: number; image: SharedValue<number>; grille: Grille; encres: Encres }) {
    const visible = useAnimatedStyle(() => ({ opacity: image.value === rang ? 1 : 0 }));
    return (
        <Reanimated.View style={[StyleSheet.absoluteFill, visible]}>
            <SpritePixel grille={grille} encres={encres} />
        </Reanimated.View>
    );
}

export const RenardDuJeu = memo(function RenardDuJeu({ etat, cligne, encres, sol }: {
    etat: SharedValue<EtatDuJeu>; cligne: SharedValue<number>; encres: Encres; sol: number;
}) {
    const image = useDerivedValue(() => {
        const e = etat.value;
        if (e.phase === 'chute') return IMAGE.chute;
        if (e.phase === 'attente') return cligne.value > 0.5 ? IMAGE.cligne : IMAGE.assis;
        if (e.y > 0) return IMAGE.saut;
        if (e.baisse) return IMAGE.baisse + (Math.floor(e.distance / FOULEE) % 2);
        return Math.floor(e.distance / FOULEE) % 4;
    });
    const saut = useAnimatedStyle(() => ({ transform: [{ translateY: -etat.value.y }] }));
    return (
        <>
            <Reanimated.View pointerEvents="none" style={[styles.renard, { left: X_DU_RENARD, bottom: sol }, saut]}>
                {IMAGES.map((grille, rang) => <ImageDuRenard key={rang} rang={rang} image={image} grille={grille} encres={encres} />)}
            </Reanimated.View>
            <Grain etat={etat} decalage={4} sens={-1} couleur={encres['+']} sol={sol} />
            <Grain etat={etat} decalage={8} sens={-0.4} couleur={encres['+']} sol={sol} />
            <Grain etat={etat} decalage={13} sens={1} couleur={encres['+']} sol={sol} />
        </>
    );
});

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
