import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import qs from 'qs';
import moment from 'moment';
import 'moment/locale/fr';
import { decode } from 'html-entities';

moment.locale('fr');

// ── CONFIGURATION ET CONSTANTES ─────────────────────────────────────────

export const URL = {
    MAP: 'https://www.google.com/maps/',
    TWITTER: 'https://twitter.com/HackJack_',
    UKIT_WEBSITE: 'https://ukit-bordeaux.fr',
    KBDEV_WEBSITE: 'https://kbdev.io',
    LEGAL_NOTICE: 'https://ukit-bordeaux.fr/policies/privacy',
    VERSION_STORE: 'https://raw.githubusercontent.com/kb-dev/UKit/master/VERSION',
    GOOGLE_APP: 'https://play.google.com/store/apps/details?id=com.bordeaux1.emplois',
    APPLE_APP: 'https://apps.apple.com/fr/app/ukit-bordeaux/id1394708917',
};

export const WebApiURL = {
    DOMAIN: 'https://ukit.kbdev.io/Home/',
    GROUPS: 'ReadResourceListItems',
    CALENDARDATA: 'GetCalendarData',
    SIDEBAR: 'GetSideBarEvent',
};

// Utilitaires internes
const upperCaseFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

const formatDescription = (string) => {
    return decode(string.replace(/\r/g, '').replace(/<br \/>/g, '').replace(/\n\n\n\n/g, ';'));
};

// ── FETCH MANAGER (Requêtes API) ────────────────────────────────────────

class FetchManagerService {
    fetchGroupList = async () => {
        const options = {
            method: 'GET',
            url: WebApiURL.DOMAIN + WebApiURL.GROUPS,
            params: { searchTerm: '_', pageSize: '10000', resType: '103' },
        };
        try {
            const results = await axios.request(options);
            if (results?.status !== 200) return null;
            if (!results.data) return null;

            return results.data.results
                .map((e) => e.id)
                .filter((e) => e.length > 2)
                .sort();
        } catch (error) {
            return null;
        }
    };

    sortFunctionGroup = (a, b) => {
        const regexUE = RegExp('([0-9][A-Z0-9]+) (.+)', 'im');
        let subectA = a.subject.toUpperCase();
        let subectB = b.subject.toUpperCase();
        const matchA = regexUE.exec(subectA);
        const matchB = regexUE.exec(subectB);

        if (matchA && matchA.length === 3) subectA = `${matchA[2]}`;
        if (matchB && matchB.length === 3) subectB = `${matchB[2]}`;

        if (a.starttime > b.starttime) return 1;
        if (a.starttime < b.starttime) return -1;
        else if (subectA > subectB) return 1;
        else if (subectA < subectB) return -1;
        return 0;
    };

