import React, { useEffect, useState, useRef } from 'react';
import {
    Text, View, Image, ScrollView,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { SettingsManager, languageFromDevice } from '../../shared/services/AppCore';
import { PlanningDataManager as DataManager } from '../Planning/services/PlanningDataManager';
import Translator from '../../shared/i18n/Translator';
import style, { tokens } from '../../shared/theme/Theme';
import OnboardingScheduleView from './OnboardingScheduleView';
import ICalTutorialModal from './ICalTutorialModal';
import { BottomSheetModalProvider, BottomSheetModal } from '@gorhom/bottom-sheet';
import { UnifiedTouchable } from '../../shared/ui/UnifiedTouchable';
import { AuthenticationService } from './services/AuthenticationService';
import type { InstitutionDomain } from './services/AuthenticationService';

const THEME_LIST = [
    { id: 'light', title: 'LIGHT_THEME' },
    { id: 'dark', title: 'DARK_THEME' },
];

const LANGUAGE_LIST = [
    { id: 'fr', title: 'FRENCH' },
    { id: 'en', title: 'ENGLISH' },
    { id: 'es', title: 'SPANISH' },
];

const COLLEGE_LIST: { id: InstitutionDomain; title: string }[] = [
    { id: 'SCIENCES_TECH', title: 'SCIENCES_TECH' },
    { id: 'DROIT_ECO_GESTION', title: 'DROIT_ECO_GESTION' },
    { id: 'SANTE', title: 'SANTE' },
    { id: 'SCIENCES_HOMME', title: 'SCIENCES_HOMME' },
    { id: 'IUT_BORDEAUX', title: 'IUT_BORDEAUX' },
    { id: 'BORDEAUX_MONTAIGNE', title: 'BORDEAUX_MONTAIGNE' },
    { id: 'BORDEAUX_INP', title: 'BORDEAUX_INP' },
];

const WelcomePagination = ({ pageNumber, maxPage, themeObj }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: tokens.space.md }}>
        {Array.from({ length: maxPage }).map((_, i) => {
            const isActive = i + 1 <= pageNumber;
            return (
                <View 
                    key={`dot-${i}`} 
                    style={{ 
                        width: isActive ? 24 : 8, 
                        height: 8, 
                        marginHorizontal: tokens.space.xs, 
                        borderRadius: tokens.radius.md, 
                        backgroundColor: isActive ? themeObj.primary : themeObj.greyBackground 
                    }} 
                />
            );
        })}
    </View>
);

const WelcomeBackButton = ({ onPress, visible, themeObj }: any) => (
    <UnifiedTouchable 
        onPress={onPress} 
        disabled={!visible} 
        style={{ 
            position: 'absolute', 
            top: tokens.space.md, 
            left: tokens.space.md, 
            zIndex: 10, 
            opacity: visible ? 1 : 0, 
            padding: tokens.space.xs 
        }}
    >
        <MaterialIcons name="arrow-back" size={28} color={themeObj.font} />
    </UnifiedTouchable>
);

const Step1 = ({ themeObj }) => (
    <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: 100 }}>
        <Image source={require('../../../assets/icons/logo.png')} style={{ width: 200, height: 100, resizeMode: 'contain', marginBottom: tokens.space.xl }} />
        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELCOME')}</Text>
        <Text style={{ fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('SETTINGS_TO_MAKE')}</Text>
    </View>
);

