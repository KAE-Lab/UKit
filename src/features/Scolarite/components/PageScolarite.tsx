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
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

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
}

export function PageScolarite({
    theme, teinte, coldData, widgets, certificatEnCours, progression, scrapeProgress, credentials, portailDisponible,
    sessionFailure, echecBloquant,
    onRetry, onRessaisir, onConnecter, onDemanderCampus, onWidget, onPorte, onDocuments,
}: PageScolariteProps) {
    return (
        <ScrollView
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
                paddingTop: tokens.space.lg,
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

            <EncartSession
                theme={theme}
                aUnCompte={credentials !== null && credentials !== undefined}
                echecBloquant={echecBloquant}
                sessionFailure={sessionFailure}
                onRetry={onRetry}
                onRessaisir={onRessaisir}
                onConnecter={onConnecter}
            />

            {/* Rien a ouvrir tant qu'aucune session n'existe : la grille entiere attend. Et un
                parcours froid qui a ECHOUE sans laisser de dossier ne montre pas une grille a
                moitie vide (constate sur Android le 2026-08-31) : l'encart d'echec au-dessus porte
                le probleme et son geste, la page reste propre. Avec un dossier deja lu, la grille
                s'affiche — de vraies donnees valent mieux qu'un ecran vide. */}
            {portailDisponible && credentials && (coldData !== null || (sessionFailure === null && echecBloquant === null)) ? (
                <GrilleScolarite
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

        </ScrollView>
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
