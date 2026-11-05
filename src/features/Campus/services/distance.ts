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

/** Les separateurs d'un nombre, par langue de l'application. */
const SEPARATEURS: Readonly<Record<string, { decimal: string; milliers: string }>> = {
    fr: { decimal: ',', milliers: ' ' },
    es: { decimal: ',', milliers: '.' },
    en: { decimal: '.', milliers: ',' },
};

/**
 * Une distance ecrite pour etre lue d'un coup (7-J) : `277 m`, `1,2 km`, `9 045 km`.
 *
 * La decimale ne sert qu'en dessous de dix kilometres : au-dela, elle ne change aucune decision et
 * s'ecrivait « 9045.4 km », point anglais compris dans une interface en francais. Les metres
 * s'arrondissent a la dizaine, comme un pas. Ecrit a la main plutot que par `Intl`, que Hermes ne
 * porte pas pareil sur toutes les versions d'Android. L'espace avant l'unite est insecable.
 */
export function formaterDistance(km: number, langue: string): string {
    const { decimal, milliers } = SEPARATEURS[langue] ?? SEPARATEURS.en;
    if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
    if (km < 10) return `${km.toFixed(1).replace('.', decimal)} km`;
    const entier = String(Math.round(km)).replace(/\B(?=(\d{3})+(?!\d))/g, milliers);
    return `${entier} km`;
}
