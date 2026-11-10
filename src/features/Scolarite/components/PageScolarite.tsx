/**
 * Le corps defilant de l'onglet Scolarite : l'encart d'etat, puis la grille.
 *
 * Sorti de l'ecran pour le garder sous la limite de lignes — meme decoupage que `ActionsDuCompte`
 * pour l'ecran du compte. L'ecran garde ce qui lui revient, l'aiguillage ; ce fichier ne fait que
 * composer.
 *
 * **Le tableau de bord est dedie aux SERVICES.** La formation y a vecu une journee, puis elle a rejoint
 * l'ecran du compte : c'est une information d'etat civil, on la consulte, on n'agit pas dessus — et la
 * garder ici obligeait a poser un en-tete de section au-dessus d'une rangee unique.
 *
 * **La salutation ouvre la page, sous l'en-tete fixe de tous les onglets** (deuxieme passe de 7-J).
 * Elle a vecu dans un en-tete qui s'effacait au defilement (titre et salutation restaient a moitie
 * effaces, la page etant trop courte pour finir la course), puis dans un bandeau collant propre a
 * l'onglet. Le titre ne s'efface plus nulle part : la page passe dessous en fondu, et lui transmet son
 * defilement pour que le fondu paraisse.
 *
 * **Les documents ont rejoint la grille.** Ils occupaient le bas de la page avec leur propre en-tete
 * et leur liste entiere, pour un contenu qu'on consulte le jour ou l'on en a besoin — un certificat.
 * Ils sont desormais une **colonne de l'instrument**, et leur detail a son ecran. La page ne
 * porte donc plus que deux choses : l'etat de la session, et la grille (GrilleScolarite).
 *
 * **Une actualisation du dossier se pose en encart** (6.1-A) : la meme barre que le formulaire et la
 * fiche du compte, dans la meme carte, au-dessus d'une page qui ne bouge pas — le dossier precedent
 * reste affiche jusqu'a ce que le nouveau l'ecrase. L'ecran plein n'est plus que pour un parcours
 * froid sans dossier a montrer.
 *
 * **La page existe sans compte, et c'est la meme** (6.1.x-B). L'onglet sans compte ETAIT le
 * formulaire depuis le 2026-08-31 ; un enseignant-chercheur a demande ou etait le webmail, et la
 * reponse est que les portes des services n'ont jamais eu besoin d'une session. La grille se rend
 * donc toujours — en **portes** tant qu'aucun dossier n'a ete lu, en widgets ensuite — et l'encart
 * d'invitation mene au formulaire, qui vit dans l'ecran du compte. Une grille qui disparaissait sur
 * un echec de session disparait de meme : elle degrade en portes, l'encart dit l'echec au-dessus.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { TAB_BAR_HEIGHT } from '../../../shared/ui/ScreenState';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import type { PointWidget } from '../widgets/definitions';
import type { EtatDesWidgets } from '../widgets/useWidgets';
import type { EtatProgression } from '../hooks/useEcranDeProgression';
import { EdtIntrouvable } from './EdtIntrouvable';
import { EncartSession } from './EncartSession';
import { GrilleScolarite } from './GrilleScolarite';
import { SalutationScolarite } from './SalutationScolarite';
import { useColonneDocuments } from '../hooks/useColonneDocuments';
import { BlocProgression } from './ScolariteLoadingScreen';

export interface PageScolariteProps {
    theme: AppThemeType;
    teinte: string;
    coldData: ScolariteColdData | null;
    widgets: EtatDesWidgets;
    /** Le certificat automatique se range : la tuile des documents pose son indicateur de lecture. */
    certificatEnCours: boolean;
    /** Une actualisation du dossier tourne : la barre se pose en encart, la page reste. */
    progression: EtatProgression;
    scrapeProgress: string | null;
    credentials: unknown;
    portailDisponible: boolean;
    sessionFailure: UkitFailure | null;
    echecBloquant: UkitFailure | null;
    onRetry: () => void;
    onRessaisir: () => void;
    onConnecter: () => void;
    onDemanderCampus: (adresse: string) => void;
    onWidget: (point: PointWidget) => void;
    onPorte: (point: string) => void;
    onDocuments: () => void;
    /** Relit le dossier, depuis la rangee de l'emploi du temps personnel introuvable. */
    onActualiserDossier: () => void;
    /** Le retrait de l'en-tete fixe, zone sure comprise (`hauteurDeLEnTete`). */
    paddingHaut: number;
    /** Le defilement, que l'en-tete lit pour faire paraitre le fondu (`useAnimatedScrollHandler`). */
    onScroll: React.ComponentProps<typeof Reanimated.ScrollView>['onScroll'];
    /** La salutation en tete : avec un dossier, ou sans compte ; jamais sur un compte sans dossier. */
    salutation: boolean;
}

