/**
 * Le decor d'Encre, du plus lointain au plus proche (7-J, troisieme passe).
 *
 * Quatre plans qui ne defilent pas a la meme vitesse, et c'est ce qui donne la profondeur : les
 * nuages presque immobiles, les montagnes, les collines, les sapins, puis le sol a la vitesse du
 * renard. Plus un plan est loin, plus son encre est pale : la perspective de l'air, a deux encres.
 * Le ciel dit le theme : le soleil en clair, la lune et quelques etoiles en sombre.
 *
 * Chaque plan est une periode repetee autant de fois que le plateau la demande, decalee sur le fil
 * de l'interface : React ne redessine rien pendant la course.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Reanimated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import {
    CAILLOU, CHOUETTE_BAS, CHOUETTE_HAUT, COLLINES, LIGNE_DU_SOL, LUNE, MONTAGNES, NUAGE, PIXEL, profilDeCollines,
    profilDeMontagnes, ROCHER, SAPIN, SOLEIL, SOUCHE, tailleDe, TUILE_DU_SOL, type Grille,
} from './encre';
import { FORMES, type EtatDuJeu, type GenreDObstacle } from './physique';
import { SpritePixel, type Encres } from './SpritePixel';

const MONTAGNES_TRACE = profilDeMontagnes();
const COLLINES_TRACE = profilDeCollines();
const TUILE = tailleDe(TUILE_DU_SOL);
/** La largeur d'un nuage, en points : calculee ici, un worklet ne peut pas appeler `tailleDe`. */
const LARGEUR_DU_NUAGE = tailleDe(NUAGE).largeur * PIXEL;
/** Les sapins d'une periode : leur abscisse, en pixels de jeu, sur une bande de `BOSQUET`. */
const BOSQUET = 74;
const SAPINS: readonly number[] = [6, 19, 47];
/** Les etoiles du theme sombre, en fractions du plateau : fixes, elles ne defilent pas. */
const ETOILES: readonly (readonly [number, number])[] = [[0.08, 0.12], [0.23, 0.3], [0.41, 0.08], [0.56, 0.22], [0.71, 0.1], [0.9, 0.28], [0.33, 0.18]];

/** Le decalage d'un plan qui defile au `facteur` de la vitesse, ramene dans sa periode. */
function decalage(distance: number, facteur: number, periode: number): number {
    'worklet';
    return -((distance * facteur) % periode);
}

function copiesPour(largeur: number, periode: number): number {
    return Math.ceil(largeur / periode) + 1;
}

/** Une encre unie pour tous les symboles : la silhouette d'un plan lointain. */
function unie(couleur: string): Encres {
    return { '#': couleur, '+': couleur, o: couleur, s: couleur };
}

function Plan({ etat, facteur, periode, largeur, bas, children }: {
    etat: SharedValue<EtatDuJeu>; facteur: number; periode: number; largeur: number; bas: number;
    children: (rang: number) => React.ReactNode;
}) {
    const glisse = useAnimatedStyle(() => ({ transform: [{ translateX: decalage(etat.value.distance, facteur, periode) }] }));
    return (
        <Reanimated.View pointerEvents="none" style={[styles.plan, { bottom: bas }, glisse]}>
            {Array.from({ length: copiesPour(largeur, periode) }, (_, rang) => children(rang))}
        </Reanimated.View>
    );
}

function Profil({ trace, periode, hauteur, couleur }: { trace: string; periode: number; hauteur: number; couleur: string }) {
    return (
        <Svg width={periode * PIXEL} height={hauteur * PIXEL} viewBox={`0 0 ${periode} ${hauteur}`}>
            <Path d={trace} fill={couleur} />
        </Svg>
    );
}

function Bosquet({ couleur }: { couleur: string }) {
    return (
        <View style={styles.bosquet}>
            {SAPINS.map((x) => (
                <View key={x} style={[styles.sapin, { left: x * PIXEL }]}>
                    <SpritePixel grille={SAPIN} encres={unie(couleur)} />
                </View>
            ))}
        </View>
    );
}

/** Deux nuages qui passent lentement, et reviennent par la droite. */
function Nuage({ etat, largeur, haut, avance, encres }: { etat: SharedValue<EtatDuJeu>; largeur: number; haut: number; avance: number; encres: Encres }) {
    const course = largeur + LARGEUR_DU_NUAGE * 2;
    const glisse = useAnimatedStyle(() => ({
        transform: [{ translateX: course - ((etat.value.distance * 0.06 + avance * course) % course) - LARGEUR_DU_NUAGE }],
    }));
    return (
        <Reanimated.View pointerEvents="none" style={[styles.nuage, { top: haut }, glisse]}>
            <SpritePixel grille={NUAGE} encres={encres} />
        </Reanimated.View>
    );
}

export interface EncresDuDecor {
    trait: Encres;
    ciel: string;
    montagnes: string;
    collines: string;
    sapins: string;
}

