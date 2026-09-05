/**
 * La position de l'etudiant, resolue une fois pour tout le Campus.
 *
 * Le tableau de bord la demandait, puis chaque ecran de liste la redemandait a l'ouverture : une
 * permission verifiee et une lecture GPS par ecran, pour une valeur qui n'a pas bouge (6.1-C). La
 * derniere resolution est partagee entre toutes les instances pendant cinq minutes, et une resolution
 * en vol est rendue telle quelle a qui la demande en meme temps.
 *
 * Voir docs/features/campus.md.
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export interface PositionResolue {
    readonly lat: number;
    readonly lon: number;
    /** La permission a ete refusee ou la lecture a echoue : la position est celle du repli. */
    readonly error: boolean;
}

/** Cinq minutes : un etudiant qui traverse le campus n'a pas change de restaurant le plus proche. */
const VALIDITE_POSITION_MS = 5 * 60 * 1000;
/** Le repli des emulateurs et des refus : le campus de Talence. */
const REPLI_TALENCE: PositionResolue = { lat: 44.8048, lon: -0.5954, error: true };

let derniere: { position: PositionResolue; a: number } | null = null;
let enVol: Promise<PositionResolue> | null = null;

async function resoudre(): Promise<PositionResolue> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return REPLI_TALENCE;

        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
        if (!location) return REPLI_TALENCE;
        return { lat: location.coords.latitude, lon: location.coords.longitude, error: false };
    } catch {
        return REPLI_TALENCE;
    }
}

/** La position partagee : la derniere si elle est fraiche, celle en vol sinon, une nouvelle a defaut. */
export function positionPartagee(): Promise<PositionResolue> {
    // L'horloge reelle, comme tout horodatage de cache : la simulation du menu ne perime pas une position.
    if (derniere !== null && Date.now() - derniere.a < VALIDITE_POSITION_MS) return Promise.resolve(derniere.position);
    if (enVol !== null) return enVol;
    enVol = resoudre().then((position) => {
        // Un repli n'est pas garde : la prochaine demande retente la permission et la lecture.
        if (!position.error) derniere = { position, a: Date.now() };
        enVol = null;
        return position;
    });
    return enVol;
}

export function useCampusLocation() {
    const [locationError, setLocationError] = useState(false);

    const fetchLocation = useCallback(async () => {
        const position = await positionPartagee();
        if (position.error) setLocationError(true);
        return position;
    }, []);

    return { fetchLocation, locationError };
}