export function PageScolarite({
    theme, teinte, coldData, widgets, certificatEnCours, progression, scrapeProgress, credentials, portailDisponible,
    sessionFailure, echecBloquant, paddingHaut, onScroll, salutation,
    onRetry, onRessaisir, onConnecter, onDemanderCampus, onWidget, onPorte, onDocuments, onActualiserDossier,
}: PageScolariteProps) {
    const colonneDocuments = useColonneDocuments({ chargement: certificatEnCours, onPress: onDocuments });
    return (
        <Reanimated.ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={styles.corps}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                paddingTop: paddingHaut + tokens.space.sm,
                paddingBottom: tokens.space.xxl + TAB_BAR_HEIGHT,
                gap: tokens.space.lg,
            }}
        >
            {salutation ? <SalutationScolarite theme={theme} teinte={teinte} coldData={coldData} /> : null}

            {progression.visible ? (
                // Le gabarit de la carte du formulaire, ou la meme barre remplace les champs : une
                // seule facon de dire « ca se relit » dans tout l'onglet.
                <View style={[styles.encartProgression, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <BlocProgression scrapeProgress={scrapeProgress} terminee={progression.terminee} theme={theme} color={teinte} />
                </View>
            ) : null}

            {/* Sans compte, aucun encart : l'invitation est le bouton « Se connecter » de la barre
                d'onglets (MainTabNavigator), et la page reste celle des services. L'encart ne porte
                plus que l'echec d'une session. */}
            {credentials ? (
                <EncartSession
                    theme={theme}
                    aUnCompte
                    echecBloquant={echecBloquant}
                    sessionFailure={sessionFailure}
                    onRetry={onRetry}
                    onRessaisir={onRessaisir}
                    onConnecter={onConnecter}
                />
            ) : null}

            {/* Le dernier dossier n'a pas designe l'emploi du temps personnel : la rangee le dit, et
                se tait pendant qu'une actualisation le relit (EdtIntrouvable). */}
            {credentials && !progression.visible ? (
                <EdtIntrouvable theme={theme} coldData={coldData} onActualiser={onActualiserDossier} />
            ) : null}

            {/* La grille se rend toujours (6.1.x-B). Sans dossier lu — pas de compte, parcours froid
                en cours ou en echec — elle est en PORTES : rien ne tourne, rien n'est a moitie vide
                (le cas constate sur Android le 2026-08-31 etait une grille de widgets sans donnee),
                et l'encart au-dessus porte l'invitation ou l'echec. Avec un dossier, les widgets. */}
            {portailDisponible ? (
                <GrilleScolarite
                    sansSession={!credentials || coldData === null}
                    theme={theme}
                    teinte={teinte}
                    valeurs={widgets.valeurs}
                    echecs={widgets.echecs}
                    pointEnCours={widgets.pointEnCours}
                    coldData={coldData}
                    onWidget={onWidget}
                    onRelancer={(point) => { void widgets.relancer(point); }}
                    onRessaisir={onRessaisir}
                    onPorte={onPorte}
                    onDemande={onDemanderCampus}
                    colonneDocuments={colonneDocuments}
                />
            ) : null}

        </Reanimated.ScrollView>
    );
}

const styles = StyleSheet.create({
    corps: {
        flex: 1,
    },
    encartProgression: {
        marginHorizontal: tokens.space.md,
        padding: tokens.space.md,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
    },
});
