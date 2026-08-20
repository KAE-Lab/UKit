import React from 'react';
import { Appearance, Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import moment from 'moment';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';

import { ErrorAlert } from '../ui/Alerts';
// Les modules purs, et non les portes d'entree `../locations` et `../etablissements` : celles-ci
// tirent AsyncStorage et la base, que ce fichier — charge avant le premier rendu — n'a aucune raison
// de mettre sur son chemin.
import {
    ETABLISSEMENT_DEFAUT,
    getCodeEtablissementActif,
    setCodeEtablissementActif,
} from '../etablissements/catalogue';
// `purge` et non la porte d'entree pour la meme raison : elle ne connait que le magasin local et le
// trousseau, la ou `../etablissements` tirerait le client de la base.
import { purgerDonneesEtablissement, purgerLiensEdt } from '../etablissements/purge';
import { restaurerReglages } from './reglagesParEtablissement';
import { createUKitCalendar, formatCalendarEventData } from './CalendarSyncHelpers';
import { NetworkMockService } from './NetworkMockService';
import { PlanningApiService as FetchManager } from '../../features/Planning/services/PlanningApiService';
import { separerCodeUE } from '../../features/Planning/services/PlanningAssembly';

// ── CONTEXTE & DEVICE ─────────────────────────────────
/**
 * Ce que tout ecran peut lire sans le demander a personne.
 *
 * `etablissement` y figure depuis le jalon 6-G, et pour une raison mesuree sur appareil : les ecrans
 * deja montes ne se redessinent pas tout seuls quand le catalogue change sous eux. La section des
 * salles libres restait masquee apres un retour a un etablissement qui en a, parce que le tableau de
 * bord n'avait aucune raison de rendre a nouveau. Porter le code ici suffit — tout consommateur du
 * contexte se redessine, et c'est deja par la que passent le theme et les groupes favoris.
 */
export const AppContext = React.createContext<{
    themeName?: string;
    favoriteGroups?: string[];
    filters?: string[];
    etablissement?: string;
    /**
     * Un compteur de revisions du **catalogue**, distinct du code selectionne.
     *
     * Les deux changent pour des raisons differentes : le code change quand l'utilisateur bascule, la
     * revision quand la base publie autre chose — un etablissement ajoute, ou retire. Sans elle, un
     * ecran deja monte ne voyait un retrait qu'au premier geste qui provoquait un rendu par ailleurs.
     */
    catalogue?: number;
}>({});
export const AppContextProvider = AppContext.Provider;

export function deviceLanguage(): string {
    if (Platform.OS === 'ios') {
        const settings = NativeModules.SettingsManager?.settings;
        return settings?.AppleLocale || settings?.AppleLanguages[0] || 'en_US';
    } 
    return NativeModules.I18nManager?.localeIdentifier || 'en_US';
}

export function languageFromDevice(): string {
    const lang = deviceLanguage();
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('es')) return 'es';
    return 'en';
}

export async function isConnected(): Promise<boolean | null> {
    // L'interrupteur du menu de developpement gagne : couper le reseau de l'application sans couper
    // celui de l'appareil est le seul moyen de verifier un chemin hors ligne sans perdre Metro
    // (docs/qualite.md). Il vaut `false` en dehors de toute verification manuelle.
    if (NetworkMockService.isOffline()) return false;

    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected;
}

// ── UTILITAIRES DIVERS ───────────────────────────────────
export function treatTitle(str: string | string[]): string {
    if (Array.isArray(str)) {
        return 'Mon Planning';
    }
    str = str.replace(/_/g, ' ');
    if (str.length > 18) {
        return str.charAt(18) === ' ' ? `${str.substr(0, 18)}…` : `${str.substr(0, 18)} …`;
    }
    return str;
}

