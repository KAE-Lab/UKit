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
import { planningDisponible } from '../../shared/etablissements';
import Translator from '../../shared/i18n/Translator';
import style, { tokens } from '../../shared/theme/Theme';
import { useWelcomeState } from './hooks/useWelcomeState';
import {
    StepEtablissement,
    StepFin,
    StepGroupes,
    StepIntro,
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
 * Les etapes, dans l'ordre. `groupes` disparait quand l'etablissement n'a pas d'emploi du temps.
 *
 * **Le theme et la langue viennent avant l'etablissement**, alors que la specification du jalon 6-G
 * annoncait l'inverse. La raison est celle qu'on voit en jouant le parcours : demander a quelqu'un de
 * choisir son universite dans une langue qu'il n'a pas encore choisie met la charge au mauvais
 * endroit. L'argument technique de la spec — « l'etablissement conditionne tout le reste » — reste
 * vrai, mais il ne concerne que **l'etape des groupes**, qui le suit toujours.
 */
type Etape = 'intro' | 'preferences' | 'etablissement' | 'groupes' | 'fin';

function etapesPour(avecGroupes: boolean): Etape[] {
    const etapes: Etape[] = ['intro', 'preferences', 'etablissement'];
    if (avecGroupes) etapes.push('groupes');
    etapes.push('fin');
    return etapes;
}

export default function WelcomeScreen() {
    const [index, setIndex] = useState(0);
    const insets = useSafeAreaInsets();
    const { state, actions } = useWelcomeState();

    const themeObj = style.Theme[state.theme];

    // La liste se recalcule a chaque rendu : changer d'etablissement doit ajouter ou retirer l'etape
    // des groupes tout de suite, pas au rendu suivant.
    const etapes = etapesPour(planningDisponible());
    const index_ = Math.min(index, etapes.length - 1);
    const etape = etapes[index_];
    const derniere = index_ >= etapes.length - 1;

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
                {etape === 'groupes' && (
                    <StepGroupes
                        themeObj={themeObj}
                        navigatorState={state}
                        yearList={UNIVERSITY_YEARS_LIST}
                        seasonList={UNIVERSITY_SEASON_LIST}
                        filterList={actions.filterList}
                        selectGroup={actions.selectGroup}
                    />
                )}
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
