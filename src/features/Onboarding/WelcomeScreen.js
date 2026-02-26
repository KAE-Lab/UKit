import React, { useEffect, useState } from 'react';
import {
    Text, View, Image, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { SettingsManager, isConnected, languageFromDevice } from '../../shared/services/AppCore';
import { DataManager } from '../../shared/services/DataService';
import Translator from '../../shared/i18n/Translator';
import { tokens, StyleWelcome } from '../../shared/theme/Theme';
import Button from '../../shared/ui/Button';

// ── CONSTANTES ─────────────────────────────────────────────────────────────
const MAXIMUM_NUMBER_ITEMS_GROUPLIST = 10;

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
    { id: 'L1', title: Translator.get('BACHELORS') + ' 1' },
    { id: 'L2', title: Translator.get('BACHELORS') + ' 2' },
    { id: 'L3', title: Translator.get('BACHELORS') + ' 3' },
    { id: 'M1', title: Translator.get('MASTERS') + ' 1' },
    { id: 'M2', title: Translator.get('MASTERS') + ' 2' },
    { id: 'AUTRE', title: Translator.get('OTHER') },
];

const UNIVERSITY_SEASON_LIST = [
    { id: 'autumn', title: 'AUTUMN' },
    { id: 'spring', title: 'SPRING' },
];

const filterSeason = {
    autumn: {
        L1: ['10', 'MIASHS1'], L2: ['30', 'MIASHS3'], L3: ['50', 'MIASHS5'],
        M1: ['M1', '70'], M2: ['M2', '90'], AUTRE: [''],
    },
    spring: {
        L1: ['20', 'MIASHS2'], L2: ['40', 'MIASHS4'], L3: ['60', 'MIASHS6'],
        M1: ['M1', '80'], M2: ['M2', '000', '001', '002', '003', '004'], AUTRE: [''],
    },
};

// ── MINI-COMPOSANTS INTERNES ───────────────────────────────────────────────
const WelcomePagination = ({ pageNumber, maxPage, theme }) => (
    <View style={StyleWelcome[theme].pageDots}>
        {Array.from({ length: pageNumber }).map((_, i) => <View key={`f-${i}`} style={StyleWelcome[theme].circleFill} />)}
        {Array.from({ length: maxPage - pageNumber }).map((_, i) => <View key={`e-${i}`} style={StyleWelcome[theme].circleEmpty} />)}
    </View>
);

const WelcomeBackButton = ({ onPress, visible }) => (
    <TouchableOpacity onPress={onPress} disabled={!visible} style={{ opacity: visible ? 1 : 0, alignSelf: 'flex-start' }}>
        <MaterialIcons style={{ paddingTop: 8, paddingLeft: 4 }} name={'arrow-back'} size={32} color={'white'} />
    </TouchableOpacity>
);

