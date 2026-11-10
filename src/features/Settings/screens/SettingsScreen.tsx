import React from 'react';
import { Animated, Linking, View } from 'react-native';
import * as Calendar from 'expo-calendar/legacy';
import { NotificationManager } from '../../../shared/services/NotificationService';

import { AppContext, SettingsManager } from '../../../shared/services/AppCore';
import { useCredentials } from '../../Scolarite/services/CredentialsContext';
import { replanifierDepuisLeCache } from '../../../shared/services/entretien';
import {
    etablissementRetire,
    nomCourtEtablissement,
    lienEdtActif,
    portailPublie,
    serviceEtablissement,
    sourceEdt,
} from '../../../shared/etablissements';
import { basculerEtablissement } from '../../../shared/etablissements/bascule';
import SecureStoreService from '../../../shared/services/SecureStoreService';
import Translator from '../../../shared/i18n/Translator';
import { adoucirLaTransition } from '../../../shared/ui/transitions';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import style, { tokens } from '../../../shared/theme/Theme';
import type { PageDeReglage } from '../pagesDeReglages';


import {
    SettingsLanguagePopup,
    SettingsResetPopup,
    SettingsSyncOffPopup,
    SettingsCalendarPopup
} from '../components/SettingsModals';
import { ChoixEtablissement } from '../../../shared/ui/ChoixEtablissement';
import { PageDesReglages } from '../components/PageDesReglages';

import {
    ApparenceSection,
    CalendarSection,
    ConfidentialiteSection,
    DisplaySection,
    messageDeCause,
    InstitutionSection,
    NotificationsSection,
    PreferencesSection,
    ReinitialisationSection,
} from '../components/SettingsSections';

export interface SettingsProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    /**
     * Une page de detail (7-J, troisieme passe) : l'ecran poussé par la route `Reglage` sert cette
     * page au lieu de l'accueil, avec les memes gestes. Sans elle, c'est l'onglet.
     */
    route?: { params?: { page?: PageDeReglage } };
    onAnimatedScroll?: (event: unknown) => void;
    headerPadding?: Record<string, unknown>;
    /** La deconnexion du compte universitaire, que la reinitialisation emprunte d'abord. */
    deconnecter?: () => Promise<void>;
}

export interface SettingsState {
    calendarDialogVisible: boolean;
    calendarSyncEnabled: boolean;
    calendars: import('expo-calendar/legacy').Calendar[];
    hasCalendarPermission: boolean;
    isSynchronizingCalendar: boolean;
    language: string;
    languageDialogVisible: boolean;
    resetDialogVisible: boolean;
    syncOffDialogVisible: boolean;
    selectedCalendar: string | number;
    isDarkMode: boolean;
    courseNotificationsEnabled: boolean;
    courseNotificationDelay: number;
    institutionDialogVisible: boolean;
    /** L'etablissement propose-t-il un compte, et est-il connecte ? Le rappel de l'etape d'accueil. */
    comptePossible: boolean;
    compteConnecte: boolean;
    /** Le nombre de calendriers du telephone affiches dans le Planning (6.1.x-D). */
    calendriersAffiches: number;
    messagesEnNotification: boolean;
}

