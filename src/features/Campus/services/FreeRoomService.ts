import type { CampusEvent } from './CampusApiService';

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
    schedule?: CampusEvent[];
}

export interface FreeRoomSlot {
    room: RoomInfo;
    availableUntil: string; // HH:mm
    durationMinutes: number; // For sorting
}

/**
 * L'etage d'une salle, deduit de son numero : le chiffre des centaines.
 *
 * Convention du campus, valable pour n'importe quel batiment : la salle 003 est au rez-de-chaussee,
 * la 103 au premier, la 203 au deuxieme. Le numero se lit dans le nom **nettoye** de la salle,
 * jamais dans `fullName` — celui-ci commence par le code du batiment (« A28 - Salle 001 »), dont
 * les chiffres rangeraient toutes les salles au rez-de-chaussee.
 *
 * `null` pour une salle sans numero (un amphi nomme) : la fondre dans le rez-de-chaussee serait
 * une invention, elle rejoint un groupe a part.
 */
export function etageDeSalle(name: string): number | null {
    const numero = name.match(/\d+/);
    if (numero === null) return null;
    return Math.floor(parseInt(numero[0], 10) / 100);
}

export interface GroupeDEtage {
    /** `null` : les salles sans numero, rangees en dernier. */
    etage: number | null;
    slots: FreeRoomSlot[];
}

/**
 * Les creneaux libres, sectionnes par etage du plus bas au plus haut.
 *
 * Le groupement est stable : dans chaque etage, l'ordre d'arrivee — duree decroissante puis nom,
 * celui de `calculateFreeRooms` — est conserve.
 */
export function grouperParEtage(slots: FreeRoomSlot[]): GroupeDEtage[] {
    const parEtage = new Map<number | null, FreeRoomSlot[]>();
    for (const slot of slots) {
        const etage = etageDeSalle(slot.room.name);
        const groupe = parEtage.get(etage);
        if (groupe) groupe.push(slot);
        else parEtage.set(etage, [slot]);
    }
    return [...parEtage.entries()]
        .sort(([a], [b]) => {
            if (a === null) return 1;
            if (b === null) return -1;
            return a - b;
        })
        .map(([etage, groupe]) => ({ etage, slots: groupe }));
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