export function upperCaseFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function isArraysEquals(a: unknown[], b: unknown[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// La reconnaissance de salle a demenage dans `shared/locations/salles.ts` au jalon 6-I : la decoupe
// et le motif etaient des constantes bordelaises, ils sont devenus une donnee d'etablissement. Les
// deux fonctions restent exportees d'ici pour ne casser aucun appelant.
export { getLocations, getLocationsInText, ligneDeSalle } from '../locations/salles';

// ── GESTION DES COURS ───────────────────────────────
export const CourseManager = {
    computeCourseUE: (course: Record<string, unknown>): Record<string, unknown> => {
        if (course.subject && course.subject !== 'N/C') {
            // La regle vit dans `PlanningAssembly`, avec le tri qui l'applique deja : deux copies
            // d'une meme expression, c'est une occasion de n'en corriger qu'une (jalon 6-I).
            const separe = separerCodeUE(course.subject as string);
            course.UE = separe === null ? null : separe.code;
            if (separe !== null) course.subject = separe.reste;
        }
        return course;
    },
    filterCourse: (isFavorite: boolean, course: Record<string, unknown>, filtersList: unknown): boolean => {
        if (!isFavorite) return true;
        if (course.UE !== null && filtersList instanceof Array && filtersList.includes(course.UE)) {
            return false;
        }
        return true;
    }
};

// ── GESTIONNAIRE DE PARAMÈTRES ────────────────────
const TASK_DELAY = 12 * 60 * 60; 
const BACKGROUND_FETCH_TASK = 'background-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    await SettingsManager.syncCalendar();
    return BackgroundFetch.BackgroundFetchResult.NewData;
});

class SettingsManagerService {
    _calendar: string | number;
    _calendars: Calendar.Calendar[];
    _firstload: boolean;
    _theme: string;
    _favoriteGroups: string[];
    _language: string;
    _openAppOnFavoriteGroup: boolean;
    _filters: string[];
    _subscribers: Record<string, Function[]>;
    _calendarSyncEnabled: boolean;
    _isSynchronizingCalendar: boolean;
    _lastSyncDate: moment.Moment | null;
    _courseNotificationsEnabled: boolean;
    _courseNotificationDelay: number;
    /** Le code d'etablissement **tel que ce module le connait** : ce qui a ete charge ou choisi. */
    _etablissement: string;
    /**
     * Les groupes favoris et les filtres d'UE, **cloisonnes par etablissement**.
     *
     * `_favoriteGroups` et `_filters` restent la vue de l'etablissement actif : tout le reste de
     * l'application les lit sans savoir qu'il en existe d'autres. Ces deux tables sont la memoire.
     */
    _favorisParEtablissement: Record<string, string[]>;
    _filtresParEtablissement: Record<string, string[]>;
    _groupName?: string;

    constructor() {
        this._calendar = -1;
        this._calendars = [];
        this._firstload = true;
        this._theme = 'light';
        this._favoriteGroups = [];
        this._language = 'fr';
        this._openAppOnFavoriteGroup = true;
        this._filters = [];
        this._subscribers = {};
        this._calendarSyncEnabled = false;
        this._isSynchronizingCalendar = false;
        this._lastSyncDate = null;
        this._courseNotificationsEnabled = true;
        this._courseNotificationDelay = 15;
        this._etablissement = ETABLISSEMENT_DEFAUT;
        this._favorisParEtablissement = {};
        this._filtresParEtablissement = {};
    }

    on = (event: string, callback: Function) => {
        if (!this._subscribers[event]) this._subscribers[event] = [];
        this._subscribers[event].push(callback);
    };

    unsubscribe = (event: string, callback: Function) => {
        if (!this._subscribers[event]?.length) return;
        const index = this._subscribers[event]?.indexOf(callback);
        if (index !== -1) this._subscribers[event].splice(index, 1);
    };

    notify = (event: string, ...args: unknown[]) => {
        this.saveSettings();
        if (!this._subscribers[event] || !args) return;
        this._subscribers[event].filter((e) => e !== null).forEach((fn) => fn(...args));
    };

