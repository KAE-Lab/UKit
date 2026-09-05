/**
 * La liste des groupes d'etudiants, et les unites d'enseignement rencontrees.
 *
 * Voir docs/features/planning.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { SettingsManager } from '../../../shared/services/AppCore';
import type { UkitFailure } from '../../../shared/aetherius';
import { doitRafraichir, lireCache } from './groupListCache';
import { indexerUes, type UeRencontree } from './PlanningAssembly';
import { PlanningApiService, type GroupListResult } from './PlanningApiService';

/**
 * Ou en est la liste : en cours de lecture, en echec, et la date de la derniere reponse.
 *
 * Exposé depuis 6.1-C parce que deux ecrans en ont besoin : l'accueil, qui doit dire **pourquoi**
 * l'etape des groupes est vide (une installation hors ligne restait muette), et la recherche de
 * groupes, qui date son bandeau hors ligne avec l'horodatage du seul cache qui reste.
 */
export interface EtatListeGroupes {
    readonly chargement: boolean;
    readonly echec: UkitFailure | null;
    readonly horodatage: number | null;
}

class PlanningDataManagerService {
    _groupList: string[];
    _horodatage: number | null;
    _chargement: boolean;
    _dernierEchec: UkitFailure | null;
    /** Les UE rencontrees, **avec leur intitule** : l'ecran des filtres n'affichait qu'un code. */
    _availableUEs: UeRencontree[];
    _subscribers: Record<string, Function[]>;

    constructor() {
        this._groupList = [];
        this._horodatage = null;
        this._chargement = false;
        this._dernierEchec = null;
        this._availableUEs = [];
        this._subscribers = {};

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

    // La meme forme que `SettingsManager.unsubscribe` : ce manager n'en avait pas, donc un ecran
    // abonne ne pouvait litteralement pas se desabonner — l'ecran des filtres empilait un abonnement
    // par ouverture.
    unsubscribe = (event: string, callback: Function) => {
        if (!this._subscribers[event]) return;
        this._subscribers[event] = this._subscribers[event].filter((fn) => fn !== callback);
    };

    notify = (event: string, ...args: unknown[]) => {
        if (!this._subscribers[event]) return;
        this._subscribers[event].forEach((fn) => fn(...args));
    };

    getGroupList = (): string[] => this._groupList;

    // L'ecriture suit la liste, et elle seule : elle suivait chaque `notify`, donc chaque extraction
    // d'UE reecrivait la liste des groupes sur le disque.
    setGroupList = (newList: string[]) => {
        this._groupList = [...newList];
        this.notify('groupList', this._groupList);
        this.saveData();
    };

    getGroupListEtat = (): EtatListeGroupes => ({
        chargement: this._chargement,
        echec: this._dernierEchec,
        horodatage: this._horodatage,
    });

    private poserEtat(partiel: Partial<EtatListeGroupes>) {
        if (partiel.chargement !== undefined) this._chargement = partiel.chargement;
        if (partiel.echec !== undefined) this._dernierEchec = partiel.echec;
        if (partiel.horodatage !== undefined) this._horodatage = partiel.horodatage;
        this.notify('groupListEtat', this.getGroupListEtat());
    }

    /** Les codes seuls : ce que les filtres comparent, et ce que la plupart des appelants veulent. */
    getAvailableUEs = (): string[] => this._availableUEs.map((ue) => ue.code);

    /** Les UE avec leur intitule, pour les ecrans qui les **affichent**. */
    getUEs = (): UeRencontree[] => [...this._availableUEs];

    /**
     * L'intitule d'une UE, ou `null` s'il n'est pas connu.
     *
     * `null` est un cas ordinaire et non une anomalie : un filtre pose a la main, ou herite d'une
     * annee precedente, nomme une UE qu'aucun planning charge ne porte. L'ecran affiche alors le code
     * seul, comme avant.
     */
    nomDUE = (code: string): string | null =>
        this._availableUEs.find((ue) => ue.code === code)?.nom ?? null;

    /**
     * Indexe les UE des cours rendus, avec leur intitule.
     *
     * L'aplatissement — une liste de jours, ou une liste de cours — reste ici parce qu'il depend de
     * la forme que les vues passent ; la lecture d'un code, elle, vit dans `PlanningAssembly` avec le
     * tri qui l'applique deja. Deux copies d'une meme expression, c'est une occasion de n'en corriger
     * qu'une : celle-ci gardait la regle d'avant le jalon 6-I et fabriquait des UE `2026`.
     */
    extractUEsFromCourses = (courses: Array<{ courses?: { subject?: string }[], subject?: string }>) => {
        const sujets: string[] = [];
        for (const item of Array.isArray(courses) ? courses : []) {
            for (const course of item.courses ? item.courses : [item]) {
                if (typeof course?.subject === 'string') sujets.push(course.subject);
            }
        }

        this._availableUEs = indexerUes(sujets, this._availableUEs);
        this.notify('availableUEs', this._availableUEs);
    };

    /**
     * Redemande la liste a la source, et rend le resultat a qui veut le lire.
     *
     * L'echec n'est plus jete : il est **garde** dans l'etat et notifie, pour que l'accueil puisse le
     * dire (6.1-C). L'horodatage est celui de l'horloge reelle, comme tout horodatage de cache.
     */
    fetchGroupList = async (): Promise<GroupListResult> => {
        this.poserEtat({ chargement: true });
        // `resultat.ok === false` et non `!resultat.ok` : sans `strictNullChecks`, TypeScript ne
        // restreint pas une union sur la veracite du discriminant (shared/aetherius/runBlueprint.ts).
        const resultat = await PlanningApiService.fetchGroupList();
        if (resultat.ok === false) {
            this.poserEtat({ chargement: false, echec: resultat.failure });
            return resultat;
        }

        const horodatage = Date.now();
        await AsyncStorage.setItem('groupListTimestamp', String(horodatage));
        this.setGroupList(resultat.groups);
        this.poserEtat({ chargement: false, echec: null, horodatage });
        return resultat;
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
            const cache = lireCache(
                await AsyncStorage.getItem('groupList'),
                await AsyncStorage.getItem('groupListTimestamp'),
            );
            // La cle `groups` — le second cache, celui de l'ecran de recherche — n'existe plus depuis
            // 6.1-C. Effacee une fois, sans attendre : rien ne la lit plus.
            void AsyncStorage.removeItem('groups');

            this._horodatage = cache.horodatage;
            if (cache.liste.length > 0) this.setGroupList(cache.liste);

            if (doitRafraichir(cache, Date.now())) {
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
