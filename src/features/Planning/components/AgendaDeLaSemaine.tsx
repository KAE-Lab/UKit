/**
 * La vue semaine, en agenda (7-J, deuxieme passe).
 *
 * **Une semaine se lit comme une page d'agenda**, de haut en bas : chaque jour ouvert d'emblee, et ses
 * cours en rangees compactes sur une seule carte — l'heure de debut et de fin, la couleur du cours,
 * l'intitule, la salle, le type. Elle repliait chaque jour derriere un bandeau qu'il fallait ouvrir un
 * a un, et depliait les grandes cartes du carrousel de la vue jour : « eclatee », pas pratique (review
 * du 2026-11-05).
 *
 * Un jour sans cours tient en une ligne ; le week-end n'apparait que s'il porte un cours. Les jours
 * passes s'estompent, aujourd'hui prend l'accentuation. Toucher un cours ouvre sa fiche, comme dans
 * la vue jour. Les journees entieres du telephone gardent leur bandeau (6.1.x-D). Ce qui se decide
 * sans dessiner vit dans `services/agenda.ts`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Reanimated from 'react-native-reanimated';
import moment from 'moment';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { upperCaseFirstLetter } from '../../../shared/services/AppCore';
import { maintenant } from '../../../shared/services/Temps';
import { useEnfoncement } from '../../../shared/ui/useEnfoncement';
import { coursDuJour, dateDuJour, etatDuJour, jourAffiche, type EtatDuJour, type JourDuCache } from '../services/agenda';
import { couleurDeCours } from '../services/couleurDeCours';
import type { PlanningEvent } from '../services/PlanningAssembly';
import { lignesDuCreneau } from './CourseAnnotations';
import { BandeauJourneeEntiere } from './BandeauJourneeEntiere';

/** Le texte de la colonne des heures a la taille par defaut ; elle grandit avec la police (CourseRow). */
const TEXTE_DES_HEURES = 44;
const RAIL = 3;

type Navigation = { navigate: (route: string, params?: object) => void } | undefined;

