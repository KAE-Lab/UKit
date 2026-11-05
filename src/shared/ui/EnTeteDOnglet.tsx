/**
 * L'en-tete d'un onglet qui defile : le grand titre part avec le contenu, et une barre compacte prend
 * le relais quand il a disparu (jalon 7-J, 2026-11-05).
 *
 * **Le defaut qu'il corrige.** Le grand titre de Campus et des Reglages s'effacait sur place, et plus
 * rien ne protegeait ensuite la barre d'etat : le contenu s'ecrivait sous l'heure du telephone
 * (« 11:25 » sur « Restaurants », releve du 2026-11-05). La barre compacte porte desormais un fond, un
 * filet et le titre au centre, comme celle d'iOS.
 *
 * **Le fond de la barre est le fond de l'onglet**, pas un aplat : une copie de `FondDOnglet` rognee a
 * sa hauteur. Le haut de l'ecran ne change donc pas de couleur quand la barre parait ; le contenu
 * disparait simplement dessous. Les deux copies montent ensemble et glissent du meme pas.
 *
 * **Le titre suit le contenu au lieu de s'effacer sur place** : c'est ce qui permet a une page courte
 * de defiler un peu sans laisser un titre a moitie efface par-dessus le contenu, la raison pour
 * laquelle la Scolarite avait du rendre son en-tete collant.
 *
 * **Ce qui ne bouge pas** : l'element de droite (la pastille d'etat de service), centre sur la ligne
 * du grand titre comme sur celle de la barre — les deux ont la meme hauteur, si bien qu'il n'a pas a
 * changer de place.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../theme/Theme';
import { FondDOnglet } from './FondDOnglet';
import type { OngletAFond } from './fondDOnglet';

/** La hauteur de la rangee du grand titre, et celle de la barre compacte : la meme. */
export const HAUTEUR_DE_LA_BARRE = 56;

/** Le defilement, en points, au bout duquel le grand titre a disparu et la barre est pleine. */
const COURSE = { titre: 30, barre: [22, 46], titreCompact: [34, 52] } as const;

export interface EnTeteDOngletProps {
    theme: AppThemeType;
    onglet: OngletAFond;
    titre: string;
    /** Le defilement de la page, lu sur le fil de l'interface. */
    defilement: SharedValue<number>;
    /**
     * Sa valeur au repos : `-hauteur de l'en-tete` sur iOS, ou l'en-tete est un retrait du contenu
     * (`contentInset`), zero ailleurs, ou c'est un rembourrage.
     */
    repos: number;
    /** La zone sure du haut. */
    hautSur: number;
    /** Ce qui se pose a droite et ne bouge pas : la pastille d'etat de service. */
    droite?: React.ReactNode;
}

export function EnTeteDOnglet({ theme, onglet, titre, defilement, repos, hautSur, droite }: EnTeteDOngletProps) {
    const grandTitre = useAnimatedStyle(() => {
        const course = defilement.value - repos;
        return {
            opacity: interpolate(course, [0, COURSE.titre], [1, 0], Extrapolation.CLAMP),
            transform: [{ translateY: -course }],
        };
    });
    const barre = useAnimatedStyle(() => ({
        opacity: interpolate(defilement.value - repos, COURSE.barre, [0, 1], Extrapolation.CLAMP),
    }));
    const titreCompact = useAnimatedStyle(() => ({
        opacity: interpolate(defilement.value - repos, COURSE.titreCompact, [0, 1], Extrapolation.CLAMP),
    }));

    const hauteur = hautSur + HAUTEUR_DE_LA_BARRE;

    return (
        <View pointerEvents="box-none" style={[styles.enTete, { height: hauteur }]}>
            {/* La barre : le fond de l'onglet rogne, et son filet. Elle ne vole aucun toucher. */}
            <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, barre]}>
                <View style={[StyleSheet.absoluteFill, styles.rognage]}>
                    <FondDOnglet theme={theme} onglet={onglet} />
                </View>
                <View style={[styles.filet, { backgroundColor: theme.border }]} />
            </Reanimated.View>

            <Reanimated.View pointerEvents="none" style={[styles.rangee, { top: hautSur }, titreCompact]}>
                <Text numberOfLines={1} style={[tokens.texte.titreDeBarre, styles.titreCompact, { color: theme.font }]}>
                    {titre}
                </Text>
            </Reanimated.View>

            {/* Le grand titre glisse sous le bord haut de sa rangee, jamais sous l'heure du telephone :
                la boite qui le rogne commence sous la zone sure, et descend assez pour que le rebond
                du tirer ne le coupe pas par le bas. */}
            <View pointerEvents="none" style={[styles.rognageDuGrandTitre, { top: hautSur }]}>
                <Reanimated.View style={[styles.rangee, styles.rangeeDuGrandTitre, grandTitre]}>
                    <Text numberOfLines={1} style={[tokens.texte.grandTitre, { color: theme.font }]}>
                        {titre}
                    </Text>
                </Reanimated.View>
            </View>

            {droite !== undefined ? (
                <View pointerEvents="box-none" style={[styles.rangee, styles.droite, { top: hautSur }]}>
                    {droite}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    enTete: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    rognage: {
        overflow: 'hidden',
    },
    filet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: StyleSheet.hairlineWidth,
    },
    rangee: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: HAUTEUR_DE_LA_BARRE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space.md,
    },
    rognageDuGrandTitre: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: HAUTEUR_DE_LA_BARRE * 4,
        overflow: 'hidden',
    },
    rangeeDuGrandTitre: {
        top: 0,
        justifyContent: 'flex-start',
    },
    droite: {
        justifyContent: 'flex-end',
    },
    titreCompact: {
        // Le titre compact laisse la place de la pastille de chaque cote : centre, il ne la touche pas.
        marginHorizontal: tokens.space.xxl,
    },
});
