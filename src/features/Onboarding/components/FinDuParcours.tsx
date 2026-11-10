/**
 * La fin de l'accueil : le planning du jour se construit sous les yeux (accueil refait, 7-J,
 * direction A). C'est le moment ou l'emploi du temps existe enfin ; la fin etait un cercle coche et
 * « Bravo ! » (review du 2026-11-06).
 *
 * Les cours sont les vrais : la journee des groupes choisis, demandee a la source comme le Planning
 * le fera juste apres (`fetchCalendarDay`), et rendue par sa carte (`CourseRow`). Ils arrivent l'un
 * apres l'autre. Un jour sans cours (on installe souvent l'application le week-end), la fin montre
 * le premier jour de la semaine qui en a, plutot qu'un « aucun cours » sur un ecran vide. Sans groupe (l'etape passee), ou si la source ne repond pas, la fin
 * garde le cercle qui se trace dans le degrade du logo : il n'y a pas de journee a montrer, et un
 * echec ici ne dit rien que le Planning ne dira mieux en s'ouvrant.
 *
 * Un lien d'abonnement, lui, est une source sans groupe (`groupesRequis`) : la journee se demande
 * quand meme. C'est le cas de l'IUT de Bordeaux, dont la connexion vient de lire le lien (lot 3) ; il
 * voyait le cercle seul la ou le College ST voyait sa journee. Une journee entiere — un jour ferie —
 * n'est pas un cours : elle ne compte pas.
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { SettingsManager } from '../../../shared/services/AppCore';
import { groupesRequis } from '../../../shared/etablissements';
import { maintenant } from '../../../shared/services/Temps';
import { PlanningApiService } from '../../Planning/services/PlanningApiService';
import type { PlanningEvent } from '../../Planning/services/PlanningAssembly';
import type { CourseData } from '../../Planning/components/CourseCard';
import { CourseRow } from '../../Planning/components/CourseRow';
import { TraitDeValidation } from './TraitDeValidation';
import { HAUT_D_ETAPE } from './EtapesDeChoix';
import { useDegagementDuPied } from './stylesDuParcours';

/** Le premier cours arrive apres le titre, puis un toutes les `PAS` millisecondes. */
const DELAI = 350;
const PAS = 150;

/** Le nombre de jours parcourus, aujourd'hui compris, pour trouver une journee de cours. */
const JOURS_CHERCHES = 7;

type Journee = { etat: 'attente' } | { etat: 'sans' } | { etat: 'prete'; cours: CourseData[]; dans: number };

function enCarte(evenement: PlanningEvent): CourseData {
    return {
        subject: evenement.subject,
        date: evenement.date,
        schedule: evenement.schedule,
        description: evenement.description,
        color: evenement.color,
        category: evenement.category,
        starttime: evenement.starttime,
        endtime: evenement.endtime,
        sites: evenement.sites,
    };
}

/**
 * La premiere journee de cours des favoris, aujourd'hui ou dans les jours qui suivent : une requete
 * par jour, l'une apres l'autre, arretee au premier jour trouve ou au premier echec.
 */
function useJourneeDesFavoris(): Journee {
    const [journee, setJournee] = useState<Journee>({ etat: 'attente' });
    useEffect(() => {
        const groupes = SettingsManager.getFavoriteGroups();
        if (groupes.length === 0 && groupesRequis()) {
            setJournee({ etat: 'sans' });
            return undefined;
        }
        const controle = new AbortController();
        const chercher = async () => {
            for (let dans = 0; dans < JOURS_CHERCHES; dans += 1) {
                const jour = moment(maintenant()).add(dans, 'days').format('YYYY-MM-DD');
                const resultat = await PlanningApiService.fetchCalendarDay(groupes, jour, { signal: controle.signal });
                if (controle.signal.aborted) return;
                if (resultat.ok === false) {
                    setJournee({ etat: 'sans' });
                    return;
                }
                const horaires = resultat.courses.filter((evenement) => evenement.journeeEntiere !== true);
                if (horaires.length > 0 || dans === JOURS_CHERCHES - 1) {
                    const cours = [...horaires].sort((a, b) => a.starttime.localeCompare(b.starttime)).map(enCarte);
                    setJournee({ etat: 'prete', cours, dans });
                    return;
                }
            }
        };
        chercher().catch(() => {
            if (!controle.signal.aborted) setJournee({ etat: 'sans' });
        });
        return () => controle.abort();
    }, []);
    return journee;
}

/** « Aujourd'hui, 4 cours. », « Demain, un cours. », « Lundi, 3 cours. » ; rien de la semaine, dit tel. */
function compteDuJour(nombre: number, dans: number): string {
    if (nombre === 0) return Translator.get('FIN_COURS_SEMAINE');
    const jour = dans === 0
        ? Translator.get('TODAY')
        : dans === 1 ? Translator.get('DEMAIN') : moment(maintenant()).add(dans, 'days').format('dddd');
    const quantite = nombre === 1 ? Translator.get('FIN_UN_COURS') : Translator.get('FIN_DES_COURS', nombre);
    return Translator.get('FIN_JOUR_COURS', jour.charAt(0).toUpperCase() + jour.slice(1), quantite);
}

export function StepFin({ themeObj }: { themeObj: AppThemeType }) {
    const degagement = useDegagementDuPied();
    const mouvementReduit = useReducedMotion();
    const journee = useJourneeDesFavoris();
    // L'etat d'un cours (en cours, passe) n'a de sens qu'aujourd'hui ; un autre jour, tout est a venir.
    const minute = journee.etat === 'prete' && journee.dans === 0 ? moment(maintenant()).hours() * 60 + moment(maintenant()).minutes() : null;
    const arrivee = (rang: number) => (mouvementReduit ? undefined : FadeInDown.delay(DELAI + rang * PAS).duration(tokens.mouvement.couture * 2));

    return (
        <ScrollView contentContainerStyle={[styles.etape, { paddingBottom: degagement }]} showsVerticalScrollIndicator={false}>
            <Text style={[tokens.texte.grandTitre, styles.titre, { color: themeObj.font }]}>
                {Translator.get('FIN_PRET')}
                {journee.etat === 'prete' ? (
                    <Text style={{ color: themeObj.fontTertiary }}>{`\n${compteDuJour(journee.cours.length, journee.dans)}`}</Text>
                ) : null}
            </Text>

            {journee.etat === 'sans' ? (
                <View style={styles.trait}>
                    <TraitDeValidation theme={themeObj} />
                </View>
            ) : null}

            {journee.etat === 'prete' ? (
                // La carte de cours porte sa marge, celle des listes du Planning : la vue la reprend,
                // pour que les cartes s'alignent sur le titre.
                <View style={styles.cours}>
                    {journee.cours.map((cours, rang) => (
                        <Reanimated.View key={`${cours.starttime}-${cours.subject}-${rang}`} entering={arrivee(rang)}>
                            <CourseRow data={cours} theme={themeObj} minute={minute} />
                        </Reanimated.View>
                    ))}
                </View>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    etape: {
        paddingTop: HAUT_D_ETAPE,
        paddingHorizontal: tokens.space.lg,
    },
    titre: {
        alignSelf: 'stretch',
        marginBottom: tokens.space.xl,
    },
    cours: {
        marginHorizontal: -tokens.space.md,
    },
    trait: {
        alignItems: 'center',
        marginTop: tokens.space.xxl,
    },
});