function RangeeDeCours({ cours, theme, navigation, largeurDesHeures }: {
    cours: PlanningEvent;
    theme: AppThemeType;
    navigation: Navigation;
    largeurDesHeures: number;
}) {
    const enfoncement = useEnfoncement();
    const salle = lignesDuCreneau(cours.description, cours.lieu).find((ligne) => ligne.icone === 'room')?.texte;
    const type = cours.category !== '' && cours.category !== cours.subject ? cours.category : null;
    const ouvrir = () => {
        if (navigation === undefined) return;
        requestAnimationFrame(() => navigation.navigate('Course', { data: cours }));
    };
    return (
        <Pressable
            onPress={ouvrir}
            onPressIn={enfoncement.onPressIn}
            onPressOut={enfoncement.onPressOut}
            accessibilityRole="button"
            accessibilityLabel={[cours.subject, `${cours.starttime} – ${cours.endtime}`, salle].filter(Boolean).join(', ')}
        >
            <Reanimated.View style={[styles.rangee, enfoncement.style]}>
                <View style={[styles.heures, { width: largeurDesHeures }]}>
                    <Text numberOfLines={1} style={[styles.debut, tokens.texte.chiffres, { color: theme.font }]}>{cours.starttime}</Text>
                    <Text numberOfLines={1} style={[styles.fin, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{cours.endtime}</Text>
                </View>
                <View style={[styles.rail, { backgroundColor: couleurDeCours(theme.courses, cours.color) }]} />
                <View style={styles.textes}>
                    <Text numberOfLines={1} style={[styles.intitule, { color: theme.font }]}>{cours.subject}</Text>
                    {salle !== undefined ? (
                        <Text numberOfLines={1} style={[styles.salle, { color: theme.fontSecondary }]}>{salle}</Text>
                    ) : null}
                </View>
                {type !== null ? (
                    <Text numberOfLines={1} style={[styles.type, { color: theme.fontTertiary }]}>{type}</Text>
                ) : null}
            </Reanimated.View>
        </Pressable>
    );
}

function JourDeLAgenda({ date, etat, cours, theme, navigation, largeurDesHeures }: {
    date: moment.Moment;
    etat: EtatDuJour;
    cours: PlanningEvent[] | undefined;
    theme: AppThemeType;
    navigation: Navigation;
    largeurDesHeures: number;
}) {
    const { bandeaux, horaires } = coursDuJour(cours);
    const nombre = horaires.length + bandeaux.length;
    if (!jourAffiche(date, nombre)) return null;
    const titre = date.isValid() ? upperCaseFirstLetter(date.format('dddd D MMMM')) : '';
    const compte = nombre === 0
        ? Translator.get('AGENDA_LIBRE')
        : nombre === 1 ? Translator.get('AGENDA_UN_COURS') : Translator.get('AGENDA_N_COURS', nombre);

    return (
        <View
            style={[styles.jour, etat === 'passe' && styles.passe]}
            // Un jour passe s'estompe d'un bloc : sans composition hors ecran, Android applique
            // l'opacite a chaque vue, et le fond transparaitrait sous le texte (CourseRow).
            needsOffscreenAlphaCompositing={etat === 'passe'}
        >
            <View style={styles.enTeteDuJour}>
                <Text style={[styles.titreDuJour, { color: etat === 'aujourdhui' ? theme.accent : theme.font }]}>{titre}</Text>
                <Text style={[styles.compte, tokens.texte.chiffres, { color: theme.fontTertiary }]}>{compte}</Text>
            </View>
            {bandeaux.map((evenement) => <BandeauJourneeEntiere key={evenement.id} evenement={evenement} theme={theme} />)}
            {horaires.length > 0 ? (
                <View style={[styles.carte, { backgroundColor: theme.eventBackground, borderColor: theme.contourDeCarte }]}>
                    {horaires.map((c, index) => (
                        <View key={c.id}>
                            {index > 0 ? (
                                <View style={[styles.filet, { backgroundColor: theme.border, marginLeft: tokens.space.md + largeurDesHeures + RAIL + tokens.space.md }]} />
                            ) : null}
                            <RangeeDeCours cours={c} theme={theme} navigation={navigation} largeurDesHeures={largeurDesHeures} />
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export interface AgendaDeLaSemaineProps {
    jours: readonly JourDuCache[];
    /** La date de repli d'un jour, par son rang dans la semaine (lundi = 0). */
    repli: (rang: number) => moment.Moment;
    theme: AppThemeType;
    navigation: Navigation;
}

export function AgendaDeLaSemaine({ jours, repli, theme, navigation }: AgendaDeLaSemaineProps) {
    const { fontScale } = useWindowDimensions();
    const largeurDesHeures = Math.ceil(TEXTE_DES_HEURES * Math.max(1, fontScale));
    const instant = maintenant();
    return (
        <>
            {jours.map((jour, rang) => {
                const date = dateDuJour(jour, repli(rang));
                return (
                    <JourDeLAgenda
                        key={rang}
                        date={date}
                        etat={etatDuJour(date, instant)}
                        cours={jour.courses}
                        theme={theme}
                        navigation={navigation}
                        largeurDesHeures={largeurDesHeures}
                    />
                );
            })}
        </>
    );
}

const styles = StyleSheet.create({
    jour: {
        marginBottom: tokens.space.lg,
    },
    passe: {
        opacity: 0.55,
    },
    enTeteDuJour: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginHorizontal: tokens.space.xl,
        marginBottom: tokens.space.sm,
    },
    titreDuJour: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    compte: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.medium,
    },
    carte: {
        marginHorizontal: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        ...tokens.shadow.sm,
    },
    rangee: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm + tokens.space.xs,
        gap: tokens.space.md,
    },
    heures: {
        justifyContent: 'center',
    },
    debut: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    fin: {
        fontSize: tokens.fontSize.xs,
        marginTop: tokens.space.xxs,
    },
    rail: {
        width: RAIL,
        alignSelf: 'stretch',
    },
    textes: {
        flex: 1,
    },
    intitule: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    salle: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xxs,
    },
    type: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.semibold,
    },
    filet: {
        height: StyleSheet.hairlineWidth,
    },
});
