import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampusApiService } from './CampusApiService';
import type { UkitFailure } from '../../../shared/aetherius';

class CampusDataManagerService {
    _buildingList: import('./CampusApiService').CelcatBuilding[];
    _subscribers: Record<string, Function[]>;
    _cacheTimeLimit: number;

    constructor() {
        this._buildingList = [];
        this._subscribers = {};
        this._cacheTimeLimit = 7 * 24 * 60 * 60 * 1000;
    }

    on = (event: string, callback: Function) => {
        if (!this._subscribers[event]) {
            this._subscribers[event] = [];
        }
        this._subscribers[event].push(callback);
    };

    notify = (event: string, ...args: unknown[]) => {
        if (!this._subscribers[event]) return;
        this._subscribers[event].forEach((fn) => fn(...args));
    };

    getBuildingList = (): import('./CampusApiService').CelcatBuilding[] => this._buildingList;

    setBuildingList = (newList: import('./CampusApiService').CelcatBuilding[]) => {
        this._buildingList = [...newList];
        this.notify('buildingList', this._buildingList);
    };

    /**
     * Rafraichit la liste des batiments, et **rend l'echec** plutot que de l'avaler.
     *
     * Le `return` nu qui tenait cette place etait le dernier endroit de Campus ou une source en panne
     * devenait une liste vide : l'ecran des salles libres affichait « Aucun batiment trouve »,
     * c'est-a-dire le message d'une reponse legitimement vide. C'est exactement le defaut que la
     * Phase 6 revendique d'avoir supprime partout ailleurs (jalon 6-K,
     * docs/defauts-fonctionnels.md).
     *
     * Rend `null` quand tout va bien. L'appelant decide quoi en faire : un cache peuple survit a un
     * rafraichissement rate, c'est seulement l'absence totale de donnee qui merite un ecran d'echec.
     */
    fetchBuildingList = async (): Promise<UkitFailure | null> => {
        // `resultat.ok === false` et non `!resultat.ok` : sans `strictNullChecks`, TypeScript ne
        // restreint pas une union sur la veracite du discriminant (shared/aetherius/runBlueprint.ts).
        const resultat = await CampusApiService.fetchRoomList();
        if (resultat.ok === false) return resultat.failure;

        const buildings = CampusApiService.extractBuildingsFromRooms(resultat.rooms);
        await AsyncStorage.setItem('buildingListTimestamp', String(Date.now()));
        await AsyncStorage.setItem('buildingList', JSON.stringify(buildings));
        this.setBuildingList(buildings);
        return null;
    };

    /**
     * Le cache d'abord, le reseau ensuite et **sans bloquer** — meme raison que
     * `PlanningDataManager.loadData`, qu'il faut lire pour la mesure : ce chargement est attendu par
     * le splash, et un appel reseau a cet endroit rend le demarrage otage d'une source tierce.
     */
    loadData = async () => {
        try {
            const buildingListRaw = await AsyncStorage.getItem('buildingList');
            const buildingList = buildingListRaw ? JSON.parse(buildingListRaw) : null;
            const buildingTimestamp = await AsyncStorage.getItem('buildingListTimestamp');
            const buildingDiff = Date.now() - parseInt(buildingTimestamp || '0');

            if (buildingList) this.setBuildingList(buildingList);

            if (!buildingList || buildingDiff >= this._cacheTimeLimit) {
                // Volontairement non attendu : l'ecran des salles libres relit la liste du manager et
                // se remplit quand elle arrive.
                void this.fetchBuildingList();
            }
        } catch {
            console.warn('COULDNT RETRIEVE BUILDING LIST...');
        }
    };
}

export const CampusDataManager = new CampusDataManagerService();
