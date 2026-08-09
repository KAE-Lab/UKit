/**
 * Les salles de l'universite et leur occupation, jouees par le moteur embarque.
 *
 * Ce service n'emet plus aucune requete : il joue deux Blueprints — la liste des salles, et
 * l'occupation d'une journee — et travaille la donnee recue. Comme cote Planning, les deux visent
 * `celcat.u-bordeaux.fr` **directement** ; le relais n'existait que pour contourner une contrainte de
 * navigateur.
 *
 * Les evenements de vacances ne sont **pas** filtres par le Blueprint, contrairement au planning :
 * ce sont eux qui declarent un batiment ferme. Le refiltrage sur la date exacte, lui, reste ici — le
 * serveur deborde, et ce filtre doit vivre a un seul endroit.
 *
 * Voir docs/features/campus-salles-libres.md et docs/phase-6/6-e-planning.md.
 */

import { BLUEPRINT, reportFailure, runBlueprint, type UkitFailure } from '../../../shared/aetherius';
import {
    extractBuildingsFromRooms,
    occupationDuJour,
    projeterSalles,
    type CampusEvent,
    type CelcatBuilding,
    type CelcatRoom,
    type OccupationExtraite,
    type SalleExtraite,
} from './CampusApiMapping';

export type { CampusEvent, CelcatBuilding, CelcatRoom } from './CampusApiMapping';

/**
 * Ce qu'un appelant recoit.
 *
 * **Se teste avec `resultat.ok === false`** (voir shared/aetherius/runBlueprint.ts).
 */
export type RoomListResult =
    | { readonly ok: true; readonly rooms: CelcatRoom[] }
    | { readonly ok: false; readonly failure: UkitFailure };

export type RoomsScheduleResult =
    | { readonly ok: true; readonly events: CampusEvent[] }
    | { readonly ok: false; readonly failure: UkitFailure };

function commeListe(valeur: unknown): unknown[] {
    return Array.isArray(valeur) ? valeur : [];
}

class CampusApiServiceClass {
    /** La liste complete des salles, telle que Celcat la publie. */
    fetchRoomList = async (): Promise<RoomListResult> => {
        const run = await runBlueprint(BLUEPRINT.CELCAT_SALLES);
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_SALLES, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, rooms: projeterSalles(commeListe(run.outputs.salles) as SalleExtraite[]) };
    };

    /** La reconstruction des batiments reste exposee ici : les appelants l'appellent apres la liste. */
    extractBuildingsFromRooms = (rooms: CelcatRoom[]): CelcatBuilding[] => extractBuildingsFromRooms(rooms);

    /**
     * L'occupation d'une journee pour une ou plusieurs salles.
     *
     * L'application interroge **une salle par run**, et ce n'est pas une inefficacite a corriger : la
     * reponse ne porte pas l'identifiant de la ressource interrogee, donc un run groupe ne
     * permettrait pas de reattribuer les evenements a leur salle. Le decoupage laisse aussi un echec
     * isole ne pas vider tout le batiment.
     */
    fetchRoomsScheduleDay = async (roomIds: string[], date: string): Promise<RoomsScheduleResult> => {
        const run = await runBlueprint(BLUEPRINT.CELCAT_OCCUPATION, {
            inputs: { salles: roomIds, jour: date },
        });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_OCCUPATION, run.failure);
            return { ok: false, failure: run.failure };
        }

        return {
            ok: true,
            events: occupationDuJour(commeListe(run.outputs.evenements) as OccupationExtraite[], date),
        };
    };
}

export const CampusApiService = new CampusApiServiceClass();
