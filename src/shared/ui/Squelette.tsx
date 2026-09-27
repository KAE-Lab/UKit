/**
 * Le squelette d'un contenu qui charge : sa forme exacte, qu'un reflet balaie.
 *
 * **Un chargement annonce sa forme** (jalon 7-I, docs/theme.md). L'attente dans le flux etait un
 * indicateur qui ne tenait pas la place du contenu : rien pendant 300 ms, puis un disque de 84 points,
 * puis un carrousel de 285 — chaque section du tableau de bord Campus changeait deux fois de hauteur
 * et poussait tout ce qui etait dessous (docs/inventaire-mouvement.md, section 5). Un squelette parait
 * tout de suite, a la hauteur de ce qui viendra, et le contenu le remplace sans rien deplacer.
 *
 * Ce module ne dessine pas la forme : elle vient de l'appelant, **construite avec les memes
 * composants que le contenu** — `Card`, `MetaRow`, le titre d'une carte — en mode `masque`. C'est ce
 * qui garantit la hauteur exacte, dans toutes les tailles de texte, sans constante a tenir a jour.
 * Un squelette dessine a cote de sa carte finirait par en diverger.
 *
 * Il porte deux pieces :
 *
 * - `Squelette`, l'enveloppe : elle dit l'attente aux lecteurs d'ecran, et **sort en fondu** pendant
 *   que le contenu entre — Reanimated garde la vue qui sort a sa place, hors de la mise en page, le
 *   temps de son animation ; les deux se croisent au lieu de laisser un instant vide entre eux ;
 * - `Balayage`, le reflet, pose par l'appelant **dans chaque surface** qu'il doit parcourir : la
 *   surface le rogne a ses coins, et sa couleur (`theme.reflet`) est celle de la carte en clair, si
 *   bien qu'il ne se voit que sur les barres grises. La pulsation d'opacite a ete essayee (planche C)
 *   et ecartee au profit du reflet.
 */

import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../theme/Theme';
import { SORTIE } from './mouvement';

const { balayage } = tokens.mouvement;

export interface SqueletteProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    /** Ce qu'annonce un lecteur d'ecran : un squelette est une attente, et il le dit par sa phrase. */
    libelle: string;
}

export function Squelette({ children, style, libelle }: SqueletteProps) {
    return (
        <Reanimated.View
            style={style}
            exiting={SORTIE}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={libelle}
        >
            {children}
        </Reanimated.View>
    );
}

export interface BalayageProps {
    theme: AppThemeType;
    /** La largeur de la surface a parcourir : le reflet la traverse d'un bord a l'autre. */
    largeur: number;
}

/**
 * Le reflet d'un squelette : une bande qui traverse la surface de gauche a droite, en boucle.
 *
 * **Il disparait sous « reduire les animations »**. Reanimated applique ce reglage de lui-meme a une
 * animation finie ; une boucle, il la ferait sauter a sa valeur finale, et le reflet resterait fige
 * au bord de la carte. Il lit donc le reglage lui-meme, et le squelette reste une forme immobile.
 */
export function Balayage({ theme, largeur }: BalayageProps) {
    const mouvementReduit = useReducedMotion();
    const progression = useSharedValue(0);
    const bande = largeur * balayage.bande;

    useEffect(() => {
        if (mouvementReduit) return undefined;
        progression.value = withRepeat(
            withTiming(1, { duration: balayage.duree, easing: Easing.linear }),
            -1,
            false,
        );
        return () => cancelAnimation(progression);
    }, [mouvementReduit, progression]);

    const passage = useAnimatedStyle(() => ({
        transform: [{ translateX: -bande + progression.value * (largeur + bande) }],
    }));

    if (mouvementReduit) return null;

    // La bande est transparente a ses bords : `reflet` sans son canal alpha, puis a zero.
    const transparent = `${theme.reflet.slice(0, 7)}00`;
    return (
        <Reanimated.View pointerEvents="none" style={[styles.bande, { width: bande }, passage]}>
            <LinearGradient
                colors={[transparent, theme.reflet, transparent]}
                // Legerement incline, comme la lumiere qui passe sur une surface et non un rideau.
                start={{ x: 0, y: 0.4 }}
                end={{ x: 1, y: 0.6 }}
                style={StyleSheet.absoluteFill}
            />
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    bande: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
    },
});
