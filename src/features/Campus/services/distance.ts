/**
 * La distance a vol d'oiseau entre deux points, en kilometres (Haversine, Terre spherique).
 *
 * Elle vivait dans `FreeRoomService`, importee par les restaurants, les bibliotheques et les salles
 * libres : une fonction geometrique dans le service d'un seul sous-domaine. Pure, elle est ici et
 * testee. Elle reste applicative — c'est du calcul, qu'il faudrait reimplementer a l'identique dans
 * les deux moteurs si elle descendait dans un Blueprint (docs/blueprints.md).
 */

const RAYON_TERRE_KM = 6371;

function enRadians(degres: number): number {
    return degres * (Math.PI / 180);
}

export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = enRadians(lat2 - lat1);
    const dLon = enRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(enRadians(lat1)) * Math.cos(enRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return RAYON_TERRE_KM * c;
}