const Step2 = ({ themeObj, navigatorState, selectTheme, selectLanguage }) => (
    <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.md, paddingTop: tokens.space.xxl * 2 }}>
        <View style={{ backgroundColor: themeObj.cardBackground, borderRadius: tokens.radius.lg, padding: tokens.space.md, marginBottom: tokens.space.md, borderWidth: 1, borderColor: themeObj.border, ...tokens.shadow.sm }}>
            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('YOUR_THEME')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {THEME_LIST.map((themeEntry) => {
                    const selected = navigatorState.theme === themeEntry.id;
                    return (
                        <UnifiedTouchable key={themeEntry.id} onPress={() => selectTheme(themeEntry)} style={{ backgroundColor: themeObj.greyBackground, borderWidth: 2, borderColor: selected ? themeObj.primary : 'transparent', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>{Translator.get(themeEntry.title as Parameters<typeof Translator.get>[0])}</Text>
                        </UnifiedTouchable>
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
                        <UnifiedTouchable key={langEntry.id} onPress={() => selectLanguage(langEntry)} style={{ backgroundColor: themeObj.greyBackground, borderWidth: 2, borderColor: selected ? themeObj.primary : 'transparent', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, marginBottom: tokens.space.sm }}>
                            <Text style={{ color: selected ? themeObj.primary : themeObj.fontSecondary, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.sm }}>{Translator.get(langEntry.title as Parameters<typeof Translator.get>[0])}</Text>
                        </UnifiedTouchable>
                    );
                })}
            </View>
        </View>
    </View>
);

const Step3 = ({ themeObj, navigatorState, selectCollege }) => (
    <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.md, paddingTop: tokens.space.xxl * 2, paddingBottom: tokens.space.xl }}>
        <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.md }}>{Translator.get('COLLEGE_SELECTION_TITLE')}</Text>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tokens.space.xxl }}>
            {COLLEGE_LIST.map((collegeEntry) => {
                const selected = navigatorState.collegeId === collegeEntry.id;
                return (
                    <UnifiedTouchable 
                        key={collegeEntry.id} 
                        onPress={() => selectCollege(collegeEntry.id)} 
                        style={{ 
                            backgroundColor: themeObj.cardBackground, 
                            borderWidth: 2, 
                            borderColor: selected ? themeObj.primary : themeObj.border, 
                            paddingVertical: tokens.space.lg, 
                            paddingHorizontal: tokens.space.md, 
                            borderRadius: tokens.radius.lg, 
                            marginBottom: tokens.space.sm,
                            ...tokens.shadow.sm
                        }}
                    >
                        <Text style={{ color: selected ? themeObj.primary : themeObj.font, fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium, fontSize: tokens.fontSize.md }}>
                            {Translator.get(collegeEntry.title as Parameters<typeof Translator.get>[0])}
                        </Text>
                    </UnifiedTouchable>
                );
            })}
        </ScrollView>
    </View>
);

const Step4 = ({ themeObj, navigatorState, changeState, setStep }) => (
    <View style={{ flexGrow: 1, paddingTop: tokens.space.xxl * 2 }}>
        <View style={{ alignItems: 'center', paddingHorizontal: tokens.space.lg, marginBottom: tokens.space.lg }}>
            <View style={{ width: 72, height: 72, borderRadius: tokens.radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: tokens.space.md, backgroundColor: themeObj.primary + '1A' }}>
                <MaterialCommunityIcons name="school-outline" size={36} color={themeObj.primary} />
            </View>
            <Text style={{ fontSize: tokens.fontSize.xl, fontWeight: '600', marginBottom: tokens.space.xs, color: themeObj.font }}>
                {Translator.get('SSO_LOGIN_TITLE')}
            </Text>
            <Text style={{ fontSize: tokens.fontSize.sm, textAlign: 'center', lineHeight: 20, color: themeObj.fontSecondary }}>
                {Translator.get('ENTER_CREDENTIALS_DESC')}
            </Text>
        </View>

        <View style={{ marginHorizontal: tokens.space.md, padding: tokens.space.md, borderRadius: tokens.radius.lg, borderWidth: 1, backgroundColor: themeObj.cardBackground, borderColor: themeObj.border }}>
            <TextInput
                style={{ height: 50, borderRadius: tokens.radius.md, borderWidth: 1, paddingHorizontal: tokens.space.md, fontSize: tokens.fontSize.md, backgroundColor: themeObj.background, color: themeObj.font, borderColor: themeObj.border }}
                placeholder={Translator.get('USERNAME')}
                placeholderTextColor={themeObj.fontSecondary}
                value={navigatorState.username}
                onChangeText={(t) => changeState({ username: t })}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TextInput
                style={{ height: 50, borderRadius: tokens.radius.md, borderWidth: 1, paddingHorizontal: tokens.space.md, fontSize: tokens.fontSize.md, backgroundColor: themeObj.background, color: themeObj.font, borderColor: themeObj.border, marginTop: tokens.space.sm }}
                placeholder={Translator.get('PASSWORD')}
                placeholderTextColor={themeObj.fontSecondary}
                value={navigatorState.password}
                onChangeText={(t) => changeState({ password: t })}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
            />
        </View>

        <UnifiedTouchable 
            onPress={() => {
                changeState({ loginState: 'failed' });
                setStep(5);
            }} 
            style={{ marginTop: tokens.space.xl, alignItems: 'center' }}
        >
            <Text style={{ color: themeObj.fontSecondary, fontSize: tokens.fontSize.sm, fontWeight: '600' }}>
                {Translator.get('SKIP_LOGIN')}
            </Text>
        </UnifiedTouchable>
    </View>
);