// ── COMPOSANT PRINCIPAL ────────────────────────────────────────────────────
export default function WelcomeScreen() {
    // État local qui remplace la navigation
    const [step, setStep] = useState(1);
    const [navigatorState, setNavigatorState] = useState({
        language: 'fr',
        theme: 'light',
        year: null,
        season: null,
        group: null,
        groupList: DataManager.getGroupList(),
        groupListFiltered: [],
        textFilter: '',
    });

    const changeState = (newState) => setNavigatorState((prev) => ({ ...prev, ...newState }));

    useEffect(() => {
        SettingsManager.on('theme', (newTheme) => changeState({ theme: newTheme }));
        SettingsManager.on('language', (newLang) => changeState({ language: newLang }));
        SettingsManager.on('group', (newGroup) => changeState({ group: newGroup }));
        DataManager.on('groupList', (newGroupList) => changeState({ groupList: newGroupList }));

        const langSystem = languageFromDevice();
        const themeSystem = SettingsManager.getAutomaticTheme();

        SettingsManager.setLanguage(langSystem);
        SettingsManager.setTheme(themeSystem);
    }, []);

    const theme = navigatorState.theme;

    // ── LOGIQUE METIER ───────────────────────────────────────────────────────
    const handleNext = () => setStep((prev) => prev + 1);
    const handleBack = () => setStep((prev) => prev - 1);
    const finishWelcome = () => SettingsManager.setFirstLoad(false);

    const selectTheme = (newTheme) => SettingsManager.setTheme(newTheme.id);
    const selectLanguage = (newLang) => SettingsManager.setLanguage(newLang.id);
    const selectGroup = (group) => SettingsManager.setGroup(navigatorState.group === group ? null : group);

    const filterList = (year, season, textFilter) => {
        let newList = [];
        if (year && season) {
            newList = navigatorState.groupList.filter((e) => {
                const groupName = e.toUpperCase();
                return filterSeason[season.id][year.id].some((filter) =>
                    groupName.includes(filter.toUpperCase()) && groupName.includes(textFilter.toUpperCase())
                );
            });
        }
        changeState({ groupListFiltered: newList, year, season, textFilter });
    };

    const footerTextComponent = () => {
        if (navigatorState.textFilter) {
            if (navigatorState.groupListFiltered.length > MAXIMUM_NUMBER_ITEMS_GROUPLIST) {
                return (
                    <>
                        <Text style={StyleWelcome[theme].greyBottomText}>
                            {Translator.get('HIDDEN_RESULT', navigatorState.groupListFiltered.length - MAXIMUM_NUMBER_ITEMS_GROUPLIST)}
                        </Text>
                        <Text style={StyleWelcome[theme].greyBottomText}>{Translator.get('USE_SEARCH_BAR')}</Text>
                    </>
                );
            } else if (!navigatorState.groupListFiltered.length) {
                return <Text style={StyleWelcome[theme].greyBottomText}>{Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}</Text>;
            }
        }
        return <Text style={StyleWelcome[theme].greyBottomText}>{Translator.get('USE_SEARCH_BAR')}</Text>;
    };

    // ── RENDU ────────────────────────────────────────────────────────────────
    return (
        <LinearGradient
            style={{ flex: 1 }}
            colors={StyleWelcome[theme].gradientColor}
            start={{ x: 0.05, y: 0.05 }}
            end={{ x: 0.95, y: 0.95 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'height' : undefined}>
                    
                    <WelcomeBackButton onPress={handleBack} visible={step > 1} />

                    {/* ÉTAPE 1 */}
                    {step === 1 && (
                        <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl }}>
                            <Image source={require('../../../assets/icons/app.png')} style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: tokens.space.xl, opacity: 0.95 }} />
                            <Text style={StyleWelcome[theme].mainText}>{Translator.get('WELCOME')}</Text>
                            <Text style={StyleWelcome[theme].secondaryText}>{Translator.get('SETTINGS_TO_MAKE')}</Text>
                        </View>
                    )}

                    {/* ÉTAPE 2 */}
                    {step === 2 && (
                        <ScrollView style={{ flexGrow: 1 }} contentContainerStyle={{ paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
                            <View style={StyleWelcome[theme].whiteCard}>
                                <Text style={StyleWelcome[theme].whiteCardText}>{Translator.get('YOUR_THEME')}</Text>
                                {THEME_LIST.map((themeEntry) => {
                                    const selected = navigatorState.theme === themeEntry.id;
                                    return (
                                        <TouchableOpacity key={themeEntry.id} onPress={() => selectTheme(themeEntry)} style={selected ? StyleWelcome[theme].whiteCardButtonSelected : StyleWelcome[theme].whiteCardButton}>
                                            <Text style={selected ? StyleWelcome[theme].whiteCardButtonTextSelected : StyleWelcome[theme].whiteCardButtonText}>{Translator.get(themeEntry.title)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <View style={StyleWelcome[theme].whiteCard}>
                                <Text style={StyleWelcome[theme].whiteCardText}>{Translator.get('YOUR_LANGUAGE')}</Text>
                                {LANGUAGE_LIST.map((langEntry) => {
                                    const selected = navigatorState.language === langEntry.id;
                                    return (
                                        <TouchableOpacity key={langEntry.id} onPress={() => selectLanguage(langEntry)} style={selected ? StyleWelcome[theme].whiteCardButtonSelected : StyleWelcome[theme].whiteCardButton}>
                                            <Text style={selected ? StyleWelcome[theme].whiteCardButtonTextSelected : StyleWelcome[theme].whiteCardButtonText}>{Translator.get(langEntry.title)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}

                    {/* ÉTAPE 3 */}
                    {step === 3 && (
                        <ScrollView style={StyleWelcome[theme].whiteCardContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={StyleWelcome[theme].whiteCard}>
                                <Text style={StyleWelcome[theme].whiteCardText}>{Translator.get('YOUR_YEAR')}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                    {UNIVERSITY_YEARS_LIST.map((yearEntry) => {
                                        const selected = navigatorState.year?.id === yearEntry.id;
                                        return (
                                            <TouchableOpacity key={yearEntry.id} onPress={() => filterList(yearEntry, navigatorState.season, navigatorState.textFilter)} style={selected ? StyleWelcome[theme].whiteCardButtonSelected : StyleWelcome[theme].whiteCardButton}>
                                                <Text style={selected ? StyleWelcome[theme].whiteCardButtonTextSelected : StyleWelcome[theme].whiteCardButtonText}>{Translator.get(yearEntry.title)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={StyleWelcome[theme].whiteCard}>
                                <Text style={StyleWelcome[theme].whiteCardText}>{Translator.get('YOUR_SEMESTER')}</Text>
                                {UNIVERSITY_SEASON_LIST.map((seasonEntry) => {
                                    const selected = navigatorState.season?.id === seasonEntry.id;
                                    return (
                                        <TouchableOpacity key={seasonEntry.id} onPress={() => filterList(navigatorState.year, seasonEntry, navigatorState.textFilter)} style={selected ? StyleWelcome[theme].whiteCardButtonSelected : StyleWelcome[theme].whiteCardButton}>
                                            <Text style={selected ? StyleWelcome[theme].whiteCardButtonTextSelected : StyleWelcome[theme].whiteCardButtonText}>{Translator.get(seasonEntry.title)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={StyleWelcome[theme].whiteCard}>
                                <Text style={StyleWelcome[theme].whiteCardText}>{Translator.get('YOUR_GROUP')}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme === 'dark' ? '#2D1A2E' : '#F5F7FA', borderRadius: tokens.radius.md, borderWidth: 1.5, borderColor: theme === 'dark' ? '#5A3A5C' : '#E0E4EA', paddingHorizontal: tokens.space.sm, marginBottom: tokens.space.sm }}>
                                    <MaterialCommunityIcons name="magnify" size={20} color={StyleWelcome[theme].placeholderTextColor} style={{ marginRight: tokens.space.xs }} />
                                    <TextInput autoCorrect={false} style={[StyleWelcome[theme].whiteCardGroupButton, StyleWelcome[theme].whiteCardGroupText]} defaultValue={navigatorState.textFilter} placeholder={Translator.get('GROUP_NAME')} placeholderTextColor={StyleWelcome[theme].placeholderTextColor} onChangeText={(t) => filterList(navigatorState.year, navigatorState.season, t)} />
                                </View>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {navigatorState.groupListFiltered.slice(0, MAXIMUM_NUMBER_ITEMS_GROUPLIST + 1).map((item) => {
                                        const selected = navigatorState.group === item;
                                        return (
                                            <TouchableOpacity key={item} onPress={() => selectGroup(item)} style={selected ? StyleWelcome[theme].whiteCardButtonSelected : StyleWelcome[theme].whiteCardButton}>
                                                <Text style={selected ? StyleWelcome[theme].whiteCardButtonTextSelected : StyleWelcome[theme].whiteCardButtonText}>{item}</Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                                {footerTextComponent()}
                            </View>
                        </ScrollView>
                    )}

                    {/* ÉTAPE 4 */}
                    {step === 4 && (
                        <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl }}>
                            <View style={{ width: 100, height: 100, borderRadius: tokens.radius.pill, backgroundColor: '#FFFFFF22', justifyContent: 'center', alignItems: 'center', marginBottom: tokens.space.xl }}>
                                <MaterialCommunityIcons name="check-circle-outline" size={60} color="#FFFFFF" />
                            </View>
                            <Text style={StyleWelcome[theme].mainText}>{Translator.get('WELL_DONE')}</Text>
                            <Text style={StyleWelcome[theme].secondaryText}>{Translator.get('APP_READY')}</Text>
                        </View>
                    )}

                    <Button
                        buttonText={step === 4 ? Translator.get('FINISH') : (step === 1 ? Translator.get('START') : Translator.get('NEXT'))}
                        onPress={step === 4 ? finishWelcome : handleNext}
                        theme={theme}
                    />

                    <WelcomePagination pageNumber={step} maxPage={4} theme={theme} />

                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}