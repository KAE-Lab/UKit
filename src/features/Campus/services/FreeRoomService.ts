import { FetchManager } from '../../../shared/services/DataService';

export interface RoomInfo {
    id: string;
    name: string;
    fullName: string;
}

export interface BuildingInfo {
    id: string;
    name: string;
    rooms: RoomInfo[];
    imageUrl?: string;
    distance?: number;
    campus?: string;
    lat?: number;
    lng?: number;
    schedule?: any;
}

export interface FreeRoomSlot {
    room: RoomInfo;
    availableUntil: string; // HH:mm
    durationMinutes: number; // For sorting
}

export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

class FreeRoomServiceClass {
    // Intégration future avec batiments.json ici
    // public async fetchBuildingsExtraInfo() { ... }
}

export default new FreeRoomServiceClass();