const LOADING_STEPS = [
    { key: 'connecting', labelKey: 'LOADING_CONNECTING', icon: 'shield-lock-outline' },
    { key: 'authenticating', labelKey: 'LOADING_AUTHENTICATING', icon: 'account-key-outline' },
    { key: 'fetching', labelKey: 'LOADING_SCHEDULE', icon: 'calendar-sync-outline' },
] as const;

const stepIndex = (step) => LOADING_STEPS.findIndex((s) => s.key === step);

const Step5 = ({ themeObj, navigatorState, onOpenTutorial, handleNext }) => {
    if (navigatorState.loginState === 'loading') {
        const currentIdx = stepIndex(navigatorState.loginProgress ?? 'connecting');
        return (
            <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.xl, paddingTop: tokens.space.xxl * 2, alignItems: 'center' }}>
                <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, marginBottom: tokens.space.xl, textAlign: 'center' }}>
                    {Translator.get('SSO_LOGIN_TITLE')}
                </Text>
                <View style={{ width: '100%', gap: tokens.space.md }}>
                    {LOADING_STEPS.map((step, idx) => {
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        const isPending = idx > currentIdx;

                        return (
                            <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.md }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: isDone ? themeObj.primary + '22' : isCurrent ? themeObj.primary + '11' : themeObj.cardBackground + '55',
                                }}>
                                    {isDone ? (
                                        <MaterialCommunityIcons name="check-circle" size={22} color={themeObj.primary} />
                                    ) : isCurrent ? (
                                        <ActivityIndicator size="small" color={themeObj.primary} />
                                    ) : (
                                        <MaterialCommunityIcons name={step.icon} size={22} color={themeObj.fontSecondary} />
                                    )}
                                </View>
                                <Text style={[
                                    { flex: 1, fontSize: tokens.fontSize.md },
                                    { fontWeight: isCurrent ? tokens.fontWeight.bold : tokens.fontWeight.medium },
                                    { color: isDone ? themeObj.primary : isCurrent ? themeObj.font : themeObj.fontSecondary },
                                    isPending && { opacity: 0.4 },
                                ]}>
                                    {Translator.get(step.labelKey)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    }
    
    if (navigatorState.loginState === 'success') {
        return (
            <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.xl, paddingBottom: 100 }}>
                <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: tokens.space.xl }}>
                    <MaterialCommunityIcons name="check-circle-outline" size={100} color={themeObj.primary} />
                </View>
                <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: themeObj.font, textAlign: 'center', marginBottom: tokens.space.sm }}>{Translator.get('WELL_DONE')}</Text>
                <Text style={{ fontSize: tokens.fontSize.md, color: themeObj.fontSecondary, textAlign: 'center', lineHeight: 24 }}>{Translator.get('APP_READY')}</Text>
            </View>
        );
    }

    if (navigatorState.loginState === 'failed') {
        return (
            <View style={{ flexGrow: 1, paddingHorizontal: tokens.space.md, paddingTop: tokens.space.xxl }}>
                <OnboardingScheduleView 
                    themeObj={themeObj} 
                    onComplete={handleNext} 
                    onOpenTutorial={onOpenTutorial}
                />
            </View>
        );
    }

    return null;
};

