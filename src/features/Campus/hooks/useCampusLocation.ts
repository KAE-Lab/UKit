/**
 * La position de l'etudiant, resolue une fois pour tout le Campus.
 *
 * Le tableau de bord la demandait, puis chaque ecran de liste la redemandait a l'ouverture : une
 * permission verifiee et une lecture GPS par ecran, pour une valeur qui n'a pas bouge (6.1-C). La
 * derniere resolution est partagee entre toutes les instances pendant cinq minutes, et une resolution
 * en vol est rendue telle quelle a qui la demande en meme temps.
 *
 * **Sans position, aucune position** (decision du 2026-11-10). Un refus ou une lecture impossible
 * rendait le centre de Talence, et les distances comptees depuis lui s'affichaient comme celles de
 * l'etudiant. La resolution rend desormais `null`, et les ecrans taisent la distance.
 *
 * Voir docs/features/campus.md.
 */

import * as Location from 'expo-location';

export interface Coordonnees {
    readonly lat: number;
    readonly lon: number;
}

/** `null` : la permission est refusee ou la lecture a echoue. Aucune position de repli. */
export type PositionResolue = Coordonnees | null;

/** Cinq minutes : un etudiant qui traverse le campus n'a pas change de restaurant le plus proche. */
const VALIDITE_POSITION_MS = 5 * 60 * 1000;

let derniere: { position: Coordonnees; a: number } | null = null;
let enVol: Promise<PositionResolue> | null = null;

/**
 * La permission, demandee **une seule fois**.
 *
 * Elle se lit d'abord, sans rien afficher, et ne se demande que si personne n'a encore repondu
 * (`undetermined`). Un refus reste un refus : Android 9 reposait la question a chaque visite du Campus
 * tant que « Ne plus demander » n'etait pas coche (audit du lot 1). Une permission accordee ensuite
 * dans les reglages du systeme est lue a la visite suivante.
 */
async function permissionAccordee(): Promise<boolean> {
    const lue = await Location.getForegroundPermissionsAsync();
    if (lue.status === 'granted') return true;
    if (lue.status !== 'undetermined') return false;
    const demandee = await Location.requestForegroundPermissionsAsync();
    return demandee.status === 'granted';
}

async function resoudre(): Promise<PositionResolue> {
    try {
        if (!(await permissionAccordee())) return null;

        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
            location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
        if (!location) return null;
        return { lat: location.coords.latitude, lon: location.coords.longitude };
    } catch {
        // Un service de localisation coupe ou une lecture qui echoue : pas de position, et l'ecran le
        // sait par `null`. Rien a journaliser, c'est un etat du telephone, pas une panne.
        return null;
    }
}

/** La position partagee : la derniere si elle est fraiche, celle en vol sinon, une nouvelle a defaut. */
export function positionPartagee(): Promise<PositionResolue> {
    // L'horloge reelle, comme tout horodatage de cache : la simulation du menu ne perime pas une position.
    if (derniere !== null && Date.now() - derniere.a < VALIDITE_POSITION_MS) return Promise.resolve(derniere.position);
    if (enVol !== null) return enVol;
    enVol = resoudre().then((position) => {
        // Une absence n'est pas gardee : la prochaine visite relit la permission et la position, sans
        // la redemander.
        if (position !== null) derniere = { position, a: Date.now() };
        enVol = null;
        return position;
    });
    return enVol;
}
