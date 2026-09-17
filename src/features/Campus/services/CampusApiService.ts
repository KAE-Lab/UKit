/**
 * Les salles de l'universite et leur occupation, jouees par le moteur embarque.
 *
 * Ce service n'emet plus aucune requete : il joue deux Blueprints — la liste des salles, et
 * l'occupation d'une journee — et travaille la donnee recue. Comme cote Planning, les deux visent le
 * serveur de l'universite **directement** ; le relais n'existait que pour contourner une contrainte
 * de navigateur.
 *
 * L'hote et le code d'inventaire viennent du catalogue depuis le jalon 6-G. Un etablissement qui ne
 * publie pas d'emploi du temps n'a pas non plus de salles a exposer : les salles libres se
 * reconstruisent depuis le meme serveur, et l'absence se propage donc naturellement.
 *
 * Les evenements de vacances ne sont **pas** filtres par le Blueprint, contrairement au planning :
 * ce sont eux qui declarent un batiment ferme. Le refiltrage sur la date exacte, lui, reste ici — le
 * serveur deborde, et ce filtre doit vivre a un seul endroit.
 *
 * Voir docs/features/campus-salles-libres.md et docs/phase-6/6-e-planning.md.
 */

import type { AbortSignalLike } from '@aetherius/engine';

import { BLUEPRINT, reportFailure, runBlueprint, type Origine, type UkitFailure } from '../../../shared/aetherius';
import { entreesCelcat, planningAbsent } from '../../../shared/etablissements';
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

/** Le signal d'annulation et l'origine du run — un geste, ou l'application d'elle-meme — pour le disjoncteur (7-C). */
export interface CampusRunOptions {
    readonly signal?: AbortSignalLike;
    readonly origine?: Origine;
}

function commeListe(valeur: unknown): unknown[] {
    return Array.isArray(valeur) ? valeur : [];
}

class CampusApiServiceClass {
    /** La liste complete des salles, telle que Celcat la publie. */
    fetchRoomList = async (options: CampusRunOptions = {}): Promise<RoomListResult> => {
        const celcat = entreesCelcat('salles');
        if (celcat === null) return { ok: false, failure: planningAbsent() };

        const run = await runBlueprint(BLUEPRINT.CELCAT_SALLES, { inputs: { ...celcat }, ...options });
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
     * L'application interroge **une salle par run**, derriere un cache de dix minutes par batiment et
     * par jour (OccupationService, jalon 7-C) : la reponse ne porte pas l'identifiant de la ressource
     * interrogee, donc un run groupe ne permettrait pas de reattribuer les evenements a leur salle —
     * ce que la sonde `sondes/mesures/occupation_groupee.py` mesure, pour decider de la requete groupee.
     * Le decoupage laisse aussi un echec isole ne pas vider tout le batiment.
     */
    fetchRoomsScheduleDay = async (roomIds: string[], date: string, options: CampusRunOptions = {}): Promise<RoomsScheduleResult> => {
        const celcat = entreesCelcat('salles');
        if (celcat === null) return { ok: false, failure: planningAbsent() };

        const run = await runBlueprint(BLUEPRINT.CELCAT_OCCUPATION, {
            inputs: { ...celcat, salles: roomIds, jour: date },
            ...options,
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