class Settings extends React.Component<SettingsProps, SettingsState> {
    static contextType = AppContext;
    // @ts-ignore
    context!: React.ContextType<typeof AppContext>;
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
            resetDialogVisible: false,
            syncOffDialogVisible: false,
            selectedCalendar: SettingsManager.getSyncCalendar(),
            isDarkMode: SettingsManager.getTheme() === 'dark',
            courseNotificationsEnabled: SettingsManager.getCourseNotificationsEnabled(),
            courseNotificationDelay: SettingsManager.getCourseNotificationDelay(),
            institutionDialogVisible: false,
            comptePossible: portailPublie(),
            compteConnecte: false,
            calendriersAffiches: SettingsManager.getCalendriersAffiches().length,
            messagesEnNotification: SettingsManager.getMessagesEnNotification(),
        };

    }

    setCalendar = (calendar: import('expo-calendar/legacy').Calendar | 'UKit') => {
        if (calendar === 'UKit') {
            this.setState({ selectedCalendar: calendar });
            void SettingsManager.setSyncCalendar(calendar);
        } else {
            this.setState({ selectedCalendar: calendar.id });
            void SettingsManager.setSyncCalendar(calendar.id);
        }
    };

    // La modale de choix ne confirme que ce qui change : pas de garde a repeter ici.
    setSelectedLanguage = (newLang: string) => {
        this.setState({ language: newLang });
        SettingsManager.setLanguage(newLang);
    };


    toggleTheme = () => {
        SettingsManager.switchTheme();
        this.setState({ isDarkMode: SettingsManager.getTheme() === 'dark' });
    };

    /**
     * Allumer demande la permission, et **renonce si elle est refusee** : un interrupteur allume qui
     * ne peut rien recevoir ment. L'entretien depose ou retire le jeton sur l'evenement.
     */
    toggleMessagesEnNotification = async () => {
        const actif = !this.state.messagesEnNotification;
        if (actif && !(await NotificationManager.requestPermissionsAsync())) {
            new ErrorAlert(Translator.get('NOTIFICATIONS_REFUSEES')).show();
            return;
        }
        this.setState({ messagesEnNotification: actif }, () => SettingsManager.setMessagesEnNotification(actif));
    };

    toggleCourseNotifications = async () => {
        const newValue = !this.state.courseNotificationsEnabled;
        if (newValue) {
            // Meme regle que les messages : sans permission, l'interrupteur ne s'allume pas et le dit.
            if (!(await NotificationManager.requestPermissionsAsync())) {
                new ErrorAlert(Translator.get('NOTIFICATIONS_REFUSEES')).show();
                return;
            }
        }
        this.setState({ courseNotificationsEnabled: newValue }, async () => {
            SettingsManager.setCourseNotificationsEnabled(newValue);
            // Depuis le cache, filtres d'UE compris : l'ecran passait la semaine brute (6.2.x).
            if (newValue) void replanifierDepuisLeCache();
        });
    };

    /** Un delai coche : enregistre, et les rappels deja poses se replanifient a ce delai. */
    choisirDelai = (minutes: number) => {
        this.setState({ courseNotificationDelay: minutes });
        SettingsManager.setCourseNotificationDelay(minutes);
        if (this.state.courseNotificationsEnabled) void replanifierDepuisLeCache();
    };

    choisirSombre = (sombre: boolean) => {
        if (sombre !== this.state.isDarkMode) this.toggleTheme();
    };

    /**
     * L'accueil relit ses valeurs au retour d'une page : chaque page est sa propre instance, et
     * `SettingsManager` fait foi entre les deux.
     */
    relireLesReglages = () => {
        this.setState({
            isDarkMode: SettingsManager.getTheme() === 'dark',
            courseNotificationsEnabled: SettingsManager.getCourseNotificationsEnabled(),
            courseNotificationDelay: SettingsManager.getCourseNotificationDelay(),
            messagesEnNotification: SettingsManager.getMessagesEnNotification(),
            calendarSyncEnabled: SettingsManager.getCalendarSyncEnabled(),
            language: SettingsManager.getLanguage(),
        });
    };

    ouvrirPage = (page: PageDeReglage) => this.props.navigation.navigate('Reglage', { page });

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
        // Le service rend `true` quand il n'a **rien a ecrire** — pas de cible, pas de favori : ce
        // n'est pas un echec, donc pas de toast, et rien ne bouge a l'ecran non plus. Le bouton
        // passait alors pour casse (retour iPhone du 2026-09-08, defaut anterieur au jalon). L'ecran
        // dit ce qui manque avant d'appeler : c'est lui qui sait dire l'issue d'un geste.
        if (SettingsManager.getSyncCalendar() === -1) {
            new ErrorAlert(Translator.get('SYNC_NEEDS_CALENDAR')).show();
            return;
        }
        if (SettingsManager.getFavoriteGroups().length === 0) {
            new ErrorAlert(Translator.get('SYNC_NEEDS_FAVORITES')).show();
            return;
        }
        const aboutie = await SettingsManager.syncCalendar();
        if (aboutie) return;
        // La cause, quand la tentative en porte une : « a echoue » seul ne dit pas quoi changer.
        const cause = SettingsManager.getDerniereTentativeSynchro()?.cause;
        new ErrorAlert(cause !== undefined ? messageDeCause(cause) : Translator.get('CALENDAR_SYNC_FAILED_TOAST')).show();
    };

    /**
     * La permission calendrier, **lue** — sans toucher a la synchronisation, et sans la demander.
     *
     * Le montage appelait `toggleCalendarSync()` quand la permission manquait, qui basculait la
     * synchronisation des que la permission etait accordee (corrige en 6.1-C) ; puis il la demandait
     * une fois, au montage. Depuis 7-J il ne fait que la lire, au montage et au retour de focus — un
     * octroi dans les reglages du systeme remplace alors la rangee « Autoriser l'agenda » par les
     * reglages de la synchronisation. La demande vit dans cette rangee.
     */
    relirePermissionCalendrier = async () => {
        const { status } = await Calendar.getCalendarPermissionsAsync();
        this.setState({ hasCalendarPermission: status === 'granted' });
    };

    /**
     * La rangee « Autoriser l'agenda » : le systeme demande, et s'il ne peut plus demander — refus
     * definitif sur Android, deuxieme refus sur iOS — ses reglages s'ouvrent, ou l'acces se donne.
     */
    demanderPermissionCalendrier = async () => {
        const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted' && !canAskAgain) void Linking.openSettings();
        this.setState({ hasCalendarPermission: status === 'granted' });
    };
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
     * lui revient, l'etat de la ligne du compte.
     *
     * **Elle ne rafraichit plus le libelle**, et c'est le correctif du 2026-09-04 : le nom se derive
     * du catalogue au rendu (voir `InstitutionSection` plus bas).
     */
    setInstitution = async (code: string) => {
        await basculerEtablissement(code);
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
        /*
         * **Le compte d'abord, par le chemin de la deconnexion** (corrige le 2026-11-06) : arreter la
         * session et les widgets, effacer le trousseau, et fermer le ticket CAS cote serveur. La
         * reinitialisation n'effacait que le local, et la WebView cachee d'Aetherius gardait la
         * derniere page chargee (la messagerie) et une session encore valide. La fermeture distante
         * la ramene d'ailleurs sur la page de deconnexion du portail. Elle ne leve pas ; le reste,
         * s'il levait, ne doit pas empecher de reinitialiser.
         */
        if (this.state.compteConnecte && this.props.deconnecter !== undefined) {
            try {
                await this.props.deconnecter();
            } catch (erreur) {
                console.warn(`[reglages] deconnexion avant reinitialisation : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
            }
        }
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
            this.relireLesReglages();
            void this.refreshCompte();
            void this.relirePermissionCalendrier();
        });
        void this.refreshCompte();
        // Lue, jamais demandee a l'ouverture de l'onglet (7-J) : la rangee « Autoriser l'agenda » la
        // demande quand on veut s'en servir. La demander au montage ouvrait la boite du systeme sans
        // contexte, a chaque installation neuve, a qui ne venait que changer de langue.
        void this.relirePermissionCalendrier();
        SettingsManager.on('isSynchronizingCalendar', this.setIsSynchronizingCalendar);
        // La tentative change aussi sans synchronisation — l'interrupteur efface un echec — et
        // l'ecran ne la lisait qu'au rendu provoque par l'evenement du dessus (6.1.x-B).
        SettingsManager.on('synchroCalendrier', this.surTentativeSynchro);
        SettingsManager.on('calendriersAffiches', this.surCalendriersAffiches);
    };

    surCalendriersAffiches = (identifiants: string[]) => this.setState({ calendriersAffiches: identifiants.length });

    componentWillUnmount = () => {
        if (this._unsubscribeFocus) this._unsubscribeFocus();
        SettingsManager.unsubscribe('isSynchronizingCalendar', this.setIsSynchronizingCalendar);
        SettingsManager.unsubscribe('synchroCalendrier', this.surTentativeSynchro);
        SettingsManager.unsubscribe('calendriersAffiches', this.surCalendriersAffiches);
    };

    surTentativeSynchro = () => this.forceUpdate();



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

    /** La page de detail demandee par la route `Reglage`. */
    renderPage(page: PageDeReglage, theme: import('../../../shared/theme/Theme').AppThemeType, calendarName: string) {
        switch (page) {
            case 'notifications':
                return (
                    <NotificationsSection
                        theme={theme}
                        courseNotificationsEnabled={this.state.courseNotificationsEnabled}
                        toggleCourseNotifications={this.toggleCourseNotifications}
                        courseNotificationDelay={this.state.courseNotificationDelay}
                        choisirDelai={this.choisirDelai}
                        messagesEnNotification={this.state.messagesEnNotification}
                        toggleMessagesEnNotification={this.toggleMessagesEnNotification}
                    />
                );
            case 'apparence':
                return <ApparenceSection theme={theme} isDarkMode={this.state.isDarkMode} choisirSombre={this.choisirSombre} />;
            case 'agenda':
                return (
                    <CalendarSection
                        theme={theme}
                        hasCalendarPermission={this.state.hasCalendarPermission}
                        demanderPermission={() => { void this.demanderPermissionCalendrier(); }}
                        lastSyncDate={SettingsManager.getLastSyncDate()}
                        derniereTentative={SettingsManager.getDerniereTentativeSynchro()}
                        calendarSyncEnabled={this.state.calendarSyncEnabled}
                        toggleCalendarSync={this.toggleCalendarSync}
                        onForceSync={this.forcerSynchronisation}
                        calendarName={calendarName}
                        openCalendarDialog={this.openCalendarDialog}
                        isSynchronizingCalendar={this.state.isSynchronizingCalendar}
                        selectedCalendar={this.state.selectedCalendar}
                        calendriersAffiches={this.state.calendriersAffiches}
                        openCalendriersAffiches={() => this.props.navigation.navigate('CalendriersAffiches')}
                    />
                );
            case 'confidentialite':
                return <ConfidentialiteSection theme={theme} />;
        }
    }

    render() {
        const themeName = this.context.themeName ?? 'light';
        const theme = style.Theme[themeName];
        const calendar = this.state.calendars.find((cal) => this.state.selectedCalendar === cal.id);
        // Aucune cible choisie se dit « Aucun » ; « Non trouve » reste pour une cible qui a disparu.
        const calendarName = !!calendar ? calendar.title
            : this.state.selectedCalendar === 'UKit' ? 'UKit'
            : this.state.selectedCalendar === -1 ? Translator.get('PHONE_CALENDARS_NONE')
            : Translator.get('NOT_FOUND');
        // Le don se collecte hors de l'application, dans le navigateur du systeme (regle des stores,
        // 7-N) ; la rangee n'existe que si le catalogue en publie l'adresse.
        const adresseDuSoutien = serviceEtablissement('soutien');

        const page = this.props.route?.params?.page;
        if (page !== undefined) {
            return (
                <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <Animated.ScrollView
                        contentContainerStyle={[this.props.headerPadding, { paddingBottom: tokens.space.xxl }]}
                        onScroll={this.props.onAnimatedScroll as never}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                    >
                        {this.renderPage(page, theme, calendarName)}
                    </Animated.ScrollView>
                    {this.renderPopups(theme)}
                </View>
            );
        }

        // L'accueil : des rangees qui menent, leur valeur a droite, ni interrupteur ni texte d'aide
        // (7-J, troisieme passe). Le pied de l'etablissement reste : il dit un etat, il n'explique pas.
        const valeurNotifications = this.state.courseNotificationsEnabled
            ? Translator.get('NOTIFICATION_DELAY_BEFORE', this.state.courseNotificationDelay)
            : Translator.get(this.state.messagesEnNotification ? 'SETTING_ON' : 'SETTING_OFF');
        const valeurAgenda = Translator.get(this.state.hasCalendarPermission && this.state.calendarSyncEnabled ? 'SETTING_ON' : 'SETTING_OFF');

        return (
            <PageDesReglages theme={theme}>
                <InstitutionSection
                    theme={theme}
                    /*
                     * Lu au rendu, jamais tenu en etat (correctif du 2026-09-04) : une bascule declenchee
                     * ailleurs ne rejoignait pas cet onglet, qui ne se demonte pas. Le nom **court** :
                     * cette ligne est un espace contraint ; le nom entier vit dans l'ecran de choix.
                     */
                    institutionName={nomCourtEtablissement()}
                    institutionRetiree={etablissementRetire()}
                    openInstitutionDialog={this.openInstitutionDialog}
                    comptePossible={this.state.comptePossible}
                    compteConnecte={this.state.compteConnecte}
                    openCompte={() => this.props.navigation.navigate('CredentialsSettings')}
                    lienEdtPossible={sourceEdt().kind === 'abonnement' || sourceEdt().kind === 'lien-attendu'}
                    lienEdtPose={lienEdtActif() !== null}
                    openLienEdt={() => this.props.navigation.navigate('LienEdt')}
                    soutien={adresseDuSoutien !== null ? () => { void Linking.openURL(adresseDuSoutien); } : undefined}
                />
                <DisplaySection
                    theme={theme}
                    language={this.state.language}
                    openLanguageDialog={this.openLanguageDialog}
                    openFilters={() => this.props.navigation.navigate('Filters')}
                    nombreDeFiltres={Array.isArray(this.context.filters) ? this.context.filters.length : 0}
                    isDarkMode={this.state.isDarkMode}
                    openApparence={() => this.ouvrirPage('apparence')}
                />
                <PreferencesSection theme={theme} valeurNotifications={valeurNotifications} valeurAgenda={valeurAgenda} ouvrir={this.ouvrirPage} />
                <ReinitialisationSection theme={theme} openResetDialog={this.openResetDialog} />
                {this.renderPopups(theme)}
            </PageDesReglages>
        );
    }
}

/**
 * L'ecran des Reglages avec la deconnexion du compte, qu'une classe ne lit pas par un hook : la
 * reinitialisation l'emprunte (2026-11-06). L'onglet, la route `Settings` et les pages `Reglage`
 * passent tous par lui.
 */
function SettingsAvecCompte(props: SettingsProps) {
    const { logout } = useCredentials();
    return <Settings {...props} deconnecter={logout} />;
}

export default SettingsAvecCompte;
