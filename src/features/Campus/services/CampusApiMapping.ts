/**
 * Le contrat des salles et de leur occupation, et la traduction depuis les sorties Celcat.
 *
 * Separe de `CampusApiService` pour la meme raison que `CrousMapping` : ce module ne doit **rien**
 * importer de plateforme ni le socle Aetherius. Ce qui est risque ici — la correspondance textuelle
 * d'une salle vers son batiment, une fin d'evenement nulle — le devient (CampusApiMapping.test.ts).
 *
 * Une seule dependance non triviale subsiste et elle est assumee : le referentiel des batiments, qui
 * est notre propre donnee, embarquee puis surcouchee. C'est lui qui decide de l'eligibilite a l'acces
 * libre, pas Celcat.
 *
 * Voir docs/features/campus-salles-libres.md et docs/phase-6/6-e-planning.md.
 */

import moment from 'moment';

import { allBuildingRefs, type BuildingSchedule } from '../../../shared/locations/referentiel';
import { formatDescription } from '../../../shared/utils/formatUtils';

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
    /**
     * Les horaires d'ouverture du batiment, indexes par jour ISO.
     *
     * Le champ etait declare `string | null`, ce qu'il n'a jamais ete : il porte le sous-arbre du
     * referentiel, que l'ecran lit comme un dictionnaire (`schedule['1'].open`). Le mensonge ne se
     * voyait pas parce que la table intermediaire n'etait pas typee ; il l'est desormais. Le contrat
     * jumeau `BuildingInfo` de FreeRoomService porte encore la meme erreur — voir
     * docs/features/campus-salles-libres.md.
     */
    schedule?: BuildingSchedule | null;
}

export interface CampusEvent {
    id: string;
    starttime: string;
    endtime: string;
    date: { start: string; end: string };
    description: string;
    isVacances: boolean;
}

/** Une ligne de `outputs.salles`, telle que `ukit.celcat.salles` la nomme. */
export interface SalleExtraite {
    id?: unknown;
    libelle?: unknown;
}

/** Une ligne de `outputs.evenements`, telle que `ukit.celcat.occupation` la nomme. */
export interface OccupationExtraite {
    id?: unknown;
    debut?: unknown;
    fin?: unknown;
    categorie?: unknown;
    description?: unknown;
}

function texte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur : '';
}

/**
 * Les salles utilisables : celles dont le libelle depasse deux caracteres.
 *
 * Le filtre reste applicatif comme celui des groupes — c'est un test de longueur, donc du calcul, et
 * un calcul dans un Blueprint devrait etre reimplemente a l'identique dans les deux moteurs.
 */
export function projeterSalles(brutes: SalleExtraite[]): CelcatRoom[] {
    const salles: CelcatRoom[] = [];
    for (const brute of brutes) {
        const libelle = texte(brute.libelle);
        if (libelle.length <= 2) continue;
        salles.push({ id: texte(brute.id), name: libelle });
    }
    return salles;
}

/**
 * Un evenement d'occupation.
 *
 * `fin` est **nulle** sur les evenements de vacances, que Celcat sert en journee entiere : `moment`
 * en fait une date invalide, exactement comme le code d'origine. `isVacances` reste calcule sur deux
 * criteres parce que la source utilise les deux — une categorie, et parfois seulement une mention
 * dans la description.
 */
export function projeterOccupation(brut: OccupationExtraite): CampusEvent {
    // `?? null` et non `?? undefined` : `moment(undefined)` vaut *maintenant*.
    const debut = moment(brut.debut ?? null);
    const fin = moment(brut.fin ?? null);
    const description = texte(brut.description);

    return {
        id: texte(brut.id),
        starttime: debut.format('HH:mm'),
        endtime: fin.format('HH:mm'),
        date: { start: debut.toISOString(), end: fin.toISOString() },
        description: formatDescription(description),
        isVacances: texte(brut.categorie) === 'Vacances' || description.toLowerCase().includes('vacances'),
    };
}

/** Le debordement du serveur, refiltre sur la date exacte demandee. */
export function occupationDuJour(brutes: OccupationExtraite[], date: string): CampusEvent[] {
    const evenements: CampusEvent[] = [];
    for (const brut of brutes) {
        if (moment(brut.debut ?? null).format('YYYY-MM-DD') !== date) continue;
        evenements.push(projeterOccupation(brut));
    }
    return evenements;
}

/**
 * Reconstitue les batiments a partir des salles.
 *
 * Celcat expose des salles, pas des batiments, et il ne sait pas lesquelles sont reellement
 * accessibles librement aux etudiants. C'est le referentiel — socle embarque et surcouche publiee
 * confondus — qui decide : un batiment ouvert en acces libre, un horaire corrige ou un visuel
 * remplace arrive ici sans release (docs/blueprints.md).
 */
export function extractBuildingsFromRooms(rooms: CelcatRoom[]): CelcatBuilding[] {
    const locationsData = allBuildingRefs();

    const freeAccessBuildings = Object.keys(locationsData).filter((key) => locationsData[key].freeAccess === true);

    const buildingsMap = new Map<string, CelcatBuilding>();

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
            schedule: loc.schedule,
        });
    }

    for (const room of rooms) {
        if (room.name.toLowerCase().includes('en attente')) continue;

        for (const buildingKey of freeAccessBuildings) {
            // Mot entier d'abord, inclusion simple en repli : la correspondance est textuelle, et un
            // renommage cote Celcat peut rattacher une salle au mauvais batiment.
            const regex = new RegExp(`\\b${buildingKey}\\b`, 'i');
            if (regex.test(room.name) || room.name.includes(buildingKey)) {
                // Retirer le suffixe entre parentheses, puis tronquer a partir de « salle » :
                // `A28 - Salle 001 (Informatique)` devient `Salle 001`.
                const cleanName = room.name.replace(/\s*\([^)]*\)$/, '').trim();
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
                    fullName: room.name,
                });
                break;
            }
        }
    }

    return Array.from(buildingsMap.values())
        .filter((batiment) => batiment.rooms.length > 0)
        .sort((gauche, droite) => gauche.name.localeCompare(droite.name));
}
