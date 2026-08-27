/**
 * Le corps defilant de l'onglet Scolarite : l'encart d'etat, puis les trois sections.
 *
 * Sorti de l'ecran pour le garder sous la limite de lignes — meme decoupage que `ActionsDuCompte`
 * pour l'ecran du compte. L'ecran garde ce qui lui revient, l'aiguillage ; ce fichier ne fait que
 * composer.
 *
 * **Le tableau de bord est dedie aux SERVICES.** La formation y a vecu une journee, puis elle a rejoint
 * l'ecran du compte : c'est une information d'etat civil, on la consulte, on n'agit pas dessus — et la
 * garder ici obligeait a poser un en-tete de section au-dessus d'une rangee unique.
 *
 * L'ordre restant n'est pas indifferent : les services d'abord parce que ce sont des gestes, les
 * documents ensuite parce qu'ils ne dependent d'aucune session — et que ce sont les seuls a rester la
 * quand tout le reste manque.
 */

import React from 'react';
import { Animated } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { HEADER_OFFSET, TAB_BAR_HEIGHT } from '../../../shared/ui/ScreenState';
import type { UkitFailure } from '../../../shared/aetherius/failures';
import type { ScolariteColdData, ScolariteMailData } from '../services/ScolariteMapping';
import GreetingBlock from './GreetingBlock';
import { EncartSession } from './EncartSession';
import { ServicesSection } from './ServicesSection';
import { DocumentsSection } from './DocumentsSection';

export interface PageScolariteProps {
    theme: AppThemeType;
    teinte: string;
    insets: EdgeInsets | null;
    scrollY: Animated.Value;
    coldData: ScolariteColdData | null;
    mailData: ScolariteMailData | null;
    credentials: unknown;
    portailDisponible: boolean;
    messagerieDisponible: boolean;
    scrapeStatus: string;
    sessionFailure: UkitFailure | null;
    echecBloquant: UkitFailure | null;
    onRetry: () => void;
    onRessaisir: () => void;
    onConnecter: () => void;
    onDemanderCampus: (adresse: string) => void;
    onMessagerie: () => void;
    onPorte: (point: string) => void;
}

export function PageScolarite({
    theme, teinte, insets, scrollY, coldData, mailData, credentials, portailDisponible,
    messagerieDisponible, scrapeStatus, sessionFailure, echecBloquant,
    onRetry, onRessaisir, onConnecter, onDemanderCampus, onMessagerie, onPorte,
}: PageScolariteProps) {
    return (
        <Animated.ScrollView
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
                paddingTop: (insets?.top || 0) + HEADER_OFFSET,
                paddingBottom: tokens.space.xxl + TAB_BAR_HEIGHT,
                gap: tokens.space.lg,
            }}
        >
            {coldData !== null ? <GreetingBlock coldData={coldData} color={teinte} theme={theme} /> : null}

            <EncartSession
                theme={theme}
                portailDisponible={portailDisponible}
                aUnCompte={credentials !== null && credentials !== undefined}
                echecBloquant={echecBloquant}
                sessionFailure={sessionFailure}
                onRetry={onRetry}
                onRessaisir={onRessaisir}
                onConnecter={onConnecter}
                onDemanderCampus={onDemanderCampus}
            />

            {/* Rien a ouvrir tant qu'aucune session n'existe : la section entiere attend. */}
            {portailDisponible && credentials ? (
                <ServicesSection
                    theme={theme}
                    teinte={teinte}
                    messagerieDisponible={messagerieDisponible}
                    mailData={mailData}
                    coldData={coldData}
                    scrapeStatus={scrapeStatus}
                    sessionFailure={sessionFailure}
                    onMessagerie={onMessagerie}
                    onPorte={onPorte}
                />
            ) : null}

            {/*
              * **Tout ou rien** : sans compte, l'onglet ne montre rien du tout.
              *
              * La section a d'abord ete rendue sans condition, et l'argument tenait : les documents
              * sont locaux, ils ne dependent d'aucun portail, et ils rendaient l'onglet vivant pour
              * quelqu'un qui ne se connecte pas — « Autre universite » comprise.
              *
              * **Arbitrage du proprietaire du produit, le 2026-08-27** : un onglet qui montre une
              * seule section sous un encart d'invitation se lit moins bien qu'un onglet franchement
              * vide, qui ne propose qu'une chose — se connecter. La consequence est assumee : chez un
              * etablissement sans portail publie, l'onglet redit qu'il n'est pas pris en charge et
              * s'arrete la.
              */}
            {credentials ? <DocumentsSection theme={theme} teinte={teinte} /> : null}
        </Animated.ScrollView>
    );
}
