import React, { useEffect, useState } from 'react';
import {
    Text, View, Image, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { SettingsManager, languageFromDevice } from '../../shared/services/AppCore';
import { DataManager } from '../../shared/services/DataService';
import Translator from '../../shared/i18n/Translator';
import style, { tokens } from '../../shared/theme/Theme';

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

const WelcomePagination = ({ pageNumber, maxPage, themeObj }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: tokens.space.md }}>
        {Array.from({ length: pageNumber }).map((_, i) => <View key={`f-${i}`} style={{ width: 24, height: 8, marginHorizontal: tokens.space.xs, borderRadius: tokens.radius.md, backgroundColor: themeObj.primary }} />)}
        {Array.from({ length: maxPage - pageNumber }).map((_, i) => <View key={`e-${i}`} style={{ width: 8, height: 8, marginHorizontal: tokens.space.xs, borderRadius: tokens.radius.md, backgroundColor: themeObj.greyBackground }} />)}
    </View>
);

const WelcomeBackButton = ({ onPress, visible, themeObj, topInset }) => (
    <TouchableOpacity 
        onPress={onPress} 
        disabled={!visible} 
        style={{ 
            position: 'absolute', 
            top: (topInset || 0), 
            left: tokens.space.md, 
            zIndex: 10, 
            opacity: visible ? 1 : 0, 
            padding: tokens.space.xs 
        }}
    >
        <MaterialIcons name="arrow-back" size={28} color={themeObj.font} />
    </TouchableOpacity>
);

