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
import { libelleLisible, sousTitreDePlat } from '../../services/CrousMapping';

interface CrousMealCardProps {
    mealTitle: string;
    categories: { name: string; dishes: string[] }[] | undefined;
    theme: AppThemeType;
}

/**
 * Un plat derriere sa puce : le retour a la ligne s'aligne sur le texte, pas sur la puce, si bien
 * qu'un plat sur deux lignes ne se confond plus avec deux plats (7-J, troisieme passe).
 */
function Plat({ texte, theme, absent = false }: { texte: string; theme: AppThemeType; absent?: boolean }) {
    return (
        <View style={styles.plat}>
            <View style={[styles.puce, { backgroundColor: theme.fontTertiary }]} />
            <Text style={[styles.texteDuPlat, { color: absent ? theme.fontTertiary : theme.font }]}>{texte}</Text>
        </View>
    );
}

/**
 * La hierarchie est typographique (review du 2026-11-06, « une suite de lignes de texte ») : la
 * categorie en demi-gras, couleur du texte, au-dessus de ses plats a puce ; un filet et de l'air entre
 * deux categories ; les sous-titres de la source (« Autre plat ») en gris. Ni couleur decorative ni
 * icone devinee : la premiere decorait, la seconde se trompait.
 */
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
                            <Text style={[tokens.texte.titreDeCarte, { color: theme.font }]}>{libelleLisible(categorie.name)}</Text>
                            {categorie.dishes.length > 0 ? categorie.dishes.map((brut, rang) => {
                                const plat = libelleLisible(brut);
                                const sousTitre = sousTitreDePlat(plat);
                                return sousTitre !== null ? (
                                    <Text key={rang} style={[tokens.texte.intertitre, styles.sousTitre, { color: theme.fontSecondary }]}>{sousTitre}</Text>
                                ) : (
                                    <Plat key={rang} texte={plat} theme={theme} />
                                );
                            }) : (
                                <Plat texte={Translator.get('NOT_SPECIFIED')} theme={theme} absent />
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const PUCE = 5;
/** La hauteur de ligne du plat : la puce se centre sur la premiere ligne, pas sur le bloc. */
const LIGNE = 22;

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
        paddingTop: tokens.space.md,
        paddingBottom: tokens.space.md + tokens.space.xxs,
        gap: tokens.space.sm,
    },
    sousTitre: {
        marginTop: tokens.space.xs,
    },
    plat: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: tokens.space.sm + tokens.space.xxs,
    },
    puce: {
        width: PUCE,
        height: PUCE,
        borderRadius: PUCE / 2,
        marginTop: (LIGNE - PUCE) / 2,
        marginLeft: tokens.space.xxs,
    },
    texteDuPlat: {
        flex: 1,
        fontSize: tokens.fontSize.md,
        lineHeight: LIGNE,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
        marginLeft: tokens.space.md,
    },
});
