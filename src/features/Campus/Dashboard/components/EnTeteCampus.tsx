/**
 * Le grand titre de l'onglet Campus et sa pastille d'etat de service, qui s'effacent au defilement.
 *
 * Sorti de `CampusDashboard` au jalon 7-I, et passe de l'`Animated` historique a Reanimated : le
 * defilement arrive par une valeur partagee, lue sur le fil de l'interface, et l'opacite ne traverse
 * plus le pont (docs/inventaire-mouvement.md, 5.13).
 *
 * Le titre s'efface sur les cinquante premiers points de defilement, comme ceux de la Scolarite et
 * des Reglages ; les ecrans pousses, sous `NavHelpers`, en prennent soixante. La divergence est
 * relevee (6.2) et se resout avec les lots de 7-J, pas ici.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import { PastilleService } from '../../../../shared/messages/PastilleService';

/** La course, en points, sur laquelle le titre s'efface. */
const COURSE_DU_TITRE = 50;

export interface EnTeteCampusProps {
    theme: AppThemeType;
    /** Le defilement du tableau de bord. */
    defilement: SharedValue<number>;
    /**
     * Sa valeur au repos : `-hauteur de l'en-tete` sur iOS, ou l'en-tete est un retrait du contenu,
     * zero sur Android, ou c'est un rembourrage (CampusDashboard).
     */
    repos: number;
    /** La zone sure du haut : le titre se pose dessous. */
    hautSur: number;
}

export function EnTeteCampus({ theme, defilement, repos, hautSur }: EnTeteCampusProps) {
    const efface = useAnimatedStyle(() => ({
        opacity: interpolate(defilement.value, [repos, repos + COURSE_DU_TITRE], [1, 0], Extrapolation.CLAMP),
    }));

    return (
        <Reanimated.View style={[styles.enTete, { paddingTop: hautSur }, efface]}>
            <View style={styles.rangee}>
                <Text style={[styles.titre, { color: theme.font }]}>{Translator.get('CAMPUS')}</Text>
                {/* La pastille d'etat de service, a droite du titre (shared/messages/PastilleService). */}
                <PastilleService theme={theme} onglet="Campus" style={styles.pastille} />
            </View>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    enTete: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    rangee: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
    },
    titre: {
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold,
        marginBottom: tokens.space.md,
    },
    // Poussee a droite, avec la meme marge basse que le titre : la pastille s'aligne sur sa ligne.
    pastille: {
        marginLeft: 'auto',
        marginBottom: tokens.space.md,
    },
});
