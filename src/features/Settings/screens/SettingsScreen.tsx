import React from 'react';
import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Linking, Text, View, Animated, StyleSheet } from 'react-native';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { NotificationManager } from '../../../shared/services/NotificationService';

import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import {
    etablissementRetire,
    nomCourtEtablissement,
    lienEdtActif,
    portailPublie,
    sourceEdt,
} from '../../../shared/etablissements';
import { basculerEtablissement } from '../../../shared/etablissements/bascule';
import SecureStoreService from '../../../shared/services/SecureStoreService';
import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { adoucirLaTransition } from '../../../shared/ui/transitions';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import style, { tokens } from '../../../shared/theme/Theme';


import {
    SettingsLanguagePopup,
    SettingsResetPopup,
    SettingsSyncOffPopup,
    SettingsCalendarPopup
} from '../components/SettingsModals';
import { ChoixEtablissement } from '../../../shared/ui/ChoixEtablissement';

import {
    DisplaySection,
    InstitutionSection,
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
    hasCalendarPermission: boolean;
    isSynchronizingCalendar: boolean;
    language: string;
    languageDialogVisible: boolean;
    openFavSwitchValue: boolean;
    resetDialogVisible: boolean;
    syncOffDialogVisible: boolean;
    selectedCalendar: string | number;
    isDarkMode: boolean;
    courseNotificationsEnabled: boolean;
    courseNotificationDelay: number;
    institutionDialogVisible: boolean;
    /** Le nom affiche : il vient du catalogue et change avec lui, d'ou l'etat plutot qu'un calcul. */
    institutionName: string;
    /** L'etablissement propose-t-il un compte, et est-il connecte ? Le rappel de l'etape d'accueil. */
    comptePossible: boolean;
    compteConnecte: boolean;
}

/**
 * L'en-tete de l'onglet : le grand titre qui s'efface au defilement, et a sa droite la pastille d'etat de
 * service (shared/messages/PastilleService). Sorti de `render` pour le garder sous la
 * limite de lignes.
 */
