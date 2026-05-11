import React from 'react';
import { SafeAreaView, SafeAreaInsetsContext} from 'react-native-safe-area-context';
import { Linking, Text, View, Animated, StyleSheet } from 'react-native';
import * as Calendar from 'expo-calendar';

import { AppContext, SettingsManager } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import style, { tokens } from '../../shared/theme/Theme';
import Button from '../../shared/ui/Button';


import {
    SettingsLanguagePopup,
    SettingsFiltersPopup,
    SettingsResetPopup,
    SettingsCalendarPopup
} from './SettingsModals';

const LANGUAGE_LIST = {
    fr: 'FRENCH',
    en: 'ENGLISH',
    es: 'SPANISH',
};

const SettingsTextHeader = ({ theme, text }) => {
    if (!theme?.separationText) return null;
    return <Text style={theme.separationText}>{text.toUpperCase()}</Text>;
};

class Settings extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            calendarDialogVisible: false,
            calendarSyncEnabled: SettingsManager.getCalendarSyncEnabled(),
            calendars: SettingsManager.getCalendars(),
            filterList: SettingsManager.getFilters(),
            filterTextInput: null,
            filtersDialogVisible: false,
            hasCalendarPermission: false,
            isSynchronizingCalendar: SettingsManager.isSynchronizingCalendar(),
            language: SettingsManager.getLanguage(),
            languageDialogVisible: false,
            openFavSwitchValue: SettingsManager.getOpenAppOnFavoriteGroup(),
            resetDialogVisible: false,
            selectedCalendar: SettingsManager.getSyncCalendar(),
            isDarkMode: SettingsManager.getTheme() === 'dark',
        };
        this.scrollY = new Animated.Value(0);

    }

    setCalendar = (calendar) => {
        if (calendar === 'UKit') {
            this.setState({ selectedCalendar: calendar });
            SettingsManager.setSyncCalendar(calendar);
        } else {
            this.setState({ selectedCalendar: calendar.id });
            SettingsManager.setSyncCalendar(calendar.id);
        }
    };

    setSelectedLanguage = (newLang) => {
        this.setState({ language: newLang });
        SettingsManager.setLanguage(newLang);
    };

    setLanguageToFrench = () => { if (this.state.language !== 'fr') this.setSelectedLanguage('fr'); };
    setLanguageToEnglish = () => { if (this.state.language !== 'en') this.setSelectedLanguage('en'); };
    setLanguageToSpanish = () => { if (this.state.language !== 'es') this.setSelectedLanguage('es'); };

    refreshFiltersList = () => this.setState({ filterList: SettingsManager.getFilters() });
    addFilters = (filter) => SettingsManager.addFilters(filter.toUpperCase());

    toggleOpenFavSwitchValue = () => {
        this.setState({ openFavSwitchValue: !this.state.openFavSwitchValue }, () => {
            SettingsManager.setOpenAppOnFavoriteGroup(this.state.openFavSwitchValue);
        });
    };

    toggleTheme = () => {
        SettingsManager.switchTheme();
        this.setState({ isDarkMode: SettingsManager.getTheme() === 'dark' });
    };

    toggleCalendarSync = async () => {
        if ((await Calendar.getCalendarPermissionsAsync()).status !== 'granted') {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') return;
        }

        if (!this.state.calendars.length) {
            await SettingsManager.loadCalendars();
        }

        this.setState(
            { calendarSyncEnabled: !this.state.calendarSyncEnabled, calendars: SettingsManager.getCalendars() },
            () => SettingsManager.setCalendarSyncEnabled(this.state.calendarSyncEnabled)
        );
    };

    openSystemAppSettings = () => Linking.openSettings();
    setIsSynchronizingCalendar = (newState) => this.setState({ isSynchronizingCalendar: newState });
    setFilterTextInput = (input) => this.setState({ filterTextInput: input.toUpperCase() });
    submitFilterTextInput = () => {
        if (this.state.filterTextInput) {
            this.addFilters(this.state.filterTextInput);
        }
    };

    openLanguageDialog = () => this.setState({ languageDialogVisible: true });
    closeLanguageDialog = () => this.setState({ languageDialogVisible: false });

    openFiltersDialog = () => this.setState({ filtersDialogVisible: true });
    closeFiltersDialog = () => this.setState({ filtersDialogVisible: false });

    openResetDialog = () => this.setState({ resetDialogVisible: true });
    closeResetDialog = () => this.setState({ resetDialogVisible: false });

    openCalendarDialog = () => this.setState({ calendarDialogVisible: true });
    closeCalendarDialog = () => this.setState({ calendarDialogVisible: false });

    resetApp = () => {
        this.closeResetDialog();
        SettingsManager.resetSettings();
    };

    componentDidMount = async () => {
        if ((await Calendar.getCalendarPermissionsAsync()).status === 'granted') {
            this.setState({ hasCalendarPermission: true });
        } else {
            this.toggleCalendarSync();
        }
        SettingsManager.on('isSynchronizingCalendar', this.setIsSynchronizingCalendar);
        SettingsManager.on('filter', this.refreshFiltersList);
    };

    componentWillUnmount = () => {
        SettingsManager.unsubscribe('isSynchronizingCalendar', this.setIsSynchronizingCalendar);
        SettingsManager.unsubscribe('filter', this.refreshFiltersList);
    };

    render() {
        const themeName = this.context.themeName ?? 'light';
        const theme = style.Theme[themeName];
        const themeSettings = theme.settings;
        const calendar = this.state.calendars.find((cal) => this.state.selectedCalendar === cal.id);
        const calendarName = !!calendar ? calendar.title : this.state.selectedCalendar === 'UKit' ? 'UKit' : Translator.get('NOT_FOUND');
        const lastSyncDate = SettingsManager.getLastSyncDate();

        const renderHeader = (insets) => {
            const topPadding = (insets?.top || 0);

            const opacity = this.scrollY.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0],
                extrapolate: 'clamp'
            });

            return (
                <Animated.View style={[styles.headerContainer, { paddingTop: topPadding, backgroundColor: 'transparent', opacity }]}>
                    <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                        <Text style={[styles.greetingText, { color: theme.font }]}>
                            {Translator.get('SETTINGS') || 'Paramètres'}
                        </Text>
                    </View>
                </Animated.View>
            );
        };

        return (
            <SafeAreaInsetsContext.Consumer>
                {(insets) => (
                    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                        {renderHeader(insets)}
                        <Animated.ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingTop: (insets?.top || 0) + 60, paddingBottom: tokens.space.xxl + 80 }}
                            showsVerticalScrollIndicator={false}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: this.scrollY } } }],
                                { useNativeDriver: true }
                            )}
                            scrollEventThrottle={16}
                        >

                    {/* ── Affichage ─────────────────────────────────────── */}
                    <SettingsTextHeader theme={themeSettings} text={Translator.get('DISPLAY')} />
                    
                    <Button
                        theme={themeSettings}
                        onPress={this.openLanguageDialog}
                        leftIcon="language"
                        leftText={Translator.get('LANGUAGE')}
                        rightText={Translator.get(LANGUAGE_LIST[this.state.language])}
                    />
                    <Button
                        theme={themeSettings}
                        onPress={this.openFiltersDialog}
                        leftIcon="filter-list"
                        leftText={Translator.get('FILTERS')}
                        rightText="..."
                    />

                    {/* ── Thème ─────────────────────────────────────── */}
                    <SettingsTextHeader theme={themeSettings} text={Translator.get('THEME') || 'Thème'} />
                    <Button
                        theme={themeSettings}
                        leftIcon="theme-light-dark"
                        leftText={Translator.get('DARK_MODE') || 'Mode Sombre'}
                        onSwitchToggle={this.toggleTheme}
                        switchValue={this.state.isDarkMode}
                    />

                    {/* ── Lancement ─────────────────────────────────────── */}
                    <SettingsTextHeader theme={themeSettings} text={Translator.get('APP_LAUNCHING')} />
                    
                    <Button
                        theme={themeSettings}
                        leftIcon="star"
                        leftText={Translator.get('OPEN_ON_FAVOURITE_GROUP')}
                        onSwitchToggle={this.toggleOpenFavSwitchValue}
                        switchValue={this.state.openFavSwitchValue}
                    />
                    <Button
                        theme={themeSettings}
                        onPress={this.openResetDialog}
                        leftIcon="autorenew"
                        leftText={Translator.get('RESET_APP')}
                    />

                    {/* ── Calendrier ────────────────────────────────────── */}
                    <SettingsTextHeader theme={themeSettings} text={Translator.get('CALENDAR_SYNCHRONIZATION')} />

                    {this.state.hasCalendarPermission ? (
                        <>
                            {/* Remplacement du marginBottom par un marginTop */}
                            <View style={{ backgroundColor: theme.cardBackground, borderRadius: tokens.radius.lg, marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, padding: tokens.space.md, borderWidth: 1, borderColor: theme.border }}>
                                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, lineHeight: 20, marginBottom: tokens.space.xs }}>
                                    {Translator.get('AUTO_SYNC_DESCRIPTION')}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: tokens.space.xs }}>
                                    <View style={{ width: 8, height: 8, borderRadius: tokens.radius.md, backgroundColor: lastSyncDate ? '#43A047' : theme.fontSecondary, marginRight: tokens.space.sm }} />
                                    <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                                        {lastSyncDate ? `${Translator.get('LAST_SYNCHRONIZATION')} : ${lastSyncDate.format('LLL')}` : Translator.get('NO_SYNCHRONIZATION_DONE')}
                                    </Text>
                                </View>
                            </View>

                            <Button
                                theme={themeSettings}
                                leftIcon="sync-disabled"
                                leftText={Translator.get('SYNC_ENABLED')}
                                onSwitchToggle={this.toggleCalendarSync}
                                switchValue={this.state.calendarSyncEnabled}
                            />
                            <Button
                                theme={themeSettings}
                                onPress={this.openCalendarDialog}
                                leftIcon="calendar-today"
                                leftText={Translator.get('CALENDAR')}
                                rightText={calendarName}
                            />
                            <Button
                                theme={themeSettings}
                                onPress={SettingsManager.syncCalendar}
                                disabled={this.state.selectedCalendar !== -1 && this.state.isSynchronizingCalendar}
                                leftIconAnimation={this.state.isSynchronizingCalendar ? 'rotate' : ''}
                                leftIcon="sync"
                                leftText={this.state.isSynchronizingCalendar ? Translator.get('SYNCHRONIZING') : Translator.get('FORCE_SYNC')}
                            />
                        </>
                    ) : (
                        <>
                            <View style={{ backgroundColor: `${tokens.colors?.orange ?? '#E65100'}18`, borderRadius: tokens.radius.lg, marginHorizontal: tokens.space.md, marginTop: tokens.space.sm, padding: tokens.space.md, borderWidth: 1, borderColor: `${tokens.colors?.orange ?? '#E65100'}40`, flexDirection: 'row', alignItems: 'flex-start' }}>
                                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.font, lineHeight: 20, flex: 1 }}>
                                    {Translator.get('ENABLE_CALENDAR_PERMISSION_DESCRIPTION')}
                                </Text>
                            </View>
                            <Button
                                theme={themeSettings}
                                onPress={this.openSystemAppSettings}
                                leftIcon="settings"
                                leftText={Translator.get('OPEN_SYSTEM_SETTINGS')}
                            />
                        </>
                    )}

                    {/* ── Popups ────────────────────────────────────────── */}
                    <SettingsLanguagePopup theme={themeSettings} popupVisible={this.state.languageDialogVisible} popupClose={this.closeLanguageDialog} language={this.state.language} setLanguageToFrench={this.setLanguageToFrench} setLanguageToEnglish={this.setLanguageToEnglish} setLanguageToSpanish={this.setLanguageToSpanish} />
                    <SettingsFiltersPopup theme={themeSettings} popupVisible={this.state.filtersDialogVisible} popupClose={this.closeFiltersDialog} filterList={this.state.filterList} filterTextInput={this.state.filterTextInput} setFilterTextInput={this.setFilterTextInput} submitFilterTextInput={this.submitFilterTextInput} />
                    <SettingsResetPopup theme={themeSettings} popupVisible={this.state.resetDialogVisible} popupClose={this.closeResetDialog} resetApp={this.resetApp} />
                    <SettingsCalendarPopup theme={themeSettings} popupVisible={this.state.calendarDialogVisible} popupClose={this.closeCalendarDialog} setCalendar={this.setCalendar} selectedCalendar={this.state.selectedCalendar} />
                </Animated.ScrollView>
            </SafeAreaView>
                )}
            </SafeAreaInsetsContext.Consumer>
        );
    }
}

const styles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 34,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: tokens.space.md,
    },
});

export default Settings;