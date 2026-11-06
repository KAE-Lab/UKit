/**
 * Encre, le petit jeu : de quoi occuper le pouce pendant que l'universite repond (jalon 7-J), et
 * jouable quand on veut au fond de « A propos ».
 *
 * Un renard a l'echarpe bleue court devant des montagnes et saute ce que la foret pose sur son
 * chemin (encre.ts pour les dessins, physique.ts pour la course, `DecorEncre` et `RenardDuJeu` pour
 * le rendu). Ce composant ne fait que dessiner : la partie, son geste et son record vivent dans
 * `usePartieDuRenard`, que l'ecran hote cree pour poser le geste sur la zone qu'il rend jouable.
 *
 * La consigne tient en une ligne, « Touche pour sauter » ; tenir le doigt fait sauter plus haut,
 * glisser vers le bas fait se baisser (l'ecran du jeu le dit sous le plateau). Une chute secoue le
 * plateau et remet le compteur a zero apres une courte pause.
 *
 * Sous « reduire les animations », le jeu ne s'affiche pas pendant la connexion ; ouvert expres, il
 * joue, sans secousse ni clin d'oeil.
 */

import React, { useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../../theme/Theme';
import { AppContext } from '../../services/AppCore';
import Translator from '../../i18n/Translator';
import { MONTAGNES, PIXEL } from './encre';
import { DecorEncre, ObstacleEncre, type EncresDuDecor } from './DecorEncre';
import { RenardDuJeu } from './RenardDuJeu';
import type { Encres } from './SpritePixel';
import type { PartieDuRenard } from './usePartieDuRenard';

/** La ligne de course, au-dessus du bas du plateau : la place des graviers sous elle. */
const SOL = PIXEL * 7;
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

export function JeuDuRenard({ partie, theme, hauteur = 150 }: { partie: PartieDuRenard; theme: AppThemeType; hauteur?: number }) {
    const { themeName } = useContext(AppContext) as { themeName?: 'light' | 'dark' };
    const [largeurVue, setLargeurVue] = useState(320);
    const [echelle, setEchelle] = useState(1);
    // Les encres ne changent qu'avec le theme : de nouveaux objets a chaque point marque feraient
    // redessiner tous les sprites memorises.
    const { trait, decor } = useMemo(() => encresDu(theme), [theme]);
    // Un worklet ne capture que la valeur partagee : l'objet `partie` porte le geste, qui ne se copie
    // pas sur le fil de l'interface.
    const { secousse } = partie;
    const tremble = useAnimatedStyle(() => ({ transform: [{ translateX: secousse.value }] }));

    const mesurer = (evenement: LayoutChangeEvent) => {
        const agrandie = echelleDu(hauteur, evenement.nativeEvent.layout.width);
        const l = evenement.nativeEvent.layout.width / agrandie;
        setEchelle(agrandie);
        setLargeurVue(l);
        partie.mesurer(l);
    };

    if (!partie.visible) return null;

    return (
        <View
            onLayout={mesurer}
            accessible
            accessibilityRole="button"
            accessibilityLabel={Translator.get('JEU_ACCESSIBILITE')}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={partie.sauterUneFois}
            style={[styles.plateau, { height: hauteur, backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}
        >
            <View
                pointerEvents="none"
                style={[styles.scene, { width: largeurVue, height: hauteur / echelle, transform: [{ scale: echelle }] }]}
            >
                <Reanimated.View style={[StyleSheet.absoluteFill, tremble]}>
                    <DecorEncre etat={partie.etat} largeur={largeurVue} hauteur={hauteur / echelle} sol={SOL} sombre={themeName === 'dark'} encres={decor} />
                    {[0, 1, 2].map((rang) => <ObstacleEncre key={rang} etat={partie.etat} rang={rang} sol={SOL} encres={trait} />)}
                    <RenardDuJeu etat={partie.etat} cligne={partie.cligne} encres={trait} sol={SOL} />
                </Reanimated.View>
            </View>

            <Compteur score={partie.score} record={partie.record} nouveauRecord={partie.nouveauRecord} theme={theme} />

            {partie.phase === 'attente' ? (
                <Text style={[styles.consigne, { color: theme.fontSecondary, bottom: (SOL + (MONTAGNES.hauteur + 4) * PIXEL) * echelle }]} pointerEvents="none">
                    {Translator.get('JEU_CONSIGNE')}
                </Text>
            ) : null}
        </View>
    );
}

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
