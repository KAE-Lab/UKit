/**
 * Un repas du jour, midi ou soir, sur une seule carte (7-J, deuxieme passe).
 *
 * La carte se lit comme celle qu'un restaurant affiche a l'entree : le nom du repas, puis chaque
 * categorie suivie de ses plats, un filet entre deux categories. Elle posait une carte par categorie,
 * un intertitre en petites capitales et, devant chaque plat, une icone devinee d'apres son nom :
 * « Steak ou poisson » prenait l'icone d'information pour son « ou », des carottes rapees la feuille
 * verte du vegetarien, et tout plat inconnu un rond. La typographie suffit, et elle ne se trompe pas.
 * La review du 2026-11-05 trouvait l'ecran identique a celui d'avant la refonte.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { tokens, type AppThemeType } from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { sousTitreDePlat } from '../../services/CrousMapping';

interface CrousMealCardProps {
    mealTitle: string;
    categories: { name: string; dishes: string[] }[] | undefined;
    theme: AppThemeType;
}

export function CrousMealCard({ mealTitle, categories, theme }: CrousMealCardProps) {
    if (!categories || categories.length === 0) return null;

    return (
        <View style={styles.repas}>
            <SectionHeader title={mealTitle} theme={theme} />
            <View style={[styles.carte, { backgroundColor: theme.cardBackground, borderColor: theme.contourDeCarte }]}>
                {categories.map((categorie, index) => (
                    <View key={index}>
                        {index > 0 ? <View style={[styles.filet, { backgroundColor: theme.border }]} /> : null}
                        <View style={styles.categorie}>
                            {/* Le gris du texte secondaire : une categorie nomme, elle n'agit pas. */}
                            <Text style={[tokens.texte.intertitre, { color: theme.fontSecondary }]}>{categorie.name}</Text>
                            {categorie.dishes.length > 0 ? categorie.dishes.map((plat, rang) => {
                                const sousTitre = sousTitreDePlat(plat);
                                return sousTitre !== null ? (
                                    <Text key={rang} style={[tokens.texte.intertitre, styles.sousTitre, { color: theme.fontSecondary }]}>{sousTitre}</Text>
                                ) : (
                                    <Text key={rang} style={[styles.plat, { color: theme.font }]}>{plat}</Text>
                                );
                            }) : (
                                <Text style={[styles.plat, { color: theme.fontTertiary }]}>{Translator.get('NOT_SPECIFIED')}</Text>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    repas: {
        marginBottom: tokens.space.xl,
    },
    carte: {
        marginHorizontal: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    categorie: {
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
        gap: tokens.space.sm,
    },
    // « Autre plat : » et ses pareils, que la source glisse parmi les plats (`sousTitreDePlat`).
    sousTitre: {
        marginTop: tokens.space.xs,
    },
    plat: {
        fontSize: tokens.fontSize.md,
        lineHeight: 22,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
});
