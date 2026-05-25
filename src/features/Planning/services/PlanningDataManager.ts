import AsyncStorage from '@react-native-async-storage/async-storage';
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
        const groupList = await PlanningApiService.fetchGroupList();
        if (groupList) {
            await AsyncStorage.setItem('groupListTimestamp', String(Date.now()));
            this.setGroupList(groupList);
        }
    };

    saveData = () => {
        AsyncStorage.setItem('groupList', JSON.stringify(this._groupList));
    };

    loadData = async () => {
        try {
            const groupListRaw = await AsyncStorage.getItem('groupList');
            const groupList = groupListRaw ? JSON.parse(groupListRaw) : null;
            const timestamp = await AsyncStorage.getItem('groupListTimestamp');
            const difference = Date.now() - parseInt(timestamp || '0');

            if (groupList && difference < this._cacheTimeLimit) {
                this.setGroupList(groupList);
            } else {
                await this.fetchGroupList();
            }
        } catch (error) {
            console.warn('COULDNT RETRIEVE GROUP LIST...');
        }
    };
}

export const PlanningDataManager = new PlanningDataManagerService();