export function DecorEncre({ etat, largeur, hauteur, sol, sombre, encres }: {
    etat: SharedValue<EtatDuJeu>; largeur: number; hauteur: number; sol: number; sombre: boolean; encres: EncresDuDecor;
}) {
    const nuages = unie(encres.ciel);
    return (
        <>
            {sombre ? ETOILES.map(([x, y]) => (
                <View key={`${x}`} pointerEvents="none" style={[styles.etoile, { left: x * largeur, top: y * (hauteur - sol), backgroundColor: encres.ciel }]} />
            )) : null}
            <View pointerEvents="none" style={styles.astre}>
                <SpritePixel grille={sombre ? LUNE : SOLEIL} encres={sombre ? unie(encres.ciel) : { ...encres.trait, '#': encres.ciel, '+': encres.ciel }} />
            </View>
            <Nuage etat={etat} largeur={largeur} haut={PIXEL * 9} avance={0.15} encres={nuages} />
            <Nuage etat={etat} largeur={largeur} haut={PIXEL * 17} avance={0.62} encres={nuages} />

            <Plan etat={etat} facteur={0.15} periode={MONTAGNES.periode * PIXEL} largeur={largeur} bas={sol}>
                {(rang) => <Profil key={rang} trace={MONTAGNES_TRACE} periode={MONTAGNES.periode} hauteur={MONTAGNES.hauteur} couleur={encres.montagnes} />}
            </Plan>
            <Plan etat={etat} facteur={0.3} periode={COLLINES.periode * PIXEL} largeur={largeur} bas={sol}>
                {(rang) => <Profil key={rang} trace={COLLINES_TRACE} periode={COLLINES.periode} hauteur={COLLINES.hauteur} couleur={encres.collines} />}
            </Plan>
            <Plan etat={etat} facteur={0.45} periode={BOSQUET * PIXEL} largeur={largeur} bas={sol}>
                {(rang) => <Bosquet key={rang} couleur={encres.sapins} />}
            </Plan>
            {/* Le sol, a la vitesse du renard : la tuile descend sous la ligne de course. */}
            <Plan etat={etat} facteur={1} periode={TUILE.largeur * PIXEL} largeur={largeur} bas={sol - (TUILE.hauteur - LIGNE_DU_SOL) * PIXEL}>
                {(rang) => <SpritePixel key={rang} grille={TUILE_DU_SOL} encres={encres.trait} />}
            </Plan>
            {/* La ligne elle-meme, continue : sur les tuiles agrandies, un raccord se voyait a chaque periode. */}
            <View pointerEvents="none" style={[styles.ligne, { bottom: sol - PIXEL, backgroundColor: encres.trait['#'] }]} />
        </>
    );
}

const VARIANTES: readonly { cle: string; genre: GenreDObstacle; grilles: readonly Grille[]; aile?: 0 | 1 }[] = [
    { cle: 'caillou', genre: 'caillou', grilles: [CAILLOU] },
    { cle: 'rocher', genre: 'rocher', grilles: [ROCHER] },
    { cle: 'souche', genre: 'souche', grilles: [SOUCHE] },
    { cle: 'souches', genre: 'souches', grilles: [SOUCHE, SOUCHE] },
    { cle: 'chouette-haut', genre: 'chouette', grilles: [CHOUETTE_HAUT], aile: 0 },
    { cle: 'chouette-bas', genre: 'chouette', grilles: [CHOUETTE_BAS], aile: 1 },
];
/** Le pas entre les deux souches d'une double, en pixels de jeu (physique.ts compte la meme boite). */
const PAS_DES_SOUCHES = 14;
/** La duree d'un battement d'ailes, en millisecondes. */
const BATTEMENT_MS = 170;

function Variante({ etat, rang, variante, encres }: { etat: SharedValue<EtatDuJeu>; rang: number; variante: (typeof VARIANTES)[number]; encres: Encres }) {
    const visible = useAnimatedStyle(() => {
        const obstacle = etat.value.obstacles[rang];
        const memeGenre = obstacle !== undefined && obstacle.genre === variante.genre;
        const memeAile = variante.aile === undefined || Math.floor(etat.value.temps / BATTEMENT_MS) % 2 === variante.aile;
        return { opacity: memeGenre && memeAile ? 1 : 0 };
    });
    return (
        <Reanimated.View style={[StyleSheet.absoluteFill, visible]}>
            {variante.grilles.map((grille, i) => (
                <View key={i} style={[styles.posee, { left: i * PAS_DES_SOUCHES * PIXEL }]}>
                    <SpritePixel grille={grille} encres={encres} />
                </View>
            ))}
        </Reanimated.View>
    );
}

export function ObstacleEncre({ etat, rang, sol, encres }: { etat: SharedValue<EtatDuJeu>; rang: number; sol: number; encres: Encres }) {
    const place = useAnimatedStyle(() => {
        const obstacle = etat.value.obstacles[rang];
        if (obstacle === undefined) return { opacity: 0 };
        return {
            opacity: 1,
            width: FORMES[obstacle.genre].sprite * PIXEL,
            transform: [{ translateX: obstacle.x }, { translateY: -obstacle.base * PIXEL }] as const,
        };
    });
    return (
        <Reanimated.View pointerEvents="none" style={[styles.obstacle, { bottom: sol }, place]}>
            {VARIANTES.map((variante) => <Variante key={variante.cle} etat={etat} rang={rang} variante={variante} encres={encres} />)}
        </Reanimated.View>
    );
}

const PLUS_HAUT = Math.max(...VARIANTES.flatMap((v) => v.grilles.map((g) => tailleDe(g).hauteur)));

const styles = StyleSheet.create({
    plan: {
        position: 'absolute',
        left: 0,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    bosquet: {
        width: BOSQUET * PIXEL,
        height: tailleDe(SAPIN).hauteur * PIXEL,
    },
    sapin: {
        position: 'absolute',
        bottom: 0,
    },
    nuage: {
        position: 'absolute',
        left: 0,
    },
    ligne: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: PIXEL,
    },
    etoile: {
        position: 'absolute',
        width: PIXEL,
        height: PIXEL,
    },
    astre: {
        position: 'absolute',
        top: PIXEL * 5,
        left: PIXEL * 8,
    },
    obstacle: {
        position: 'absolute',
        left: 0,
        height: PLUS_HAUT * PIXEL,
    },
    posee: {
        position: 'absolute',
        bottom: 0,
    },
});
