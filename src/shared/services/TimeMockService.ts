import moment from 'moment';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TimeMockManager {
    offset: number;
    isActive: boolean;
    originalMomentNow: () => number;

    constructor() {
        this.offset = 0;
        this.isActive = false;
        this.originalMomentNow = moment.now;
    }

    async setFakeTime(date: Date | string | number): Promise<void> {
        const fakeMs = moment(date).valueOf();
        const realMs = Date.now();
        this.offset = fakeMs - realMs;
        this.isActive = true;
        
        moment.now = () => {
            return Date.now() + this.offset;
        };

        await this.clearCalendarCache();
        DeviceEventEmitter.emit('timeMockChanged', this.isActive);
    }

    async resetFakeTime(): Promise<void> {
        this.offset = 0;
        this.isActive = false;
        
        moment.now = () => {
            return Date.now();
        };

        await this.clearCalendarCache();
        DeviceEventEmitter.emit('timeMockChanged', this.isActive);
    }

    async clearCalendarCache(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            // Clear calendar/schedule caches matching @Week or @YYYY/MM/DD
            const calendarKeys = keys.filter(k => k.includes('@Week') || k.match(/@[0-9]{4}\/[0-9]{2}\/[0-9]{2}/));
            if (calendarKeys.length > 0) {
                await AsyncStorage.multiRemove(calendarKeys);
            }
        } catch (e) {
            console.warn('Failed to clear calendar cache', e);
        }
    }

    isMockActive(): boolean {
        return this.isActive;
    }

    getFakeDate(): Date {
        if (!this.isActive) return new Date();
        return new Date(Date.now() + this.offset);
    }
}

export const TimeMockService = new TimeMockManager();
