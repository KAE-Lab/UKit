import React from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Linking, Text, View, Animated, StyleSheet } from 'react-native';
import * as Calendar from 'expo-calendar';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { NotificationManager } from '../../../shared/services/NotificationService';

import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import style, { tokens } from '../../../shared/theme/Theme';
import Button from '../../../shared/ui/Button';


import {
    SettingsLanguagePopup,
    SettingsFiltersPopup,
    SettingsResetPopup,
    SettingsCalendarPopup
} from '../components/SettingsModals';

import {
    DisplaySection,
    ThemeSection,
    NotificationsSection,
    AppLaunchingSection,
    CalendarSection
} from '../components/SettingsSections';

export interface SettingsProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export interface SettingsState {
    calendarDialogVisible: boolean;
    calendarSyncEnabled: boolean;
    calendars: import('expo-calendar').Calendar[];
    filterList: string[];
    filterTextInput: string | null;
    filtersDialogVisible: boolean;
    hasCalendarPermission: boolean;
    isSynchronizingCalendar: boolean;
    language: string;
    languageDialogVisible: boolean;
    openFavSwitchValue: boolean;
    resetDialogVisible: boolean;
    selectedCalendar: string | number;
    isDarkMode: boolean;
    courseNotificationsEnabled: boolean;
    courseNotificationDelay: number;
}

class Settings extends React.Component<SettingsProps, SettingsState> {
    static contextType = AppContext;
    // @ts-ignore
    context!: React.ContextType<typeof AppContext>;
    scrollY: Animated.Value;

