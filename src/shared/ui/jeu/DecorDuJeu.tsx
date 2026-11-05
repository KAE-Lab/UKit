/**
 * Le decor du jeu et ses obstacles, dessines au trait (7-J, deuxieme passe).
 *
 * Trois plans qui ne defilent pas a la meme vitesse, et c'est ce qui donne la profondeur : des
 * nuages presque immobiles, la silhouette du campus au tiers de la vitesse, l'horizon gradue et les
 * obstacles a la vitesse du personnage. Tout est au trait et dans les gris du theme : le decor ne
 * concurrence ni le personnage, seul en couleur, ni la page autour. La premiere passe n'avait qu'un
 * horizon et des cotes, « trop simpliste » (review du 2026-11-05).
 *
 * Chaque emplacement d'obstacle porte les quatre dessins, et seul celui du genre courant est visible :
 * le genre vit dans l'etat partage, sur le fil de l'interface, et changer d'enfant demanderait un
 * aller-retour par React a chaque obstacle qui renait.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import Reanimated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { decalageDuDecor, HAUTEUR_DU_DECOR, PERIODE_DU_DECOR, silhouetteDuCampus } from './decor';
import type { EtatDuJeu, GenreDObstacle } from './physique';

const SILHOUETTE = silhouetteDuCampus(3);
const TRAIT = 1.75;
/** Un nuage est un trait epais aux bouts arrondis : sa hauteur, et son arrondi qui en est la moitie. */
const NUAGE = 8;

export function Silhouette({ etat, couleur, sol }: { etat: SharedValue<EtatDuJeu>; couleur: string; sol: number }) {
    const glisse = useAnimatedStyle(() => ({ transform: [{ translateX: decalageDuDecor(etat.value.distance, 0.3) }] }));
    return (
        <Reanimated.View pointerEvents="none" style={[styles.silhouette, { bottom: sol }, glisse]}>
            <Svg width={PERIODE_DU_DECOR * 3} height={HAUTEUR_DU_DECOR + 8} viewBox={`0 -8 ${PERIODE_DU_DECOR * 3} ${HAUTEUR_DU_DECOR + 8}`}>
                <Path d={SILHOUETTE} fill={couleur} />
            </Svg>
        </Reanimated.View>
    );
}

/** Deux nuages qui passent lentement, et reviennent par la droite. */
export function Nuages({ etat, couleur, largeur }: { etat: SharedValue<EtatDuJeu>; couleur: string; largeur: SharedValue<number> }) {
    const premier = useAnimatedStyle(() => {
        const course = largeur.value + 120;
        return { transform: [{ translateX: course - ((etat.value.distance * 0.12 + 60) % course) - 60 }] };
    });
    const second = useAnimatedStyle(() => {
        const course = largeur.value + 120;
        return { transform: [{ translateX: course - ((etat.value.distance * 0.12 + 60 + course / 2) % course) - 60 }] };
    });
    return (
        <>
            <Reanimated.View pointerEvents="none" style={[styles.nuage, styles.nuageHaut, { backgroundColor: couleur }, premier]} />
            <Reanimated.View pointerEvents="none" style={[styles.nuage, styles.nuageBas, { backgroundColor: couleur }, second]} />
        </>
    );
}

