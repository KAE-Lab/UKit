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
 * **La salutation vit dans l'en-tete, qui est COLLANT** (ScolariteDashboard). Il a d'abord glisse sous
 * le contenu en s'effacant au defilement, et ca ne pouvait pas marcher ici : la page est courte, donc
 * il n'y a pas assez de course pour mener la disparition a son terme — titre et salutation restaient
 * a moitie effaces, l'un par-dessus l'autre. C'est la disposition qu'il fallait changer, pas la
 * courbe. Cette page n'a donc plus ni valeur de defilement ni compensation d'en-tete.
 *
 * **Les documents ont rejoint la grille.** Ils occupaient le bas de la page avec leur propre en-tete
 * et leur liste entiere, pour un contenu qu'on consulte le jour ou l'on en a besoin — un certificat.
 * Ils sont desormais une **tuile** a cote de la messagerie, et leur detail a son ecran. La page ne
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
import { Animated, StyleSheet, View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { TAB_BAR_HEIGHT } from '../../../shared/ui/ScreenState';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { ScolariteColdData } from '../services/ScolariteMapping';
import type { PointWidget } from '../widgets/definitions';
import type { EtatDesWidgets } from '../widgets/useWidgets';
import type { EtatProgression } from '../hooks/useEcranDeProgression';
import { EncartSession } from './EncartSession';
import { GrilleScolarite } from './GrilleScolarite';
import { DocumentsTile } from './DocumentsTile';
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
    /**
     * Ce que le titre occupe au-dessus, **quand il flotte** — c'est-a-dire quand il n'y a pas de
     * dossier a saluer et donc pas d'en-tete collant (voir `ScolariteDashboard`). Avec le bandeau, il
     * occupe sa propre place et la page n'a rien a compenser.
     */
    paddingHaut?: number;
    /** Le defilement, pour que le titre flottant s'efface — le gabarit de Campus et des Reglages. */
    onScroll?: (evenement: unknown) => void;
}

export function PageScolarite({
    theme, teinte, coldData, widgets, certificatEnCours, progression, scrapeProgress, credentials, portailDisponible,
    sessionFailure, echecBloquant, paddingHaut, onScroll,
    onRetry, onRessaisir, onConnecter, onDemanderCampus, onWidget, onPorte, onDocuments,
}: PageScolariteProps) {
    return (
        <Animated.ScrollView
            {...(onScroll !== undefined ? { onScroll, scrollEventThrottle: 16 } : {})}
            // `flex: 1` est **obligatoire** depuis que l'en-tete est collant : il occupe une vraie
            // place, donc cette vue doit s'etirer sur ce qui reste. Sans lui, une vue defilante prend
            // la hauteur de son contenu — elle deborde de l'ecran au lieu de defiler.
            style={styles.corps}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                // Plus de compensation d'en-tete : il est **collant** et occupe sa propre place
                // au-dessus (ScolariteDashboard), encoche comprise. Cette page n'a donc plus besoin
                // de connaitre les marges de securite.
                //
                // `lg` (24) : l'ecart entre les deux sections de la grille — 8 de `bloc` + 16 de
                // l'intertitre « Tes services ». Depuis que la page ouvre sur un intertitre, c'est
                // lui la reference : a 8, le premier titre collait au filet de l'en-tete la ou le
                // second respirait.
                paddingTop: (paddingHaut ?? 0) + tokens.space.lg,
                paddingBottom: tokens.space.xxl + TAB_BAR_HEIGHT,
                gap: tokens.space.lg,
            }}
        >
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
                    tuileDocuments={<DocumentsTile theme={theme} teinte={teinte} chargement={certificatEnCours} onPress={onDocuments} />}
                />
            ) : null}

        </Animated.ScrollView>
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
