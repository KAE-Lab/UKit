/**
 * La liste des groupes d'etudiants, et les unites d'enseignement rencontrees.
 *
 * Voir docs/features/planning.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { SettingsManager } from '../../../shared/services/AppCore';
import { PlanningApiService } from './PlanningApiService';

class PlanningDataManagerService {
    _groupList: string[];
    _availableUEs: string[];
    _subscribers: Record<string, Function[]>;
    _cacheTimeLimit: number;

    constructor() {
        this._groupList = [];
        this._availableUEs = [];
        this._subscribers = {};
        this._cacheTimeLimit = 7 * 24 * 60 * 60 * 1000;

        // Les groupes appartiennent a **une** universite, et rien ne le disait a ce manager.
        // `changerEtablissement` purgeait bien la cle disque, mais la liste en memoire survivait a la
        // bascule : l'accueil proposait alors les six cents groupes de Bordeaux a quelqu'un qui venait
        // de choisir Bordeaux INP, et le favori retenu produisait « ce groupe n'existe plus » sur
        // l'onglet Planning. C'est la pire forme du defaut que cette phase supprime — une donnee fausse
        // qui a l'air juste — et c'est la troisieme fois qu'il se presente sous ce visage (jalons 6-G
        // et 6-I). Le manager tient sa donnee, il tient donc son invalidation.
        SettingsManager.on('etablissement', () => { void this.rechargerPourEtablissement(); });
    }

    /**
     * Vide la liste et la redemande a la nouvelle source.
     *
     * La liste est vidée **avant** l'appel, et notifiee : un ecran deja monte doit cesser tout de suite
     * de proposer les groupes de l'universite quittee, meme si le rechargement echoue ou tarde. Mieux
     * vaut une liste vide qu'une liste fausse.
     */
    rechargerPourEtablissement = async () => {
        this.setGroupList([]);
        this._availableUEs = [];
        await this.fetchGroupList();
    };

    on = (event: string, callback: Function) => {
        if (!this._subscribers[event]) {
            this._subscribers[event] = [];
        }
        this._subscribers[event].push(callback);
    };

    notify = (event: string, ...args: unknown[]) => {
        if (!this._subscribers[event]) return;
        this._subscribers[event].forEach((fn) => fn(...args));
        this.saveData();
    };

    getGroupList = (): string[] => this._groupList;

    setGroupList = (newList: string[]) => {
        this._groupList = [...newList];
        this.notify('groupList', this._groupList);
    };

    getAvailableUEs = (): string[] => this._availableUEs;

    extractUEsFromCourses = (courses: Array<{ courses?: { subject?: string }[], subject?: string }>) => {
        const regexUE = RegExp('([0-9][A-Z0-9]+) (.+)', 'im');
        const ueSet = new Set(this._availableUEs);
        const flatCourses = Array.isArray(courses) ? courses : [];

        for (const item of flatCourses) {
            const coursesToScan = item.courses ? item.courses : [item];
            for (const course of coursesToScan) {
                if (course.subject && course.subject !== 'N/C') {
                    const match = regexUE.exec(course.subject as string);
                    if (match && match.length === 3) {
                        ueSet.add(match[1]);
                    }
                }
            }
        }

        const newUEs = [...ueSet].sort();
        this._availableUEs = newUEs;
        this.notify('availableUEs', this._availableUEs);
    };

    fetchGroupList = async () => {
        // `resultat.ok === false` et non `!resultat.ok` : sans `strictNullChecks`, TypeScript ne
        // restreint pas une union sur la veracite du discriminant (shared/aetherius/runBlueprint.ts).
        const resultat = await PlanningApiService.fetchGroupList();
        if (resultat.ok === false) return;

        await AsyncStorage.setItem('groupListTimestamp', String(Date.now()));
        this.setGroupList(resultat.groups);
    };

    saveData = () => {
        AsyncStorage.setItem('groupList', JSON.stringify(this._groupList));
    };

    /**
     * Le cache d'abord, le reseau ensuite et **sans bloquer**.
     *
     * Ce chargement est attendu par le splash (App.tsx). Y laisser un appel reseau rend le demarrage
     * de l'application otage de la disponibilite d'une source tierce : quand le relais Celcat est
     * tombe, chaque expiration du cache de sept jours a coute jusqu'a vingt secondes d'ecran fixe,
     * une fois sur sept jours — d'ou un symptome qui paraissait aleatoire. La source est redevenue
     * rapide, mais la dependance, elle, restait.
     *
     * C'est deja le motif du depot : le registre de Blueprints garde son rafraichissement hors du
     * chemin critique (docs/phase-6/6-c-livraison.md), et `loadBuildings()` sert la surcouche du
     * referentiel depuis le cache avant que le distant ne la corrige. Le manager etant observable,
     * la liste fraiche atteint les ecrans par `notify` des qu'elle arrive.
     */
    loadData = async () => {
        try {
            const groupListRaw = await AsyncStorage.getItem('groupList');
            const groupList = groupListRaw ? JSON.parse(groupListRaw) : null;
            const timestamp = await AsyncStorage.getItem('groupListTimestamp');
            const difference = Date.now() - parseInt(timestamp || '0');

            if (groupList) this.setGroupList(groupList);

            if (!groupList || difference >= this._cacheTimeLimit) {
                // Volontairement non attendu. Un echec est deja journalise par le service, et une
                // liste de groupes absente n'empeche aucun ecran de s'afficher.
                void this.fetchGroupList();
            }
        } catch {
            console.warn('COULDNT RETRIEVE GROUP LIST...');
        }
    };
}

export const PlanningDataManager = new PlanningDataManagerService();