function DessinDuGenre({ genre, couleur, accent }: { genre: GenreDObstacle; couleur: string; accent: string }) {
    if (genre === 'plot') {
        // Un plot de chantier : un triangle et sa bande, sur un socle.
        return (
            <Svg width={18} height={24} viewBox="0 0 18 24">
                <Path d="M9 1 L16 21 L2 21 Z" fill="none" stroke={couleur} strokeWidth={TRAIT} strokeLinejoin="round" />
                <Path d="M5.6 11 L12.4 11" stroke={accent} strokeWidth={TRAIT + 0.75} strokeLinecap="round" />
                <Path d="M0.5 23 L17.5 23" stroke={couleur} strokeWidth={TRAIT} strokeLinecap="round" />
            </Svg>
        );
    }
    if (genre === 'gobelet') {
        // Le gobelet du distributeur : le corps evase, le couvercle, une volute de vapeur.
        return (
            <Svg width={14} height={20} viewBox="0 0 14 20">
                <Path d="M2 7 L3.4 19 L10.6 19 L12 7 Z" fill="none" stroke={couleur} strokeWidth={TRAIT} strokeLinejoin="round" />
                <Path d="M1 7 L13 7" stroke={couleur} strokeWidth={TRAIT} strokeLinecap="round" />
                <Path d="M7 5 C5.5 3.5 8.5 2.5 7 0.8" fill="none" stroke={couleur} strokeWidth={1.25} strokeLinecap="round" opacity={0.7} />
            </Svg>
        );
    }
    if (genre === 'livres') {
        // Trois livres empiles ; le troisieme ne se voit que sur une pile haute (rogne sinon).
        return (
            <Svg width={24} height={33} viewBox="0 0 24 33">
                <Rect x={1} y={23} width={22} height={9} rx={1.5} fill="none" stroke={couleur} strokeWidth={TRAIT} />
                <Rect x={3} y={12.5} width={19} height={9} rx={1.5} fill="none" stroke={couleur} strokeWidth={TRAIT} />
                <Path d="M6 12.5 L6 21.5" stroke={accent} strokeWidth={TRAIT} />
                <Rect x={1.5} y={2} width={20} height={9} rx={1.5} fill="none" stroke={couleur} strokeWidth={TRAIT} />
            </Svg>
        );
    }
    return null;
}

/** La cote d'un plan : une barre, ses deux butees. Elle prend la taille de l'obstacle. */
function DessinDeCote({ couleur }: { couleur: string }) {
    return (
        <View style={StyleSheet.absoluteFill}>
            <View style={[styles.buteeHaute, { backgroundColor: couleur }]} />
            <View style={[styles.barreGauche, { backgroundColor: couleur }]} />
            <View style={[styles.barreDroite, { backgroundColor: couleur }]} />
            <View style={[styles.buteeBasse, { backgroundColor: couleur }]} />
        </View>
    );
}

const GENRES: readonly GenreDObstacle[] = ['plot', 'gobelet', 'livres', 'cote'];

function Variante({ etat, rang, genre, children }: { etat: SharedValue<EtatDuJeu>; rang: number; genre: GenreDObstacle; children: React.ReactNode }) {
    const visible = useAnimatedStyle(() => ({ opacity: etat.value.cotes[rang]?.genre === genre ? 1 : 0 }));
    return <Reanimated.View style={[StyleSheet.absoluteFill, styles.anclageBas, visible]}>{children}</Reanimated.View>;
}

export function Obstacle({ etat, rang, couleur, accent, sol }: { etat: SharedValue<EtatDuJeu>; rang: number; couleur: string; accent: string; sol: number }) {
    const boite = useAnimatedStyle(() => {
        const cote = etat.value.cotes[rang];
        return cote === undefined
            ? { opacity: 0 }
            : { opacity: 1, height: cote.hauteur, width: cote.largeur, transform: [{ translateX: cote.x }] };
    });
    return (
        <Reanimated.View pointerEvents="none" style={[styles.obstacle, { bottom: sol }, boite]}>
            {GENRES.map((genre) => (
                <Variante key={genre} etat={etat} rang={rang} genre={genre}>
                    {genre === 'cote' ? <DessinDeCote couleur={couleur} /> : <DessinDuGenre genre={genre} couleur={couleur} accent={accent} />}
                </Variante>
            ))}
        </Reanimated.View>
    );
}

const EPAISSEUR = 2;

const styles = StyleSheet.create({
    silhouette: {
        position: 'absolute',
        left: 0,
    },
    nuage: {
        position: 'absolute',
        left: 0,
        height: NUAGE,
        borderRadius: NUAGE / 2,
    },
    nuageHaut: {
        top: 22,
        width: 46,
    },
    nuageBas: {
        top: 40,
        width: 30,
    },
    obstacle: {
        position: 'absolute',
        left: 0,
        overflow: 'hidden',
    },
    anclageBas: {
        justifyContent: 'flex-end',
    },
    buteeHaute: { position: 'absolute', top: 0, left: 0, right: 0, height: EPAISSEUR },
    buteeBasse: { position: 'absolute', bottom: 0, left: 0, right: 0, height: EPAISSEUR },
    barreGauche: { position: 'absolute', top: 0, bottom: 0, left: '20%', width: EPAISSEUR },
    barreDroite: { position: 'absolute', top: 0, bottom: 0, right: '20%', width: EPAISSEUR },
});