    constructor(props: SettingsProps) {
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
            courseNotificationsEnabled: SettingsManager.getCourseNotificationsEnabled(),
            courseNotificationDelay: SettingsManager.getCourseNotificationDelay(),
        };
        this.scrollY = new Animated.Value(0);

    }

    setCalendar = (calendar: import('expo-calendar').Calendar | 'UKit') => {
        if (calendar === 'UKit') {
            this.setState({ selectedCalendar: calendar });
            SettingsManager.setSyncCalendar(calendar);
        } else {
            this.setState({ selectedCalendar: calendar.id });
            SettingsManager.setSyncCalendar(calendar.id);
        }
    };

    setSelectedLanguage = (newLang: string) => {
        this.setState({ language: newLang });
        SettingsManager.setLanguage(newLang);
    };

    setLanguageToFrench = () => { if (this.state.language !== 'fr') this.setSelectedLanguage('fr'); };
    setLanguageToEnglish = () => { if (this.state.language !== 'en') this.setSelectedLanguage('en'); };
    setLanguageToSpanish = () => { if (this.state.language !== 'es') this.setSelectedLanguage('es'); };

    refreshFiltersList = () => this.setState({ filterList: SettingsManager.getFilters() });
    addFilters = (filter: string) => SettingsManager.addFilters(filter.toUpperCase());

    toggleOpenFavSwitchValue = () => {
        this.setState({ openFavSwitchValue: !this.state.openFavSwitchValue }, () => {
            SettingsManager.setOpenAppOnFavoriteGroup(this.state.openFavSwitchValue);
        });
    };

    toggleTheme = () => {
        SettingsManager.switchTheme();
        this.setState({ isDarkMode: SettingsManager.getTheme() === 'dark' });
    };

    toggleCourseNotifications = async () => {
        const newValue = !this.state.courseNotificationsEnabled;
        if (newValue) {
            await NotificationManager.requestPermissionsAsync();
        }
        this.setState({ courseNotificationsEnabled: newValue }, async () => {
            SettingsManager.setCourseNotificationsEnabled(newValue);

            const favGroups = SettingsManager.getFavoriteGroups();
            if (favGroups && favGroups.length > 0) {
                const groupPrefix = favGroups.join('+');
                const currentWeek = moment().isoWeek();
                const id = `${groupPrefix}@Week${currentWeek}`;
                const cache = await AsyncStorage.getItem(id);
                if (cache) {
                    const parsed = JSON.parse(cache);
                    if (parsed && parsed.data) {
                        NotificationManager.scheduleCourseNotifications(parsed.data).catch(() => { });
                    }
                }
            }
        });
    };

    onNotificationDelayChange = (value: number) => {
        this.setState({ courseNotificationDelay: value });
    };

    onNotificationDelaySlidingComplete = async (value: number) => {
        SettingsManager.setCourseNotificationDelay(value);
        if (this.state.courseNotificationsEnabled) {
            const favGroups = SettingsManager.getFavoriteGroups();
            if (favGroups && favGroups.length > 0) {
                const groupPrefix = favGroups.join('+');
                const currentWeek = moment().isoWeek();
                const id = `${groupPrefix}@Week${currentWeek}`;
                const cache = await AsyncStorage.getItem(id);
                if (cache) {
                    const parsed = JSON.parse(cache);
                    if (parsed && parsed.data) {
                        NotificationManager.scheduleCourseNotifications(parsed.data).catch(() => { });
                    }
                }
            }
        }
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
    setIsSynchronizingCalendar = (newState: boolean) => this.setState({ isSynchronizingCalendar: newState });
    setFilterTextInput = (input: string) => this.setState({ filterTextInput: input.toUpperCase() });
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



    renderPopups(themeSettings: import('../../../shared/theme/Theme').AppThemeType['settings']) {
        return (
            <>
                <SettingsLanguagePopup theme={themeSettings} popupVisible={this.state.languageDialogVisible} popupClose={this.closeLanguageDialog} language={this.state.language} setLanguageToFrench={this.setLanguageToFrench} setLanguageToEnglish={this.setLanguageToEnglish} setLanguageToSpanish={this.setLanguageToSpanish} />
                <SettingsFiltersPopup theme={themeSettings} popupVisible={this.state.filtersDialogVisible} popupClose={this.closeFiltersDialog} filterList={this.state.filterList} filterTextInput={this.state.filterTextInput} setFilterTextInput={this.setFilterTextInput} submitFilterTextInput={this.submitFilterTextInput} />
                <SettingsResetPopup theme={themeSettings} popupVisible={this.state.resetDialogVisible} popupClose={this.closeResetDialog} resetApp={this.resetApp} />
                <SettingsCalendarPopup theme={themeSettings} popupVisible={this.state.calendarDialogVisible} popupClose={this.closeCalendarDialog} setCalendar={this.setCalendar} selectedCalendar={this.state.selectedCalendar} />
            </>
        );
    }

    render() {
        const themeName = this.context.themeName ?? 'light';
        const theme = style.Theme[themeName];
        const themeSettings = theme.settings;
        const calendar = this.state.calendars.find((cal) => this.state.selectedCalendar === cal.id);
        const calendarName = !!calendar ? calendar.title : this.state.selectedCalendar === 'UKit' ? 'UKit' : Translator.get('NOT_FOUND');
        const lastSyncDate = SettingsManager.getLastSyncDate();

        const renderHeader = (insets: import('react-native-safe-area-context').EdgeInsets | null) => {
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

        const renderScrollContent = (insets: import('react-native-safe-area-context').EdgeInsets | null) => (
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
                <DisplaySection
                    themeSettings={themeSettings}
                    language={this.state.language}
                    openLanguageDialog={this.openLanguageDialog}
                    openFiltersDialog={this.openFiltersDialog}
                />
                <ThemeSection
                    themeSettings={themeSettings}
                    isDarkMode={this.state.isDarkMode}
                    toggleTheme={this.toggleTheme}
                />
                <NotificationsSection
                    themeSettings={themeSettings}
                    theme={theme}
                    courseNotificationsEnabled={this.state.courseNotificationsEnabled}
                    toggleCourseNotifications={this.toggleCourseNotifications}
                    courseNotificationDelay={this.state.courseNotificationDelay}
                    onNotificationDelayChange={this.onNotificationDelayChange}
                    onNotificationDelaySlidingComplete={this.onNotificationDelaySlidingComplete}
                />
                <AppLaunchingSection
                    themeSettings={themeSettings}
                    openFavSwitchValue={this.state.openFavSwitchValue}
                    toggleOpenFavSwitchValue={this.toggleOpenFavSwitchValue}
                    openResetDialog={this.openResetDialog}
                />
                <CalendarSection
                    themeSettings={themeSettings}
                    theme={theme}
                    hasCalendarPermission={this.state.hasCalendarPermission}
                    lastSyncDate={lastSyncDate}
                    calendarSyncEnabled={this.state.calendarSyncEnabled}
                    toggleCalendarSync={this.toggleCalendarSync}
                    calendarName={calendarName}
                    openCalendarDialog={this.openCalendarDialog}
                    isSynchronizingCalendar={this.state.isSynchronizingCalendar}
                    selectedCalendar={this.state.selectedCalendar}
                />
                {this.renderPopups(themeSettings)}
            </Animated.ScrollView>
        );

        return (
            <SafeAreaInsetsContext.Consumer>
                {(insets) => (
                    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                        {renderHeader(insets)}
                        {renderScrollContent(insets)}
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