/**
 * La vue jour en frise (jalon 7-J) : les cartes de cours, et entre elles ce que la journee dit de sa
 * forme — la pause cotee et, aujourd'hui, le repere de l'heure (`frise.ts` decide ou ; ce fichier
 * dessine).
 *
 * **La pause est une cote.** Des pointilles dans l'axe du rail des cartes — le trait de construction
 * de l'Epure, 3 de trait pour 5 de vide — et la duree, en chiffres. C'est la seule trace qui entre sur
 * un ecran de travail, parce qu'elle porte une mesure.
 *
 * **Le repere de l'heure** se pose a sa place dans la journee : l'heure en chiffres dans une pastille
 * pleine de l'accentuation, le trait qui en part, et le temps avant le cours suivant. **Aucun point
 * lumineux** : la premiere passe y posait un point qui respirait, le tic le plus reconnaissable d'une
 * interface generee (review du 2026-11-05, et la regle de design qui en est nee). Sans lui, l'heure
 * flottait seule au bord (review du 2026-11-06) : la pastille l'ancre, forme pleine et immobile.
 * L'heure se relit toutes les trente secondes, par `maintenant()` que le menu de developpement
 * simule.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import moment from 'moment';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { maintenant } from '../../../shared/services/Temps';
import { construireFrise, formaterDuree, formaterHeure, type ElementDeFrise } from '../services/frise';
import type { PlanningEvent } from '../services/PlanningApiService';
import { CourseGroupCarousel } from './CourseGroupCarousel';
import { HAUTEUR_DU_FONDU } from '../../../shared/ui/FonduDeBord';

/** L'axe du rail des cartes, depuis le bord de la page : la marge de la carte, plus la moitie du rail. */
const AXE = tokens.space.md + 2;
/** Le pointille de l'Epure : 3 de trait, 5 de vide. */
const TIRET = { trait: 3, vide: 5, epaisseur: 2 } as const;
const HAUTEUR_DE_PAUSE = 32;

/** L'heure de la journee affichee, en minutes depuis minuit ; `null` si ce n'est pas aujourd'hui. */
function minuteDuJour(jour: moment.MomentInput): number | null {
    const instant = maintenant();
    return moment(jour).isSame(instant, 'day') ? instant.getHours() * 60 + instant.getMinutes() : null;
}

/** La meme, relue toutes les trente secondes : le repere avance, et une carte passe a son heure. */
function useMinuteDuJour(jour: moment.MomentInput): number | null {
    const [minute, setMinute] = useState(() => minuteDuJour(jour));
    useEffect(() => {
        setMinute(minuteDuJour(jour));
        const minuterie = setInterval(() => setMinute(minuteDuJour(jour)), 30_000);
        return () => clearInterval(minuterie);
    }, [jour]);
    return minute;
}

function MarqueDePause({ minutes, theme }: { minutes: number; theme: AppThemeType }) {
    const tirets = Math.floor(HAUTEUR_DE_PAUSE / (TIRET.trait + TIRET.vide));
    return (
        <View style={styles.pause} accessible accessibilityLabel={Translator.get('FRISE_PAUSE', formaterDuree(minutes))}>
            <View style={styles.pointilles}>
                {Array.from({ length: tirets }, (_, i) => (
                    <View key={i} style={[styles.tiret, { backgroundColor: theme.fontTertiary }]} />
                ))}
            </View>
            <Text style={[styles.textePause, tokens.texte.chiffres, { color: theme.fontTertiary }]}>
                {Translator.get('FRISE_PAUSE', formaterDuree(minutes))}
            </Text>
        </View>
    );
}

function RepereDeLHeure({ element, theme }: { element: Extract<ElementDeFrise<unknown>, { genre: 'maintenant' }>; theme: AppThemeType }) {
    const suite = element.prochainDans === null
        ? Translator.get('FRISE_FIN')
        : Translator.get(element.avantLePremier ? 'FRISE_PREMIER' : 'FRISE_PROCHAIN', formaterDuree(element.prochainDans));
    return (
        <View style={styles.repere} accessible accessibilityLabel={`${formaterHeure(element.minutes)}, ${suite}`}>
            <View style={[styles.pastilleRepere, { backgroundColor: theme.accent }]}>
                <Text style={[styles.heureRepere, tokens.texte.chiffres, { color: theme.lightFont }]}>{formaterHeure(element.minutes)}</Text>
            </View>
            <View style={[styles.filet, { backgroundColor: theme.accent }]} />
            <Text numberOfLines={1} style={[styles.suite, tokens.texte.chiffres, { color: theme.fontSecondary }]}>{suite}</Text>
        </View>
    );
}

export interface JourneeEnFriseProps {
    groupes: PlanningEvent[][];
    jour: moment.MomentInput;
    theme: AppThemeType;
    enTete: React.ReactElement;
    onScroll?: (evenement: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function JourneeEnFrise({ groupes, jour, theme, enTete, onScroll }: JourneeEnFriseProps) {
    const minute = useMinuteDuJour(jour);
    const elements = useMemo(() => construireFrise(groupes, minute), [groupes, minute]);

    return (
        <Animated.FlatList
            data={elements}
            extraData={minute}
            ListHeaderComponent={enTete}
            keyExtractor={(element, index) => (element.genre === 'groupe' ? `g-${element.groupe[0]?.id ?? index}` : `${element.genre}-${index}`)}
            renderItem={({ item }) => {
                if (item.genre === 'pause') return <MarqueDePause minutes={item.minutes} theme={theme} />;
                if (item.genre === 'maintenant') return <RepereDeLHeure element={item} theme={theme} />;
                return (
                    <CourseGroupCarousel coursesGroup={item.groupe} theme={theme} minute={minute} />
                );
            }}
            style={{ backgroundColor: theme.courseBackground }}
            contentContainerStyle={styles.contenu}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
        />
    );
}

const styles = StyleSheet.create({
    contenu: {
        // Le fondu sous l'en-tete couvre ce rembourrage au repos (FonduDeBord, DayView).
        paddingTop: HAUTEUR_DU_FONDU,
        paddingBottom: tokens.space.xxl + 80,
    },
    pause: {
        height: HAUTEUR_DE_PAUSE,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointilles: {
        position: 'absolute',
        left: AXE - TIRET.epaisseur / 2,
        top: 0,
        bottom: 0,
        justifyContent: 'space-evenly',
    },
    tiret: {
        width: TIRET.epaisseur,
        height: TIRET.trait,
        borderRadius: tokens.radius.pill,
    },
    textePause: {
        marginLeft: tokens.space.xl,
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.medium,
    },
    repere: {
        height: HAUTEUR_DE_PAUSE + tokens.space.xs,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: tokens.space.md,
    },
    // La pastille s'aligne sur le bord des cartes ; le trait en part sans jour, comme d'une epingle.
    pastilleRepere: {
        marginLeft: tokens.space.md,
        paddingHorizontal: tokens.space.sm,
        paddingVertical: tokens.space.xxs,
        borderRadius: tokens.radius.sm,
    },
    heureRepere: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.bold,
    },
    filet: {
        flex: 1,
        height: StyleSheet.hairlineWidth * 2,
        marginRight: tokens.space.sm,
        opacity: 0.6,
    },
    suite: {
        flexShrink: 1,
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.medium,
    },
});