export default function WelcomeScreen() {
    const [step, setStep] = useState(1);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [navigatorState, setNavigatorState] = useState({
        language: 'fr',
        theme: 'light',
        collegeId: 'SCIENCES_TECH' as InstitutionDomain,
        username: '',
        password: '',
        loginState: 'idle', // 'idle' | 'loading' | 'success' | 'failed'
        loginProgress: 'connecting',
    });

    const changeState = (newState) => setNavigatorState((prev) => ({ ...prev, ...newState }));

    useEffect(() => {
        SettingsManager.on('theme', (newTheme) => changeState({ theme: newTheme }));
        SettingsManager.on('language', (newLang) => changeState({ language: newLang }));

        const langSystem = languageFromDevice();
        const themeSystem = SettingsManager.getAutomaticTheme();

        SettingsManager.setLanguage(langSystem);
        SettingsManager.setTheme(themeSystem);
    }, []);

    const theme = navigatorState.theme;
    const themeObj = style.Theme[theme];

    const performLogin = async () => {
        changeState({ loginState: 'loading', loginProgress: 'connecting' });
        const result = await AuthenticationService.login(
            navigatorState.collegeId, 
            navigatorState.username, 
            navigatorState.password,
            (step) => changeState({ loginProgress: step })
        );
        if (result.success) {
            SettingsManager.setScheduleSource({ type: 'ical_url', url: result.data.scheduleUrl });
            changeState({ loginState: 'success' });
        } else {
            changeState({ loginState: 'failed' });
        }
    };

    const handleNext = async () => {
        if (step === 4) {
            setStep(5);
            await performLogin();
            return;
        }
        if (step === 5 && navigatorState.loginState === 'failed') {
            // If they complete the fallback, it handles completion
            SettingsManager.setFirstLoad(false);
            return;
        }
        setStep((prev) => prev + 1);
    };

    const handleBack = () => {
        if (step === 5 && navigatorState.loginState === 'failed') {
            setStep(4);
            changeState({ loginState: 'idle' });
            return;
        }
        setStep((prev) => prev - 1);
    };
    
    const finishWelcome = () => SettingsManager.setFirstLoad(false);

    const selectTheme = (newTheme) => SettingsManager.setTheme(newTheme.id);
    const selectLanguage = (newLang) => SettingsManager.setLanguage(newLang.id);
    const selectCollege = (collegeId) => changeState({ collegeId });

    // Determine if next button should be disabled
    const isNextDisabled = () => {
        if (step === 3 && !navigatorState.collegeId) return true;
        if (step === 4 && (!navigatorState.username || !navigatorState.password)) return true;
        return false;
    };

    // Determine if bottom navigation should be shown
    const showBottomNavigation = step < 5 || (step === 5 && navigatorState.loginState === 'success');

    return (
        <BottomSheetModalProvider>
            <SafeAreaView edges={['left', 'right', 'bottom', 'top']} style={{ flex: 1, backgroundColor: themeObj.background }}>
                <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ flex: 1 }}>
                
                <WelcomeBackButton onPress={handleBack} visible={step > 1 && !(step === 5 && navigatorState.loginState === 'loading') && !(step === 5 && navigatorState.loginState === 'success')} themeObj={themeObj} />

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {step === 1 && <Step1 themeObj={themeObj} />}
                    {step === 2 && <Step2 themeObj={themeObj} navigatorState={navigatorState} selectTheme={selectTheme} selectLanguage={selectLanguage} />}
                    {step === 3 && <Step3 themeObj={themeObj} navigatorState={navigatorState} selectCollege={selectCollege} />}
                    {step === 4 && <Step4 themeObj={themeObj} navigatorState={navigatorState} changeState={changeState} setStep={setStep} />}
                    {step === 5 && <Step5 themeObj={themeObj} navigatorState={navigatorState} onOpenTutorial={() => bottomSheetModalRef.current?.present()} handleNext={finishWelcome} />}
                </ScrollView>

                {showBottomNavigation && (
                    <View style={{ paddingHorizontal: tokens.space.xl, paddingBottom: tokens.space.md, paddingTop: tokens.space.sm }}>
                        <UnifiedTouchable
                            onPress={(step === 5 && navigatorState.loginState === 'success') ? finishWelcome : handleNext}
                            disabled={isNextDisabled()}
                            style={{
                                backgroundColor: isNextDisabled() ? themeObj.greyBackground : themeObj.primary,
                                borderRadius: tokens.radius.md,
                                paddingVertical: tokens.space.md,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ color: isNextDisabled() ? themeObj.fontSecondary : '#ffffff', fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold }}>
                                {(step === 5 && navigatorState.loginState === 'success') ? Translator.get('FINISH') : (step === 1 ? Translator.get('START') : Translator.get('NEXT'))}
                            </Text>
                        </UnifiedTouchable>
                        <WelcomePagination pageNumber={step} maxPage={5} themeObj={themeObj} />
                    </View>
                )}

                </KeyboardAvoidingView>
                <ICalTutorialModal ref={bottomSheetModalRef} themeObj={themeObj} />
            </SafeAreaView>
        </BottomSheetModalProvider>
    );
}