function EnTeteReglages({ theme, insets, scrollY }: {
    theme: import('../../../shared/theme/Theme').AppThemeType;
    insets: import('react-native-safe-area-context').EdgeInsets | null;
    scrollY: Animated.Value;
}) {
    const opacity = scrollY.interpolate({ inputRange: [0, 50], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
        <Animated.View style={[styles.headerContainer, { paddingTop: insets?.top || 0, backgroundColor: 'transparent', opacity }]}>
            <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                <Text style={[styles.greetingText, { color: theme.font }]}>
                    {Translator.get('SETTINGS')}
                </Text>
                <PastilleService theme={theme} style={styles.rappel} />
            </View>
        </Animated.View>
    );
}

class Settings extends React.Component<SettingsProps, SettingsState> {
    static contextType = AppContext;
    // @ts-ignore
    context!: React.ContextType<typeof AppContext>;
    scrollY: Animated.Value;
    _unsubscribeFocus?: () => void;

    constructor(props: SettingsProps) {
        super(props);
        this.state = {
            calendarDialogVisible: false,
            calendarSyncEnabled: SettingsManager.getCalendarSyncEnabled(),
            calendars: SettingsManager.getCalendars(),
            hasCalendarPermission: false,
            isSynchronizingCalendar: SettingsManager.isSynchronizingCalendar(),
            language: SettingsManager.getLanguage(),
            languageDialogVisible: false,
            openFavSwitchValue: SettingsManager.getOpenAppOnFavoriteGroup(),
            resetDialogVisible: false,
            syncOffDialogVisible: false,
            selectedCalendar: SettingsManager.getSyncCalendar(),
            isDarkMode: SettingsManager.getTheme() === 'dark',
            courseNotificationsEnabled: SettingsManager.getCourseNotificationsEnabled(),
            courseNotificationDelay: SettingsManager.getCourseNotificationDelay(),
            institutionDialogVisible: false,
            // Le nom **court** : cette ligne est un espace contraint. Le nom entier reste dans
            // l'ecran de choix, seul endroit ou il faut reconnaitre une fac inconnue.
            institutionName: nomCourtEtablissement(),
            comptePossible: portailPublie(),
            compteConnecte: false,
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

    // La modale de choix ne confirme que ce qui change : pas de garde a repeter ici.
    setSelectedLanguage = (newLang: string) => {
        this.setState({ language: newLang });
        SettingsManager.setLanguage(newLang);
    };

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

    /**
     * L'extinction passe par une confirmation, l'allumage non.
     *
     * L'asymetrie est voulue : allumer ajoute des evenements, eteindre en **retire** — et pas dans
     * l'application, dans l'agenda personnel de l'utilisateur. Les deux gestes n'ont pas le meme
     * cout, ils n'ont donc pas la meme garde.
     */
    toggleCalendarSync = async () => {
        if (this.state.calendarSyncEnabled) {
            this.openSyncOffDialog();
            return;
        }

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

    /**
     * Le geste « Forcer une synchronisation », et son issue dite.
     *
     * Le service rend son verdict, l'ecran decide du retour : un toast d'echec, parce que la pastille
     * seule demandait de savoir ou regarder. La tache de fond, elle, n'a personne a qui parler.
     */
    forcerSynchronisation = async () => {
        const aboutie = await SettingsManager.syncCalendar();
        if (!aboutie) new ErrorAlert(Translator.get('CALENDAR_SYNC_FAILED_TOAST')).show();
    };

    /**
     * La permission calendrier, lue et au besoin demandee — **sans toucher a la synchronisation**.
     *
     * Le montage appelait `toggleCalendarSync()` quand la permission manquait : la fonction de
     * l'interrupteur, qui basculait donc la synchronisation des que la permission etait accordee, et
     * ouvrait la modale d'extinction si elle etait deja active (limite ecrite depuis 6-K, corrigee en
     * 6.1-C). Elle est demandee une fois, au montage ; au retour de focus elle est seulement relue,
     * pour qu'un octroi dans les reglages du systeme remplace la carte « permission » par
     * l'interrupteur — Android redemanderait sinon a chaque retour.
     */
    verifierPermissionCalendrier = async (demander: boolean) => {
        let { status } = await Calendar.getCalendarPermissionsAsync();
        if (status !== 'granted' && demander) {
            ({ status } = await Calendar.requestCalendarPermissionsAsync());
        }
        this.setState({ hasCalendarPermission: status === 'granted' });
    };

    openSystemAppSettings = () => Linking.openSettings();
    setIsSynchronizingCalendar = (newState: boolean) => this.setState({ isSynchronizingCalendar: newState });

    openLanguageDialog = () => this.setState({ languageDialogVisible: true });
    closeLanguageDialog = () => this.setState({ languageDialogVisible: false });

    openSyncOffDialog = () => this.setState({ syncOffDialogVisible: true });
    closeSyncOffDialog = () => this.setState({ syncOffDialogVisible: false });

    /**
     * La modale se ferme d'abord, le retrait court ensuite — meme ordre que la reinitialisation.
     *
     * L'etat est relu depuis le service plutot que suppose : la cible a pu etre remise a zero si le
     * calendrier dedie a ete supprime avec ses evenements (`SettingsManager.disableCalendarSync`).
     */
    disableCalendarSync = async () => {
        this.closeSyncOffDialog();
        await SettingsManager.disableCalendarSync();
        this.setState({
            calendarSyncEnabled: false,
            selectedCalendar: SettingsManager.getSyncCalendar(),
            calendars: SettingsManager.getCalendars(),
        });
    };

    onSyncOffConfirmed = () => { void this.disableCalendarSync(); };

    openResetDialog = () => this.setState({ resetDialogVisible: true });
    closeResetDialog = () => this.setState({ resetDialogVisible: false });

    openCalendarDialog = () => this.setState({ calendarDialogVisible: true });
    closeCalendarDialog = () => this.setState({ calendarDialogVisible: false });

    openInstitutionDialog = () => this.setState({ institutionDialogVisible: true });
    closeInstitutionDialog = () => this.setState({ institutionDialogVisible: false });

    /**
     * La bascule d'etablissement — purge, adoucissement, selection — vit dans
     * `shared/etablissements/bascule.ts` depuis qu'elle a trois hotes ; l'ecran ne garde que ce qui
     * lui revient, son libelle et l'etat de la ligne du compte.
     */
    setInstitution = async (code: string) => {
        await basculerEtablissement(code);
        this.setState({ institutionName: nomCourtEtablissement() });
        // La bascule vide le trousseau : la ligne du compte doit le dire tout de suite, sans attendre
        // un retour de focus qui n'aura pas lieu — on n'a pas quitte l'ecran.
        void this.refreshCompte();
    };

    onInstitutionConfirmed = (code: string) => { void this.setInstitution(code); };

    /**
     * La modale se ferme d'abord, la purge court ensuite.
     *
     * `resetSettings` efface aussi la session universitaire depuis le jalon 6-G : la laisser en place
     * ferait repartir quelqu'un sur une autre fac en restant connecte au portail de la precedente.
     */
    resetApp = async () => {
        this.closeResetDialog();
        await SettingsManager.resetSettings();
    };

    /**
     * L'etat du compte, relu a chaque retour sur l'ecran.
     *
     * Le trousseau n'emet aucun evenement, et l'ecran des identifiants — ou l'on se deconnecte — est
     * juste a cote : figer la valeur au montage afficherait « connecte » apres une deconnexion, sans
     * rien pour la corriger. La reprise de focus est le declencheur naturel, et c'est deja celui que
     * `ScheduleList` utilise pour la meme raison.
     */
    refreshCompte = async () => {
        const credentials = await SecureStoreService.getCredentials();
        // Ce setState peut faire apparaitre ou disparaitre les rangees compte et lien iCal —
        // le commit de la cascade de bascule d'etablissement qui restait brut.
        adoucirLaTransition();
        this.setState({ comptePossible: portailPublie(), compteConnecte: credentials !== null });
    };

    componentDidMount = async () => {
        this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
            void this.refreshCompte();
            void this.verifierPermissionCalendrier(false);
        });
        void this.refreshCompte();
        void this.verifierPermissionCalendrier(true);
        SettingsManager.on('isSynchronizingCalendar', this.setIsSynchronizingCalendar);
    };

    componentWillUnmount = () => {
        if (this._unsubscribeFocus) this._unsubscribeFocus();
        SettingsManager.unsubscribe('isSynchronizingCalendar', this.setIsSynchronizingCalendar);
    };



    renderPopups(theme: import('../../../shared/theme/Theme').AppThemeType) {
        const themeSettings = theme.settings;
        return (
            <>
                <SettingsLanguagePopup theme={themeSettings} popupVisible={this.state.languageDialogVisible} popupClose={this.closeLanguageDialog} language={this.state.language} onConfirm={this.setSelectedLanguage} />
                <SettingsSyncOffPopup theme={themeSettings} popupVisible={this.state.syncOffDialogVisible} popupClose={this.closeSyncOffDialog} disableSync={this.onSyncOffConfirmed} />
                <SettingsResetPopup theme={themeSettings} popupVisible={this.state.resetDialogVisible} popupClose={this.closeResetDialog} resetApp={this.resetApp} />
                <SettingsCalendarPopup theme={themeSettings} popupVisible={this.state.calendarDialogVisible} popupClose={this.closeCalendarDialog} setCalendar={this.setCalendar} selectedCalendar={this.state.selectedCalendar} />
                <ChoixEtablissement theme={theme} visible={this.state.institutionDialogVisible} fermer={this.closeInstitutionDialog} codeActif={SettingsManager.getEtablissement()} onConfirmer={this.onInstitutionConfirmed} />
            </>
        );
    }

    render() {
        const themeName = this.context.themeName ?? 'light';
        const theme = style.Theme[themeName];
        const themeSettings = theme.settings;
        const calendar = this.state.calendars.find((cal) => this.state.selectedCalendar === cal.id);
        const calendarName = !!calendar ? calendar.title : this.state.selectedCalendar === 'UKit' ? 'UKit' : Translator.get('NOT_FOUND');

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
                <InstitutionSection
                    themeSettings={themeSettings}
                    theme={theme}
                    institutionName={this.state.institutionName}
                    institutionRetiree={etablissementRetire()}
                    openInstitutionDialog={this.openInstitutionDialog}
                    comptePossible={this.state.comptePossible}
                    compteConnecte={this.state.compteConnecte}
                    openCompte={() => this.props.navigation.navigate('CredentialsSettings')}
                    lienEdtPossible={sourceEdt().kind === 'abonnement' || sourceEdt().kind === 'lien-attendu'}
                    lienEdtPose={lienEdtActif() !== null}
                    openLienEdt={() => this.props.navigation.navigate('LienEdt')}
                />
                <DisplaySection
                    themeSettings={themeSettings}
                    language={this.state.language}
                    openLanguageDialog={this.openLanguageDialog}
                    openFilters={() => this.props.navigation.navigate('Filters')}
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
                    lastSyncDate={SettingsManager.getLastSyncDate()}
                    lastSyncFailed={SettingsManager.getLastSyncFailed()}
                    calendarSyncEnabled={this.state.calendarSyncEnabled}
                    toggleCalendarSync={this.toggleCalendarSync}
                    onForceSync={this.forcerSynchronisation}
                    calendarName={calendarName}
                    openCalendarDialog={this.openCalendarDialog}
                    isSynchronizingCalendar={this.state.isSynchronizingCalendar}
                    selectedCalendar={this.state.selectedCalendar}
                />
                {this.renderPopups(theme)}
            </Animated.ScrollView>
        );

        return (
            <SafeAreaInsetsContext.Consumer>
                {(insets) => (
                    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
                        <EnTeteReglages theme={theme} insets={insets} scrollY={this.scrollY} />
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
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold,
        marginBottom: tokens.space.md,
    },
    // Pousse a droite, et la meme marge basse que le titre : la pastille s'aligne sur sa ligne.
    rappel: {
        marginLeft: 'auto',
        marginBottom: tokens.space.md,
    },
});

export default Settings;