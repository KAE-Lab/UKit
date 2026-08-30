/**
 * Le pied d'action flottant, et le fond que tous les flottants du bas partagent.
 *
 * Une action qui survole le contenu — le bouton d'une annonce, la reservation d'une BU, la recherche
 * d'une liste, la barre d'onglets — parle d'une seule voix : un **objet pose** (surface ou bouton
 * plein, avec l'ombre partagee) sur une **fumee de flou** : le contenu transparait, floute, et le
 * flou fond dans le neant vers le haut.
 *
 * ## Comment la fumee est construite, et pourquoi comme ca
 *
 * Un **flou plein masque par un degrade** (`MaskedView`) : le masque est une colonne — degrade
 * transparent -> opaque sur `VOILE_PIED`, puis plein — donc le flou lui-meme s'estompe
 * continument, sans jamais avoir de bord. C'est la seule construction qui n'en montre pas : la
 * bande floue a bord dur montrait sa frontiere, le flou progressif par tranches montrait chacune
 * des siennes, et le voile de couleur seul n'etait pas une fumee — on veut voir le contenu floute,
 * pas une teinte (cinq formes essayees les 2026-08-30/31, celle-ci est la bonne). Un **leger voile**
 * du fond (~35 %) se pose par-dessus pour la lisibilite, en deux temps comme le masque.
 *
 * Android ne sait pas masquer un flou natif : il recoit le flou plein — son bord haut est adouci
 * par le voile — et c'est le compromis assume.
 *
 * Le voile part du fond a alpha `00`, jamais de `'transparent'` : ce dernier vaut
 * `rgba(0, 0, 0, 0)`, et l'interpolation traverse du noir — invisible en sombre, une salissure
 * grise en clair (`fondTransparent`). Dans le **masque**, en revanche, `'transparent'` est correct :
 * seul l'alpha compte.
 *
 * L'hote est absolu en bas de son parent : l'ecran degage son defilement d'autant —
 * `PIED_FLOTTANT_DEGAGEMENT` en pied de contenu, sans quoi la derniere section meurt sous la barre.
 */

import React, { useContext } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';

import { tokens } from '../theme/Theme';
import { AppContext } from '../services/AppCore';

/** Ce que l'ecran degage en pied de defilement pour que son contenu ne meure pas sous la barre. */
export const PIED_FLOTTANT_DEGAGEMENT = tokens.space.xxl + 80;

/** La hauteur de fumee au-dessus de l'objet pose : ce qui equilibre le degagement du dessous. */
export const VOILE_PIED = tokens.space.xl;

/**
 * Le fond de l'ecran a opacite nulle : le point de depart honnete d'un degrade.
 */
export function fondTransparent(couleur: string): string {
    return /^#[0-9a-f]{6}$/i.test(couleur) ? `${couleur}00` : couleur;
}

/**
 * La fumee : le fond partage de tout ce qui flotte en bas d'un ecran.
 *
 * Le flou masque, puis le voile leger — voir l'en-tete du fichier. A poser en `absoluteFill`
 * derriere le contenu d'un conteneur **relatif** ; `pointerEvents` est coupe, la fumee ne vole
 * aucun toucher.
 */
export function FondDePiedFlottant({ fond }: { fond: string }) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };

    const flou = (
        <BlurView
            intensity={45}
            tint={themeName === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
        />
    );

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Platform.OS === 'ios' ? (
                <MaskedView
                    style={StyleSheet.absoluteFill}
                    maskElement={(
                        <View style={styles.masque}>
                            <LinearGradient colors={['transparent', 'black']} style={{ height: VOILE_PIED }} />
                            <View style={styles.masquePlein} />
                        </View>
                    )}
                >
                    {flou}
                </MaskedView>
            ) : flou}

            {/* Le voile de lisibilite, leger (~35 %) : la fumee doit montrer le contenu floute, pas
                le teinter — mais un objet pose sur du flou nu manquait d'assise. */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient colors={[fondTransparent(fond), `${fond}59`]} style={{ height: VOILE_PIED }} />
                <View style={[styles.voilePlein, { backgroundColor: `${fond}59` }]} />
            </View>
        </View>
    );
}

export interface PiedFlottantProps {
    /** Le fond de la page hote : la fumee doit interpoler dans SA teinte. */
    fond: string;
    children: React.ReactNode;
}

export function PiedFlottant({ fond, children }: PiedFlottantProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.hote} pointerEvents="box-none">
            <FondDePiedFlottant fond={fond} />
            <View style={{
                // La fumee au-dessus de l'objet pose : c'est elle qui equilibre le degagement du
                // dessous — une bande qui commencait au ras du bouton cachait tout sous lui et rien
                // au-dessus.
                paddingTop: VOILE_PIED,
                paddingHorizontal: tokens.space.md,
                // L'assise de la barre d'onglets (`inset - 15`, plancher `sm`) : juge parfaite sur
                // appareil, elle fait loi pour tous les flottants. La zone sure entiere a ete
                // essayee — les objets remontaient trop et laissaient un trou dessous.
                paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15),
            }}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    hote: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    voilePlein: {
        flex: 1,
    },
    masque: {
        flex: 1,
    },
    masquePlein: {
        flex: 1,
        backgroundColor: 'black',
    },
});
