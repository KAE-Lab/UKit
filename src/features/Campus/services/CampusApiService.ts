import axios from 'axios';
import qs from 'qs';
import moment from 'moment';
import 'moment/locale/fr';
import { WebApiURL } from '../../../shared/constants/urls';
import { formatDescription } from '../../../shared/utils/formatUtils';

moment.locale('fr');

export interface CelcatRoom {
    id: string;
    name: string;
    fullName?: string;
}

export interface CelcatBuilding {
    id: string;
    name: string;
    rooms: CelcatRoom[];
    imageUrl?: string;
    lat?: number;
    lng?: number;
    campus?: string;
    schedule?: string | null;
}

export interface CampusEvent {
    id: string;
    starttime: string;
    endtime: string;
    date: { start: string; end: string };
    description: string;
    isVacances: boolean;
}

class CampusApiServiceClass {
    fetchRoomList = async (): Promise<CelcatRoom[] | null> => {
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
                .filter((e: { text?: string }) => e.text && e.text.length > 2)
                .map((e: { id: string; text: string }) => ({ id: e.id, name: e.text }));
        } catch (error) {
            return null;
        }
    };

    extractBuildingsFromRooms = (rooms: CelcatRoom[]): CelcatBuilding[] => {
        const locationsData = require('../../../../assets/locations.json');
        
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
        
        return Array.from(buildingsMap.values()).filter((b: CelcatBuilding) => b.rooms.length > 0).sort((a: CelcatBuilding, b: CelcatBuilding) => a.name.localeCompare(b.name));
    };

    fetchRoomsScheduleDay = async (roomIds: string[], date: string): Promise<CampusEvent[] | null> => {
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

export const CampusApiService = new CampusApiServiceClass();
