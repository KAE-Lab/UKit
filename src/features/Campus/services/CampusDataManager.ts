import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampusApiService } from './CampusApiService';

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

    fetchBuildingList = async () => {
        // `resultat.ok === false` et non `!resultat.ok` : sans `strictNullChecks`, TypeScript ne
        // restreint pas une union sur la veracite du discriminant (shared/aetherius/runBlueprint.ts).
        const resultat = await CampusApiService.fetchRoomList();
        if (resultat.ok === false) return;

        const buildings = CampusApiService.extractBuildingsFromRooms(resultat.rooms);
        await AsyncStorage.setItem('buildingListTimestamp', String(Date.now()));
        await AsyncStorage.setItem('buildingList', JSON.stringify(buildings));
        this.setBuildingList(buildings);
    };

    loadData = async () => {
        try {
            const buildingListRaw = await AsyncStorage.getItem('buildingList');
            const buildingList = buildingListRaw ? JSON.parse(buildingListRaw) : null;
            const buildingTimestamp = await AsyncStorage.getItem('buildingListTimestamp');
            const buildingDiff = Date.now() - parseInt(buildingTimestamp || '0');

            if (buildingList && buildingDiff < this._cacheTimeLimit) {
                this.setBuildingList(buildingList);
            } else {
                await this.fetchBuildingList();
            }
        } catch (error) {
            console.warn('COULDNT RETRIEVE BUILDING LIST...');
        }
    };
}

export const CampusDataManager = new CampusDataManagerService();
