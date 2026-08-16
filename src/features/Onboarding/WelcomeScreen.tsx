/**
 * Le parcours d'accueil : ce qu'on demande avant la premiere ouverture.
 *
 * Cet ecran **compose et enchaine** ; l'etat vit dans `hooks/useWelcomeState.ts` et la mise en page
 * dans `components/WelcomeSteps.tsx` depuis le jalon 6-G. Chaque choix s'applique immediatement —
 * selectionner le mode sombre repeint l'ecran en cours — il n'y a donc aucun etat a valider, seul
 * `firstload` reste a basculer.
 *
 * **L'etablissement se choisit juste avant les groupes**, et il decide du **nombre d'etapes** : une
 * universite qui ne publie pas son emploi du temps n'a pas de groupes a proposer, et lui demander
 * lequel est le sien serait poser une question sans reponse (docs/phase-6/6-g-etablissements.md).
 *
 * Voir docs/features/onboarding.md.
 */

import React, { useState } from 'react';
import { Text, View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsManager } from '../../shared/services/AppCore';
import { planningDisponible, sourceEdt } from '../../shared/etablissements';
import { useCredentials } from '../Scolarite/services/CredentialsContext';
import Translator from '../../shared/i18n/Translator';
import style, { tokens } from '../../shared/theme/Theme';
import { filtrageParAnnee, useWelcomeState } from './hooks/useWelcomeState';
import {
    StepCompte,
    StepEtablissement,
    StepFin,
    StepGroupes,
    StepIntro,
    StepLienEdt,
    StepPreferences,
    WelcomeBackButton,
    WelcomePagination,
} from './components/WelcomeSteps';

const THEME_LIST = [
    { id: 'light', title: 'LIGHT_THEME' },
    { id: 'dark', title: 'DARK_THEME' },
];

const LANGUAGE_LIST = [
    { id: 'fr', title: 'FRENCH' },
    { id: 'en', title: 'ENGLISH' },
    { id: 'es', title: 'SPANISH' },
];

const UNIVERSITY_YEARS_LIST = [
    { id: 'L1', title: 'BACHELORS', suffix: '1' },
    { id: 'L2', title: 'BACHELORS', suffix: '2' },
    { id: 'L3', title: 'BACHELORS', suffix: '3' },
    { id: 'M1', title: 'MASTERS', suffix: '1' },
    { id: 'M2', title: 'MASTERS', suffix: '2' },
    { id: 'AUTRE', title: 'OTHER', suffix: '' },
];

const UNIVERSITY_SEASON_LIST = [
    { id: 'autumn', title: 'AUTUMN' },
    { id: 'spring', title: 'SPRING' },
];

/**
 * Les etapes, dans l'ordre. Deux d'entre elles apparaissent ou non selon l'etablissement.
 *
 * **Le theme et la langue viennent avant l'etablissement**, alors que la specification du jalon 6-G
 * annoncait l'inverse. La raison est celle qu'on voit en jouant le parcours : demander a quelqu'un de
 * choisir son universite dans une langue qu'il n'a pas encore choisie met la charge au mauvais
 * endroit. L'argument technique de la spec — « l'etablissement conditionne tout le reste » — reste
 * vrai, mais il ne concerne que **ce qui le suit**.
 *
 * **Le compte vient juste apres l'etablissement** (jalon 6-J), et avant l'emploi du temps. L'ordre
 * n'est pas cosmetique : chez beaucoup d'universites le compte **est** la porte vers l'emploi du
 * temps, et le demander apres aurait pose la question dans le mauvais sens. Il ne l'est pas a
 * Bordeaux, et c'est justement pourquoi l'ordre doit etre pense pour les autres — l'application n'a
 * eu qu'une forme trop longtemps.
 *
 * Les deux omissions suivent la meme regle, celle que 6-G a posee : **on ne pose pas une question sans
 * reponse.** Une universite sans portail n'a pas de compte a proposer, une universite sans emploi du
 * temps n'a pas de groupe a choisir.
 */
type Etape = 'intro' | 'preferences' | 'etablissement' | 'compte' | 'edt' | 'fin';

function etapesPour(avecCompte: boolean, avecEdt: boolean): Etape[] {
    const etapes: Etape[] = ['intro', 'preferences', 'etablissement'];
    if (avecCompte) etapes.push('compte');
    if (avecEdt) etapes.push('edt');
    etapes.push('fin');
    return etapes;
}

export default function WelcomeScreen() {
    const [index, setIndex] = useState(0);
    const insets = useSafeAreaInsets();
    const { state, actions } = useWelcomeState();
    const { portailDisponible } = useCredentials();

    const themeObj = style.Theme[state.theme];

    // La liste se recalcule a chaque rendu : changer d'etablissement doit ajouter ou retirer une etape
    // tout de suite, pas au rendu suivant.
    const etapes = etapesPour(portailDisponible, planningDisponible());
    const index_ = Math.min(index, etapes.length - 1);
    const etape = etapes[index_];
    const derniere = index_ >= etapes.length - 1;

    // L'etape d'emploi du temps a deux contenus, et c'est la **source** qui tranche, jamais
    // l'etablissement : un choix de groupe quand il y en a a choisir, un champ de lien sinon.
    const parLien = sourceEdt().kind !== 'celcat' && sourceEdt().kind !== 'ical';

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: themeObj.background, paddingTop: (insets.top || 0) - tokens.space.lg }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                <WelcomeBackButton onPress={() => setIndex(index_ - 1)} visible={index_ > 0} themeObj={themeObj} topInset={insets.top} />

                {etape === 'intro' && <StepIntro themeObj={themeObj} />}
                {etape === 'etablissement' && (
                    <StepEtablissement
                        themeObj={themeObj}
                        etablissements={state.etablissements}
                        codeActif={state.etablissement}
                        selectEtablissement={actions.selectEtablissement}
                    />
                )}
                {etape === 'preferences' && (
                    <StepPreferences
                        themeObj={themeObj}
                        navigatorState={state}
                        themeList={THEME_LIST}
                        languageList={LANGUAGE_LIST}
                        selectTheme={actions.selectTheme}
                        selectLanguage={actions.selectLanguage}
                    />
                )}
                {etape === 'compte' && (
                    <StepCompte themeObj={themeObj} onSuivant={() => setIndex(index_ + 1)} />
                )}
                {etape === 'edt' && (parLien ? (
                    <StepLienEdt onDone={() => setIndex(index_ + 1)} />
                ) : (
                    <StepGroupes
                        themeObj={themeObj}
                        navigatorState={state}
                        yearList={UNIVERSITY_YEARS_LIST}
                        seasonList={UNIVERSITY_SEASON_LIST}
                        filterList={actions.filterList}
                        selectGroup={actions.selectGroup}
                        parAnnee={filtrageParAnnee()}
                    />
                ))}
                {etape === 'fin' && <StepFin themeObj={themeObj} />}

                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: (insets.bottom || 0) }}>
                    <View style={{ paddingHorizontal: tokens.space.xl, marginBottom: tokens.space.xs }}>
                        <TouchableOpacity
                            onPress={derniere ? () => SettingsManager.setFirstLoad(false) : () => setIndex(index_ + 1)}
                            style={{
                                backgroundColor: themeObj.primary,
                                borderRadius: tokens.radius.md,
                                paddingVertical: tokens.space.md,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                                {derniere ? Translator.get('FINISH') : (index_ === 0 ? Translator.get('START') : Translator.get('NEXT'))}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <WelcomePagination pageNumber={index_ + 1} maxPage={etapes.length} themeObj={themeObj} />
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