    getTheme = (): string => this._theme;
    setTheme = (newTheme: string) => { this._theme = newTheme; this.notify('theme', this._theme); };
    switchTheme = () => { this.setTheme(this._theme === 'light' ? 'dark' : 'light'); };
    setAutomaticTheme = () => { this.setTheme(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'); };
    getAutomaticTheme = () => Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

    isFirstLoad = () => this._firstload;
    setFirstLoad = (newState) => { this._firstload = newState; this.notify('firstload', this._firstload); };
    switchFirstLoad = () => { this.setFirstLoad(!this.isFirstLoad()); };

    isSynchronizingCalendar = () => this._isSynchronizingCalendar;
    getFavoriteGroups = () => this._favoriteGroups;
    addFavoriteGroup = (newGroup: string) => {
        if (newGroup && !this._favoriteGroups.includes(newGroup)) {
            this._favoriteGroups = [...this._favoriteGroups, newGroup];
            this.notify('favoriteGroups', this._favoriteGroups);
        }
    };
    removeFavoriteGroup = (groupToRemove: string) => {
        if (groupToRemove) {
            this._favoriteGroups = this._favoriteGroups.filter((g) => g !== groupToRemove);
            this.notify('favoriteGroups', this._favoriteGroups);
        }
    };
    isFavoriteGroup = (group: string) => this._favoriteGroups.includes(group);
    
    getLanguage = () => this._language;
    setLanguage = (newLang: string) => { this._language = newLang; this.notify('language', this._language); };

    /**
     * L'etablissement selectionne.
     *
     * Le code est persiste ici, avec les autres reglages ; l'etablissement **resolu** vit dans
     * `shared/etablissements`, qui sait le lire dans le catalogue publie ou dans le socle embarque.
     * Les deux ne se confondent pas : un code peut survivre a l'etablissement qu'il designait.
     *
     * La purge de ce qui appartenait a l'etablissement quitte est faite par `changerEtablissement`
     * **avant** cet appel : ce setter ne fait que poser et notifier (docs/features/settings.md).
     */
    getEtablissement = (): string => getCodeEtablissementActif();
    setEtablissement = (code: string) => {
        setCodeEtablissementActif(code);
        const resolu = getCodeEtablissementActif();

        // Changer d'universite efface aussi les reglages qui lui appartenaient. La purge est ici, et
        // pas au point d'appel, parce qu'il y en a **deux** — l'accueil et les reglages — et qu'un
        // oubli dans l'un des deux est exactement ce qui a produit le defaut.
        //
        // La comparaison porte sur `_etablissement`, le code que **ce module** connait, et pas sur
        // celui du catalogue : `changerEtablissement` a deja pose ce dernier quand on arrive ici, donc
        // le lire rendrait la comparaison toujours fausse. C'est la bonne semantique de toute facon —
        // la question est « la selection de l'utilisateur a-t-elle change ? », et c'est ce module qui
        // la tient. `loadSettings` **restaure** ce champ sans purger : rouvrir l'application n'est pas
        // changer d'avis.
        if (this._etablissement !== resolu) {
            this.basculerReglagesEtablissement(resolu);
        }

        this.notify('etablissement', resolu);
    };

    /**
     * Les reglages qui appartiennent a **l'etablissement**, et qui n'ont aucun sens sous un autre.
     *
     * Les groupes favoris et les filtres d'UE nomment des groupes et des unites d'enseignement d'une
     * universite donnee. `purgerDonneesEtablissement` efface le magasin local et le trousseau, mais
     * ces deux-la vivent dans le document de reglages, que ce module est seul a tenir — d'ou cette
     * methode plutot qu'une ligne de plus dans `purge.ts`, qui ne doit pas dependre d'`AppCore`.
     *
     * **Le defaut qu'elle repare a ete trouve sur appareil au jalon 6-I**, et il est de la meme
     * famille que celui du jalon 6-G : la reinitialisation les effacait, le changement
     * d'etablissement non. Il etait invisible tant que le second etablissement n'avait pas d'emploi du
     * temps — les favoris bordelais ne rencontraient jamais rien. Des que Bordeaux INP en a eu un,
     * arriver sur l'onglet Planning affichait « ce groupe n'existe plus » pour un groupe qui existe
     * parfaitement, a l'universite qu'on vient de quitter.
     */
    /**
     * Change d'etablissement : range les reglages de celui qu'on quitte, ressort ceux qu'on retrouve.
     *
     * La premiere version **effacait** les groupes favoris et les filtres d'UE, et c'etait deja un
     * progres — avant elle, ils survivaient a la bascule et le planning agrege butait sur des groupes
     * d'une autre universite. Mais effacer repond a la mauvaise question : la regle de la phase est que
     * les donnees de deux facs ne se **melangent** pas, pas qu'il faille les oublier. Des favoris
     * cloisonnes ne melangent rien — a tout instant, seuls ceux de l'etablissement actif sont en jeu —
     * et ils evitent de tout reselectionner a chaque aller-retour.
     *
     * Ce qui **reste purge**, et pourquoi :
     *
     *   - le **cache de planning**, dont les cles portent des noms de groupe qui peuvent se ressembler
     *     d'une fac a l'autre. Le garder ferait courir un risque de collision pour economiser quelques
     *     secondes de rechargement ;
     *   - la **session universitaire**, qui est un identifiant et n'a rien a faire ailleurs ;
     *   - les **cours ecrits dans l'agenda systeme**, qui sont ceux de l'universite quittee.
     */
    basculerReglagesEtablissement = (nouveau: string) => {
        this._favorisParEtablissement[this._etablissement] = [...this._favoriteGroups];
        this._filtresParEtablissement[this._etablissement] = [...this._filters];

        this._etablissement = nouveau;
        this._favoriteGroups = [...(this._favorisParEtablissement[nouveau] ?? [])];
        this._filters = [...(this._filtresParEtablissement[nouveau] ?? [])];

        this.notify('favoriteGroups', this._favoriteGroups);
        this.notify('filter', this._filters);

        // L'agenda systeme porte les cours de l'universite quittee, et il faut le reecrire meme si des
        // favoris reviennent : ce ne sont pas les memes cours. Le retrait est asynchrone, ne retarde
        // pas la bascule, et ne leve jamais.
        void this.purgeCalendarEvents();
    };

    /**
     * La reinitialisation, elle, oublie **tous** les etablissements.
     *
     * C'est la difference avec une bascule : ici on ne va nulle part, on efface. Ne rien garder est le
     * seul comportement qui rende le parcours d'accueil honnete.
     */
    purgerReglagesEtablissement = () => {
        this._favorisParEtablissement = {};
        this._filtresParEtablissement = {};
        this._favoriteGroups = [];
        this.notify('favoriteGroups', this._favoriteGroups);
        this.resetFilter();
        void this.purgeCalendarEvents();
    };


    getLastSyncDate = () => this._lastSyncDate;
    getSyncCalendar = () => this._calendar;
    setSyncCalendar = (newCalendar: string | number) => {
        if (this._calendar !== -1) this.deleteAllPreviousCalendarEntries(this._calendar);
        this._calendar = newCalendar;
        this.notify('calendar', this._calendar);
    };

    deleteAllPreviousCalendarEntries = async (calendar: string | number) => {
        if (calendar === -1) return;
        if (calendar === 'UKit') {
            const ukitCalendar = this._calendars.find((cal) => cal.title === 'UKit');
            if (ukitCalendar) await Calendar.deleteCalendarAsync(ukitCalendar.id);
            await AsyncStorage.removeItem('previousSyncData');
            await AsyncStorage.removeItem('previousSyncTime');
            return;
        }

        let existingCalendarEvents = {};
        try {
            const data = await AsyncStorage.getItem('previousSyncData');
            existingCalendarEvents = JSON.parse(data) || {};
        } catch { existingCalendarEvents = {}; }

        const existingInternalCalendarEvents = Object.values(existingCalendarEvents);
        await Promise.all(existingInternalCalendarEvents.map((id) => Calendar.deleteEventAsync(id as string)));
        await AsyncStorage.removeItem('previousSyncData');
        await AsyncStorage.removeItem('previousSyncTime');
        this._lastSyncDate = null;
    };

    syncCalendar = async () => {
        if (this._calendar === -1) return;

        this._isSynchronizingCalendar = true;
        this.notify('isSynchronizingCalendar', true);

        if (this._calendar === 'UKit') {
            const ukitCalendar = this._calendars.find((cal) => cal.title === 'UKit');
            this._calendar = !ukitCalendar ? await createUKitCalendar(this._calendars) : ukitCalendar.id;
        }

        // `resultat.ok === false` et non `!resultat.ok` : sans `strictNullChecks`, TypeScript ne
        // restreint pas une union sur la veracite du discriminant (shared/aetherius/runBlueprint.ts).
        // Une synchronisation qui echoue laisse le calendrier tel quel et repassera dans 12 h : purger
        // les evenements deja poses sur la foi d'une source injoignable serait pire que ne rien faire.
        const resultat = await FetchManager.fetchCalendarForSynchronization(this._favoriteGroups[0]);
        if (resultat.ok === false) {
            // Le drapeau doit retomber, sinon l'ecran de reglages tourne indefiniment. Le retour
            // anticipe d'origine l'oubliait, et l'echec etait alors indiscernable d'une synchro sans
            // fin.
            this._isSynchronizingCalendar = false;
            this.notify('isSynchronizingCalendar', false);
            return;
        }

        const events = resultat.courses;
        let existingCalendarEvents: Record<string, string> = {};

        try {
            const data = await AsyncStorage.getItem('previousSyncData');
            existingCalendarEvents = JSON.parse(data) || {};
        } catch { existingCalendarEvents = {}; }

        const existingInternalCalendarEvents = Object.values(existingCalendarEvents);
        const updatedEvents = [];
        const nextExistingCalendarEvents: Record<string, string> = {};

        await events.reduce((p, event) => {
            return p.then(async () => {
                const eventToCreate = formatCalendarEventData(event);
                const existingInternalEventId = existingCalendarEvents[String(event.id)];

                if (existingInternalEventId) {
                    try {
                        await Calendar.updateEventAsync(existingInternalEventId, eventToCreate);
                        updatedEvents.push(existingInternalEventId);
                        nextExistingCalendarEvents[String(event.id)] = existingInternalEventId;
                    } catch {
                        const id = await Calendar.createEventAsync(this._calendar as string, eventToCreate);
                        nextExistingCalendarEvents[String(event.id)] = id;
                    }
                } else {
                    const id = await Calendar.createEventAsync(this._calendar as string, eventToCreate);
                    nextExistingCalendarEvents[String(event.id)] = id;
                }
            });
        }, Promise.resolve());

        const internalEventsToDelete = (existingInternalCalendarEvents as string[]).filter((id) => updatedEvents.indexOf(id) === -1);
        if (internalEventsToDelete.length) {
            await Promise.all(internalEventsToDelete.map((id) => Calendar.deleteEventAsync(id)));
        }

        await AsyncStorage.setItem('previousSyncData', JSON.stringify(nextExistingCalendarEvents));
        await AsyncStorage.setItem('previousSyncTime', String(Date.now()));

        this._lastSyncDate = moment();
        this._isSynchronizingCalendar = false;
        this.notify('isSynchronizingCalendar', false);
    };

    getCalendars = () => this._calendars;
    getCalendarSyncEnabled = () => this._calendarSyncEnabled;
    
    setCalendarSyncEnabled = (state: boolean) => {
        this._calendarSyncEnabled = state;
        this.notify('calendarSyncEnabled', state);
        if (state === true) {
            BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, { minimumInterval: TASK_DELAY, stopOnTerminate: false, startOnBoot: true });
        } else {
            BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        }
    };

    /**
     * Eteindre la synchronisation **retire ce qu'elle a ecrit**.
     *
     * L'interrupteur ne faisait qu'arreter les passages suivants : les cours deja poses restaient dans
     * l'agenda personnel de l'utilisateur, sans aucun moyen de les enlever depuis l'application. Le
     * plus contrariant est que le nettoyage existait deja — `deleteAllPreviousCalendarEntries` — et
     * n'etait appele qu'en **changeant** de calendrier cible. Une capacite qu'on peut activer et pas
     * desactiver n'est pas un reglage, c'est un aller simple.
     *
     * La cible est remise a `-1` **si elle n'existe plus**, et pas systematiquement : le calendrier
     * dedie « UKit » est supprime avec ses evenements, la cible cesse alors d'exister et la garder
     * ferait echouer la synchronisation suivante sur un identifiant mort ; un calendrier du systeme,
     * lui, survit a la suppression de nos evenements, et effacer le choix de l'utilisateur serait une
     * perte gratuite. Verifier vaut mieux que deviner laquelle des deux on avait.
     */
    disableCalendarSync = async (): Promise<void> => {
        await this.purgeCalendarEvents();
        this.setCalendarSyncEnabled(false);
        this.saveSettings();
    };

    /**
     * Retire de l'agenda systeme tout ce que la synchronisation y a ecrit, sans l'eteindre.
     *
     * Deux gestes s'en servent, et ils n'ont pas la meme portee : **eteindre** la synchronisation, et
     * **changer d'universite**. Le second est le plus important des deux, parce qu'il est silencieux :
     * apres une bascule, les favoris sont purges, donc plus aucune synchronisation ne peut tourner, et
     * les cours de l'universite quittee restaient dans l'agenda **indefiniment** — jusqu'a ce que
     * quelqu'un choisisse un favori dans la nouvelle et attende un cycle. Pendant ce temps
     * l'application annoncait que tout etait efface et l'agenda affichait le contraire.
     *
     * La cible n'est remise a zero que si elle a **disparu** : le calendrier dedie « UKit » est
     * supprime avec ses evenements, donc la garder ferait echouer la synchronisation suivante sur un
     * identifiant mort ; un calendrier du systeme, lui, survit, et effacer le choix serait une perte
     * gratuite. Apres une premiere synchronisation `_calendar` porte un identifiant resolu et ne dit
     * plus lequel des deux c'etait : on verifie plutot que de deviner.
     *
     * Ne leve jamais. Un agenda qui refuse une suppression ne doit pas empecher une bascule
     * d'etablissement, sans quoi l'utilisateur resterait coince sur l'universite qu'il vient de
     * quitter (meme regle que `purgerDonneesEtablissement`).
     */
    purgeCalendarEvents = async (): Promise<void> => {
        try {
            await this.deleteAllPreviousCalendarEntries(this._calendar);

            await this.loadCalendars();
            const cible = String(this._calendar);
            if (!this._calendars.some((calendrier) => String(calendrier.id) === cible)) {
                this._calendar = -1;
                this.notify('calendar', this._calendar);
            }
        } catch (erreur) {
            console.warn(`[calendrier] purge incomplete : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        }
        this.notify('lastSyncDate', this._lastSyncDate);
    };

    getOpenAppOnFavoriteGroup = () => this._openAppOnFavoriteGroup;
    setOpenAppOnFavoriteGroup = (newOpenAppBool: boolean) => { this._openAppOnFavoriteGroup = newOpenAppBool; this.saveSettings(); };

    getCourseNotificationsEnabled = () => this._courseNotificationsEnabled;
    setCourseNotificationsEnabled = (state: boolean) => { 
        this._courseNotificationsEnabled = state; 
        this.saveSettings(); 
        this.notify('courseNotificationsEnabled', state); 
    };

    getCourseNotificationDelay = () => this._courseNotificationDelay;
    setCourseNotificationDelay = (delay: number) => { 
        this._courseNotificationDelay = delay; 
        this.saveSettings(); 
        this.notify('courseNotificationDelay', delay); 
    };

    getFilters = () => this._filters;
    resetFilter = () => { this._filters = []; this.notify('filter', this._filters); };
    addFilters = (filter: string) => {
        if (filter && !this._filters.includes(filter)) this._filters.push(filter);
        this.notify('filter', this._filters);
    };
    removeFilters = (filter: string) => {
        if (filter) {
            const index = this._filters.indexOf(filter);
            if (index > -1) this._filters = this._filters.filter((e) => e !== filter);
        }
        this.notify('filter', this._filters);
    };

    loadCalendars = async () => {
        if ((await Calendar.getCalendarPermissionsAsync()).status === 'granted') {
            this._calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        }
    };

    /**
     * La reinitialisation : tout redevient ce qu'il etait au premier lancement.
     *
     * **Asynchrone depuis le jalon 6-G**, et ce n'est pas un raffinement. Elle rouvre le parcours
     * d'accueil, qui redemande l'etablissement — quelqu'un pouvait donc repartir sur une autre fac en
     * restant connecte au portail de la precedente. Constate sur appareil pendant la campagne de
     * verification, sur un chemin qui n'avait jamais efface le trousseau : le defaut est anterieur au
     * jalon, mais c'est le jalon qui le rend faux.
     *
     * La purge est **attendue** avant `setFirstLoad(true)` : ce dernier demonte la pile de navigation
     * et remonte le parcours d'accueil, et une session encore en memoire reecrirait ce qu'on efface.
     */
    resetSettings = async () => {
        this.setTheme('light');
        this.setLanguage('fr');
        this.setOpenAppOnFavoriteGroup(true);
        this.purgerReglagesEtablissement();
        // Les memes donnees qu'un changement d'etablissement, et par le meme chemin : deux gestes qui
        // effacent la meme chose ne doivent pas avoir deux definitions de « la meme chose ».
        await purgerDonneesEtablissement();
        // Et ce qu'une bascule, elle, **garde** : les liens d'abonnement sont cloisonnes par
        // etablissement, donc un aller-retour les retrouve. Ici on n'va nulle part, on efface — laisser
        // un emploi du temps rempli a quelqu'un qui vient de tout reinitialiser serait un residu.
        await purgerLiensEdt();
        // Le parcours d'accueil redemande l'etablissement : le laisser sur le precedent afficherait un
        // choix deja fait a quelqu'un qui vient de tout effacer.
        this.setEtablissement(ETABLISSEMENT_DEFAUT);
        this.setFirstLoad(true);
    };

    saveSettings = () => {
        // La vue active redescend dans sa table avant d'ecrire : c'est le seul endroit qui garde les
        // deux formes d'accord, et il est traverse a chaque `notify`.
        this._favorisParEtablissement[this._etablissement] = [...this._favoriteGroups];
        this._filtresParEtablissement[this._etablissement] = [...this._filters];

        AsyncStorage.setItem('firstload', JSON.stringify(this._firstload));
        AsyncStorage.setItem('settings', JSON.stringify({
            calendar: this._calendar, theme: this._theme, favoriteGroups: this._favorisParEtablissement,
            language: this._language, openAppOnFavoriteGroup: this._openAppOnFavoriteGroup,
            filters: this._filtresParEtablissement, calendarSyncEnabled: this._calendarSyncEnabled,
            courseNotificationsEnabled: this._courseNotificationsEnabled, courseNotificationDelay: this._courseNotificationDelay,
            etablissement: getCodeEtablissementActif(),
        }));
    };

    applySettingsData = (settings: Record<string, unknown> | null) => {
        if (!settings) return;
        
        if (settings.theme) this._theme = settings.theme as string;

        // Migration silencieuse vers le multi-etablissement (jalon 6-G) : une installation anterieure
        // n'a pas de code, et elle est **reputee** bordelaise — c'est la seule universite que
        // l'application ait jamais servie. Aucun ecran, aucune question : demander a un utilisateur
        // de confirmer quelque chose qu'il n'a jamais choisi serait inventer une decision.
        //
        // Ce code reste tant que des installations anciennes peuvent etre mises a jour. Il vit ici, a
        // cote de celui de `groupName` -> `favoriteGroups`, pour qu'on les retire ensemble le jour ou
        // on les retirera.
        setCodeEtablissementActif((settings.etablissement as string) || ETABLISSEMENT_DEFAUT);
        // Restaure sans purger : c'est un chargement, pas un changement d'avis.
        this._etablissement = getCodeEtablissementActif();

        // Les groupes favoris et les filtres d'UE, avec leurs trois formes historiques — `groupName`,
        // la liste d'avant le cloisonnement, et la table. Les migrations vivent ensemble, dans un
        // module jouable sous Node parce qu'une migration fausse perd des reglages sans rien dire.
        const restaures = restaurerReglages(settings, this._etablissement);
        this._favoriteGroups = restaures.favoris;
        this._filters = restaures.filtres;
        this._favorisParEtablissement = restaures.favorisParEtablissement;
        this._filtresParEtablissement = restaures.filtresParEtablissement;

        if (settings.openAppOnFavoriteGroup !== null && settings.openAppOnFavoriteGroup !== undefined) {
            this._openAppOnFavoriteGroup = settings.openAppOnFavoriteGroup as boolean;
        }
        if (settings.calendar !== undefined) this._calendar = settings.calendar as string | number;
        if (settings.calendarSyncEnabled) this._calendarSyncEnabled = true;
        if (settings.language) this.setLanguage(settings.language as string);
        if (settings.courseNotificationsEnabled !== undefined) {
            this._courseNotificationsEnabled = settings.courseNotificationsEnabled as boolean;
        }
        if (settings.courseNotificationDelay !== undefined) {
            this._courseNotificationDelay = settings.courseNotificationDelay as number;
        }
    };

    loadSettings = async () => {
        await this.loadCalendars();
        try {
            const data = await AsyncStorage.getItem('firstload');
            const isFirstLoad = data ? JSON.parse(data) : null;
            this._firstload = isFirstLoad === null ? true : isFirstLoad;
        } catch { this._firstload = true; }

        if (this._firstload) return;

        const lastSyncDateItem = await AsyncStorage.getItem('previousSyncTime');
        if (lastSyncDateItem !== null) this._lastSyncDate = moment(parseInt(lastSyncDateItem, 10));

        try {
            const data = await AsyncStorage.getItem('settings');
            const settings = data ? JSON.parse(data) : null;
            this.applySettingsData(settings);
        } catch {
            new ErrorAlert("Settings couldn't be loaded").show();
        }
    };
}

export const SettingsManager = new SettingsManagerService();