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
    CONTACT_EMAIL: 'mailto:contact@kaelab.dev',
    UKIT_WEBSITE: 'https://ukit-bordeaux.fr',
    KAELAB_WEBSITE: 'https://kaelab.dev',
    LEGAL_NOTICE: 'https://github.com/KAE-Lab/UKit/blob/master/PRIVACY.md',
    VERSION_STORE: 'https://raw.githubusercontent.com/KAE-Lab/UKit/master/VERSION',
    GOOGLE_APP: 'https://play.google.com/store/apps/details?id=com.bordeaux1.emplois',
    APPLE_APP: 'https://apps.apple.com/fr/app/ukit-bordeaux/id1394708917',
    CROUSTILLANT_WEBSITE: 'https://croustillant.menu',
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
            data: qs.stringify(data, { arrayFormat: 'repeat' }),
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
            data: qs.stringify(data, { arrayFormat: 'repeat' }),
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

                if (dayNumberInt < 1 || dayNumberInt > 6) continue;

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

    fetchRoomList = async () => {
        const options = {
            method: 'GET',
            url: WebApiURL.DOMAIN + WebApiURL.GROUPS,
            params: { searchTerm: '_', pageSize: '10000', resType: '102' },
        };
        try {
            const results = await axios.request(options);
            if (results?.status !== 200) return null;
            if (!results.data) return null;

            return results.data.results
                .filter((e) => e.text && e.text.length > 2)
                .map((e) => ({ id: e.id, name: e.text }));
        } catch (error) {
            return null;
        }
    };

    extractBuildingsFromRooms = (rooms) => {
        const locationsData = require('../../../assets/locations.json');
        
        // Find which buildings have freeAccess: true
        const freeAccessBuildings = Object.keys(locationsData).filter(key => locationsData[key].freeAccess === true);
        
        const buildingsMap = new Map();

        for (const buildingKey of freeAccessBuildings) {
            const loc = locationsData[buildingKey];
            buildingsMap.set(buildingKey, {
                id: 'bat_' + buildingKey.toLowerCase(),
                name: buildingKey,
                rooms: [],
                imageUrl: loc.image,
                lat: loc.lat,
                lng: loc.lng,
                campus: loc.campus || 'Talence',
                schedule: loc.schedule
            });
        }

        for (const room of rooms) {
            if (room.name.toLowerCase().includes('en attente')) continue;

            for (const buildingKey of freeAccessBuildings) {
                // Match the building key strictly
                const regex = new RegExp(`\\b${buildingKey}\\b`, 'i');
                if (regex.test(room.name) || room.name.includes(buildingKey)) {
                    // Nettoyage: retirer le nom du bâtiment et ne garder que "Salle XXX"
                    let cleanName = room.name.replace(/\s*\([^)]*\)$/, '').trim();
                    let finalName = cleanName;
                    const salleIndex = cleanName.toLowerCase().indexOf('salle');
                    if (salleIndex !== -1) {
                        finalName = cleanName.substring(salleIndex).trim();
                    }

                    if (finalName.toLowerCase() === 'salle' || finalName.trim() === '') {
                        break;
                    }

                    buildingsMap.get(buildingKey).rooms.push({
                        id: room.id,
                        name: finalName,
                        fullName: room.name
                    });
                    break;
                }
            }
        }
        
        return Array.from(buildingsMap.values()).filter(b => b.rooms.length > 0).sort((a, b) => a.name.localeCompare(b.name));
    };

    fetchRoomsScheduleDay = async (roomIds, date) => {
        const endQueryDate = moment(date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
        const data = {
            start: date,
            end: endQueryDate,
            resType: '102',
            calView: 'agendaDay',
            'federationIds[]': roomIds,
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
            data: qs.stringify(data, { arrayFormat: 'repeat' }),
        };

        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return null;

            const eventList = [];
            for (const event of response.data) {
                if (moment(event.start).format('YYYY-MM-DD') !== date) continue;

                const startDate = moment(event.start);
                const endDate = moment(event.end);
                
                eventList.push({
                    id: event.id,
                    starttime: startDate.format('HH:mm'),
                    endtime: endDate.format('HH:mm'),
                    date: { start: startDate.toISOString(), end: endDate.toISOString() },
                    description: formatDescription(event.description),
                    isVacances: event.eventCategory === 'Vacances' || (event.description && event.description.toLowerCase().includes('vacances'))
                });
            }
            return eventList;
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
        this._buildingList = [];
        this._availableUEs = [];
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

    getBuildingList = () => this._buildingList;

    setBuildingList = (newList) => {
        this._buildingList = [...newList];
        this.notify('buildingList', this._buildingList);
    };

    getAvailableUEs = () => this._availableUEs;

    extractUEsFromCourses = (courses) => {
        const regexUE = RegExp('([0-9][A-Z0-9]+) (.+)', 'im');
        const ueSet = new Set(this._availableUEs);
        const flatCourses = Array.isArray(courses) ? courses : [];

        for (const item of flatCourses) {
            // Handle both day courses (flat array) and week courses (array of { courses: [] })
            const coursesToScan = item.courses ? item.courses : [item];
            for (const course of coursesToScan) {
                if (course.subject && course.subject !== 'N/C') {
                    const match = regexUE.exec(course.subject);
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
        const groupList = await FetchManager.fetchGroupList();
        if (groupList) {
            await AsyncStorage.setItem('groupListTimestamp', String(Date.now()));
            this.setGroupList(groupList);
        }
    };

    fetchBuildingList = async () => {
        const roomList = await FetchManager.fetchRoomList();
        if (roomList) {
            const buildings = FetchManager.extractBuildingsFromRooms(roomList);
            await AsyncStorage.setItem('buildingListTimestamp', String(Date.now()));
            this.setBuildingList(buildings);
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
            console.warn('COULDNT RETRIEVE GROUP LIST...');
        }
    };
}

export const DataManager = new DataManagerService();