    fetchCalendarDay = async (group, date) => {
        const endQueryDate = moment(date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
        const data = {
            start: date,
            end: endQueryDate,
            resType: '103',
            calView: 'agendaDay',
            'federationIds[]': group,
            colourScheme: '3',
        };
        const options = {
            method: 'POST',
            url: WebApiURL.DOMAIN + WebApiURL.CALENDARDATA,
            headers: {
                Connection: 'keep-alive',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: qs.stringify(data),
        };
        
        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return null;

            const eventList = [];
            for (const event of response.data) {
                if (event.eventCategory === 'Vacances') continue;
                if (moment(event.start).format('YYYY-MM-DD') !== date) continue;

                const startDate = moment(event.start);
                const endDate = moment(event.end);
                const starttime = startDate.format('HH:mm');
                const endtime = endDate.format('HH:mm');

                let subject = event.eventCategory;
                if (event.modules !== null) subject = event.modules.shift();

                const unfilteredDescription = formatDescription(event.description).split(';');
                const description = [];
                for (const field of unfilteredDescription) {
                    if (!field.includes(event.eventCategory) && !field.includes(subject)) {
                        description.push(field.trim());
                    }
                }

                let toFilter = null;
                if (description[0]?.includes(group)) {
                    let filter = description[0].replace(group, '').replace('-', '').trim();
                    toFilter = filter !== '' ? filter : null;
                }

                eventList.push({
                    id: event.id,
                    style: 'style="background-color:' + event.backgroundColor + '"',
                    color: event.backgroundColor,
                    schedule: starttime + '-' + endtime + ' ' + event.eventCategory,
                    starttime,
                    endtime,
                    date: { start: startDate.toISOString(), end: endDate.toISOString() },
                    subject,
                    description: description.filter((e) => e != '').join('\n'),
                    category: event.eventCategory,
                    group,
                    toFilter,
                });
            }
            return eventList.sort(this.sortFunctionGroup);
        } catch (error) {
            return null;
        }
    };

    fetchCalendarWeek = async (group, week) => {
        const searchDate = moment().year(week.year).isoWeek(week.week);
        const begin = searchDate.startOf('week').format('YYYY-MM-DD');
        const end = searchDate.endOf('week').format('YYYY-MM-DD');
        const data = {
            start: begin,
            end: end,
            resType: '103',
            calView: 'agendaWeek',
            'federationIds[]': group,
            colourScheme: '3',
        };
        const options = {
            method: 'POST',
            url: WebApiURL.DOMAIN + WebApiURL.CALENDARDATA,
            headers: {
                Connection: 'keep-alive',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: qs.stringify(data),
        };
        
        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return null;
            
            const eventList = Array.from({ length: 6 }).map((_, i) => ({
                dayNumber: String(i + 1),
                dayTimestamp: searchDate.clone().startOf('week').add(i, 'day').unix(),
                courses: [],
            }));

            for (const event of response.data) {
                if (event.eventCategory === 'Vacances') continue;

                const startDate = moment(event.start);
                const endDate = moment(event.end);
                const day = upperCaseFirstLetter(moment(startDate).format('dddd L'));
                const dayNumberInt = moment(startDate).isoWeekday();
                
                if(dayNumberInt < 1 || dayNumberInt > 6) continue;

                const dayNumber = String(dayNumberInt);
                const starttime = startDate.format('HH:mm');
                const endtime = endDate.format('HH:mm');

                let subject = event.eventCategory;
                if (event.modules !== null) subject = event.modules.shift();

                const unfilteredDescription = formatDescription(event.description).split('\n');
                const description = [];
                for (const field of unfilteredDescription) {
                    if (!field.includes(event.eventCategory) && !field.includes(subject)) {
                        description.push(field.trim());
                    }
                }

                let toFilter = null;
                if (description[0]?.includes(group)) {
                    let filter = description[0].replace(group, '').replace('-', '').trim();
                    toFilter = filter !== '' ? filter : null;
                }

                eventList[dayNumberInt - 1].courses.push({
                    id: event.id,
                    style: 'style="background-color:' + event.backgroundColor + '"',
                    color: event.backgroundColor,
                    schedule: starttime + '-' + endtime + ' ' + event.eventCategory,
                    starttime,
                    endtime,
                    date: { start: startDate.toISOString(), end: endDate.toISOString() },
                    subject,
                    description: description.filter((e) => e != '').join('\n'),
                    category: event.eventCategory,
                    group,
                    day,
                    dayNumber,
                    toFilter,
                });
            }

            for (const day of eventList) {
                day.courses.sort(this.sortFunctionGroup);
            }

            return eventList;
        } catch (error) {
            return null;
        }
    };

    fetchCalendarForSynchronization = async (group) => {
        const currentDate = moment();
        const begin = moment().set('month', 'August').startOf('month');
        const end = moment().set('month', 'August').startOf('month').add(1, 'year');

        if (currentDate.isBefore(begin)) {
            begin.subtract(1, 'year');
            end.subtract(1, 'year');
        }

        const data = {
            start: begin.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD'),
            resType: '103',
            calView: 'agendaWeek',
            'federationIds[]': group,
            colourScheme: '3',
        };

        const options = {
            method: 'POST',
            url: WebApiURL.DOMAIN + WebApiURL.CALENDARDATA,
            headers: {
                Connection: 'keep-alive',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: qs.stringify(data),
        };

        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return;

            const events = [];
            for (const event of response.data) {
                if (event.eventCategory === 'Vacances') continue;

                const startDate = moment(event.start);
                const endDate = moment(event.end);
                const day = upperCaseFirstLetter(moment(startDate).format('dddd L'));
                const dayNumberInt = moment(startDate).isoWeekday();
                const dayNumber = String(dayNumberInt);

                const starttime = startDate.format('HH:mm');
                const endtime = endDate.format('HH:mm');

                let subject = event.eventCategory;
                if (event.modules !== null) subject = event.modules.shift();

                const unfilteredDescription = formatDescription(event.description).split(';');
                const description = [];

                for (const field of unfilteredDescription) {
                    if (!field.includes(event.eventCategory) && !field.includes(subject)) {
                        description.push(field.trim());
                    }
                }

                events.push({
                    id: event.id,
                    style: 'style="background-color:' + event.backgroundColor + '"',
                    color: event.backgroundColor,
                    schedule: starttime + '-' + endtime + ' ' + event.eventCategory,
                    starttime,
                    endtime,
                    date: { start: startDate.toISOString(), end: endDate.toISOString() },
                    subject,
                    description: description.filter((e) => e != '').join('\n'),
                    category: event.eventCategory,
                    group,
                    day,
                    dayNumber,
                });
            }

            return events.sort(this.sortFunctionGroup);
        } catch (error) {
            return null;
        }
    };
}

export const FetchManager = new FetchManagerService();

// ── DATA MANAGER (Cache & Gestion) ──────────────────────────────────────

class DataManagerService {
    constructor() {
        this._groupList = [];
        this._subscribers = {};
        this._cacheTimeLimit = 7 * 24 * 60 * 60 * 1000;
    }

    on = (event, callback) => {
        if (!this._subscribers[event]) {
            this._subscribers[event] = [];
        }
        this._subscribers[event].push(callback);
    };

    notify = (event, ...args) => {
        if (!this._subscribers[event]) return;
        this._subscribers[event].forEach((fn) => fn(...args));
        this.saveData();
    };

    getGroupList = () => this._groupList;

    setGroupList = (newList) => {
        this._groupList = [...newList];
        this.notify('groupList', this._groupList);
    };

    fetchGroupList = async () => {
        const groupList = await FetchManager.fetchGroupList();
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

export const DataManager = new DataManagerService();