export default function WelcomeScreen() {
    const [step, setStep] = useState(1);
    const insets = useSafeAreaInsets();
    const [navigatorState, setNavigatorState] = useState({
        language: 'fr',
        theme: 'light',
        year: null,
        season: null,
        groups: [],
        groupList: DataManager.getGroupList(),
        groupListFiltered: [],
        textFilter: '',
    });

    const changeState = (newState) => setNavigatorState((prev) => ({ ...prev, ...newState }));

    useEffect(() => {
        SettingsManager.on('theme', (newTheme) => changeState({ theme: newTheme }));
        SettingsManager.on('language', (newLang) => changeState({ language: newLang }));
        SettingsManager.on('favoriteGroups', (newGroups) => changeState({ groups: newGroups }));
        DataManager.on('groupList', (newGroupList) => changeState({ groupList: newGroupList }));

        const langSystem = languageFromDevice();
        const themeSystem = SettingsManager.getAutomaticTheme();

        SettingsManager.setLanguage(langSystem);
        SettingsManager.setTheme(themeSystem);
    }, []);

    const theme = navigatorState.theme;
    const themeObj = style.Theme[theme];

    const handleNext = () => setStep((prev) => prev + 1);
    const handleBack = () => setStep((prev) => prev - 1);
    const finishWelcome = () => SettingsManager.setFirstLoad(false);

    const selectTheme = (newTheme) => SettingsManager.setTheme(newTheme.id);
    const selectLanguage = (newLang) => SettingsManager.setLanguage(newLang.id);
    const selectGroup = (group) => {
        if (navigatorState.groups.includes(group)) {
            SettingsManager.removeFavoriteGroup(group);
        } else {
            SettingsManager.addFavoriteGroup(group);
        }
    };

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
                    <View style={{ marginTop: tokens.space.sm }}>
                        <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, textAlign: 'center' }}>
                            {Translator.get('HIDDEN_RESULT', navigatorState.groupListFiltered.length - MAXIMUM_NUMBER_ITEMS_GROUPLIST)}
                        </Text>
                        <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, textAlign: 'center', marginTop: 4 }}>
                            {Translator.get('USE_SEARCH_BAR')}
                        </Text>
                    </View>
                );
            } else if (!navigatorState.groupListFiltered.length) {
                return <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.sm, textAlign: 'center' }}>{Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}</Text>;
            }
        }
        return <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.xs, marginTop: tokens.space.sm, textAlign: 'center' }}>{Translator.get('USE_SEARCH_BAR')}</Text>;
    };

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: themeObj.background, paddingTop: (insets.top || 0) - tokens.space.lg }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                
                <WelcomeBackButton onPress={handleBack} visible={step > 1} themeObj={themeObj} topInset={insets.top} />

                {step === 1 && (
                    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: 100 }}>
                        <Image source={require('../../../assets/icons/logo.png')} style={{ width: 200, height: 100, resizeMode: 'contain', marginBottom: tokens.space.xl }} />
                        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELCOME')}</Text>
                        <Text style={{ fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('SETTINGS_TO_MAKE')}</Text>
                    </View>
                )}

                {step === 2 && (
                    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2 }} showsVerticalScrollIndicator={false}>
                        <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.md, borderWidth: 1, borderColor: themeObj.border, ...tokens.shadow.sm }}>
                            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('YOUR_THEME')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {THEME_LIST.map((themeEntry) => {
                                    const selected = navigatorState.theme === themeEntry.id;
                                    return (
                                        <TouchableOpacity key={themeEntry.id} onPress={() => selectTheme(themeEntry)} style={{ backgroundColor: themeObj.greyBackground, borderWidth: 2, borderColor: selected ? themeObj.primary : 'transparent', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>{Translator.get(themeEntry.title)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.md, borderWidth: 1, borderColor: themeObj.border, ...tokens.shadow.sm }}>
                            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('YOUR_LANGUAGE')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {LANGUAGE_LIST.map((langEntry) => {
                                    const selected = navigatorState.language === langEntry.id;
                                    return (
                                        <TouchableOpacity key={langEntry.id} onPress={() => selectLanguage(langEntry)} style={{ backgroundColor: themeObj.greyBackground, borderWidth: 2, borderColor: selected ? themeObj.primary : 'transparent', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>{Translator.get(langEntry.title)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>
                )}

                {step === 3 && (
                    <ScrollView style={{ flexGrow: 1, paddingHorizontal: tokens.space.md }} contentContainerStyle={{ paddingTop: tokens.space.xxl * 2, paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Grande case unique pour toute l'étape */}
                        <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, borderWidth: 1, borderColor: themeObj.border, ...tokens.shadow.sm }}>
                            
                            {/* Section Année */}
                            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('YOUR_YEAR')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: tokens.space.lg }}>
                                {UNIVERSITY_YEARS_LIST.map((yearEntry) => {
                                    const selected = navigatorState.year?.id === yearEntry.id;
                                    return (
                                        <TouchableOpacity 
                                            key={yearEntry.id} 
                                            onPress={() => filterList(yearEntry, navigatorState.season, navigatorState.textFilter)} 
                                            style={{ 
                                                width: '48%', 
                                                alignItems: 'center', 
                                                backgroundColor: themeObj.greyBackground, 
                                                borderWidth: 2, 
                                                borderColor: selected ? themeObj.primary : 'transparent', 
                                                paddingVertical: tokens.space.sm, 
                                                borderRadius: tokens.radius.md, 
                                                marginBottom: tokens.space.sm 
                                            }}
                                        >
                                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>
                                                {Translator.get(yearEntry.title)} {yearEntry.suffix}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Section Semestre */}
                            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('YOUR_SEMESTER')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: tokens.space.lg }}>
                                {UNIVERSITY_SEASON_LIST.map((seasonEntry) => {
                                    const selected = navigatorState.season?.id === seasonEntry.id;
                                    return (
                                        <TouchableOpacity key={seasonEntry.id} onPress={() => filterList(navigatorState.year, seasonEntry, navigatorState.textFilter)} style={{ backgroundColor: themeObj.greyBackground, borderWidth: 2, borderColor: selected ? themeObj.primary : 'transparent', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>{Translator.get(seasonEntry.title)}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Section Groupe */}
                            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('YOUR_GROUP')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeObj.greyBackground, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.sm, marginBottom: tokens.space.md }}>
                                <MaterialCommunityIcons name="magnify" size={20} color={themeObj.fontSecondary} style={{ marginRight: tokens.space.xs }} />
                                <TextInput autoCorrect={false} style={{ flex: 1, paddingVertical: Platform.OS === 'ios' ? tokens.space.md : tokens.space.sm, color: themeObj.font, fontSize: tokens.fontSize.sm }} defaultValue={navigatorState.textFilter} placeholder={Translator.get('GROUP_NAME')} placeholderTextColor={themeObj.fontSecondary} onChangeText={(t) => filterList(navigatorState.year, navigatorState.season, t)} />
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {navigatorState.groupListFiltered.slice(0, MAXIMUM_NUMBER_ITEMS_GROUPLIST + 1).map((item) => {
                                    const selected = navigatorState.groups.includes(item);
                                    return (
                                        <TouchableOpacity key={item} onPress={() => selectGroup(item)} style={{ backgroundColor: themeObj.greyBackground, borderWidth: 2, borderColor: selected ? themeObj.primary : 'transparent', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>{item}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                            {footerTextComponent()}
                        </View>
                    </ScrollView>
                )}

                {step === 4 && (
                    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: 100 }}>
                        <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: tokens.space.xl }}>
                            <MaterialCommunityIcons name="check-circle-outline" size={100} color={themeObj.primary} />
                        </View>
                        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELL_DONE')}</Text>
                        <Text style={{ fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('APP_READY')}</Text>
                    </View>
                )}

                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: (insets.bottom || 0) }}>
                    <View style={{ paddingHorizontal: tokens.space.xl, marginBottom: tokens.space.xs }}>
                        <TouchableOpacity
                            onPress={step === 4 ? finishWelcome : handleNext}
                            style={{
                                backgroundColor: themeObj.primary,
                                borderRadius: tokens.radius.md,
                                paddingVertical: tokens.space.md,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ color: '#ffffff', fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                                {step === 4 ? Translator.get('FINISH') : (step === 1 ? Translator.get('START') : Translator.get('NEXT'))}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <WelcomePagination pageNumber={step} maxPage={4} themeObj={themeObj} />
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}