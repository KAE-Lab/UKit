/**
 * L'emploi du temps, joue par le moteur embarque.
 *
 * Ce service n'emet plus aucune requete : il joue quatre Blueprints — la liste des groupes, une
 * journee, une semaine, la plage annuelle de la synchronisation — et travaille la donnee recue. Les
 * quatre visent `celcat.u-bordeaux.fr` **directement** : le relais `ukit.kbdev.io` n'existait que
 * pour contourner une contrainte de navigateur, et une requete emise nativement depuis l'appareil
 * n'y est pas soumise. Un serveur sort donc de l'architecture.
 *
 * Ce qui reste ici est ce qui ne descend pas dans un fichier, et c'est le calcul des plages : le
 * lundi d'un numero de semaine ISO, et la bascule d'annee scolaire au 1er aout. Les deux ont besoin
 * de l'heure courante, ce qui rendrait un Blueprint non rejouable, donc non verifiable. La
 * projection, elle, vit dans `PlanningApiMapping`.
 *
 * Le contrat rendu aux appelants porte desormais l'echec (`{ ok: false, failure }`), sur le modele de
 * `CrousService` : une source en panne et une journee legitimement vide cessent d'etre la meme chose.
 * Le cache, lui, n'a pas bouge d'un octet — il enveloppe l'appel, avant comme apres.
 *
 * Voir docs/features/planning.md et docs/phase-6/6-e-planning.md.
 */

import moment from 'moment';
import type { AbortSignalLike } from '@aetherius/engine';

import { BLUEPRINT, reportFailure, runBlueprint, type UkitFailure } from '../../../shared/aetherius';
import {
    decouperSemaine,
    projeterAnnee,
    projeterGroupes,
    projeterJour,
    type CibleGroupe,
    type CoursExtrait,
    type PlanningEvent,
    type PlanningWeekDay,
} from './PlanningApiMapping';

export type { CibleGroupe, CoursExtrait, PlanningEvent, PlanningWeekDay } from './PlanningApiMapping';

/**
 * Ce qu'un appelant recoit.
 *
 * **Se teste avec `resultat.ok === false`, jamais avec `!resultat.ok`** : sans `strictNullChecks`,
 * TypeScript ne restreint pas une union sur la simple veracite du discriminant. Voir
 * shared/aetherius/runBlueprint.ts.
 */
export type GroupListResult =
    | { readonly ok: true; readonly groups: string[] }
    | { readonly ok: false; readonly failure: UkitFailure };

export type PlanningDayResult =
    | { readonly ok: true; readonly courses: PlanningEvent[] }
    | { readonly ok: false; readonly failure: UkitFailure };

export type PlanningWeekResult =
    | { readonly ok: true; readonly week: PlanningWeekDay[] }
    | { readonly ok: false; readonly failure: UkitFailure };

export type PlanningSyncResult =
    | { readonly ok: true; readonly courses: PlanningEvent[] }
    | { readonly ok: false; readonly failure: UkitFailure };

/** Le signal d'annulation d'un ecran qui peut disparaitre pendant le chargement. */
export interface PlanningRunOptions {
    readonly signal?: AbortSignalLike;
}

function commeListe(valeur: unknown): unknown[] {
    return Array.isArray(valeur) ? valeur : [];
}

/** Le Blueprint prend une liste : un groupe seul en devient une de un element, pas une exception. */
function commeCible(groupe: CibleGroupe): string[] {
    return Array.isArray(groupe) ? groupe : [groupe];
}

class PlanningApiServiceClass {
    /** La liste complete des groupes d'etudiants, filtree et triee. */
    fetchGroupList = async (options: PlanningRunOptions = {}): Promise<GroupListResult> => {
        const run = await runBlueprint(BLUEPRINT.CELCAT_GROUPES, options);
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_GROUPES, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, groups: projeterGroupes(commeListe(run.outputs.groupes)) };
    };

    /**
     * Les cours d'une journee, pour un groupe ou pour l'agregation des favoris.
     *
     * Une seule requete quel que soit le nombre de groupes : `federationIds[]` est une cle repetable,
     * et en faire N requetes multiplierait la charge sur un serveur universitaire.
     */
    fetchCalendarDay = async (
        group: CibleGroupe,
        date: string,
        options: PlanningRunOptions = {},
    ): Promise<PlanningDayResult> => {
        const run = await runBlueprint(BLUEPRINT.CELCAT_JOUR, {
            inputs: { groupes: commeCible(group), jour: date },
            ...options,
        });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_JOUR, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, courses: projeterJour(commeListe(run.outputs.cours) as CoursExtrait[], group, date) };
    };

    /** Les cours d'une semaine, decoupes en six jours du lundi au samedi. */
    fetchCalendarWeek = async (
        group: CibleGroupe,
        week: { year: number; week: number },
        options: PlanningRunOptions = {},
    ): Promise<PlanningWeekResult> => {
        // `startOf('week')` suit la locale : lundi en francais. Le calcul reste ici parce qu'il a
        // besoin de l'heure courante, qu'un Blueprint n'a pas et ne doit pas avoir.
        const lundi = moment().year(week.year).isoWeek(week.week).startOf('week');

        const run = await runBlueprint(BLUEPRINT.CELCAT_SEMAINE, {
            inputs: { groupes: commeCible(group), lundi: lundi.format('YYYY-MM-DD') },
            ...options,
        });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_SEMAINE, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, week: decouperSemaine(commeListe(run.outputs.cours) as CoursExtrait[], group, lundi) };
    };

    /**
     * La plage annuelle utilisee par la synchronisation du calendrier systeme.
     *
     * L'annee scolaire bascule au 1er aout : avant cette date, on interroge celle qui court encore.
     * Le run part d'une tache de fond, sans ecran — aucun `confirm` ne doit donc entrer dans ce
     * Blueprint, personne ne l'ecouterait.
     */
    fetchCalendarForSynchronization = async (
        group: CibleGroupe,
        options: PlanningRunOptions = {},
    ): Promise<PlanningSyncResult> => {
        const maintenant = moment();
        const debut = moment().set('month', 7).startOf('month');
        const fin = moment().set('month', 7).startOf('month').add(1, 'year');

        if (maintenant.isBefore(debut)) {
            debut.subtract(1, 'year');
            fin.subtract(1, 'year');
        }

        const run = await runBlueprint(BLUEPRINT.CELCAT_ANNEE, {
            inputs: {
                groupes: commeCible(group),
                debut: debut.format('YYYY-MM-DD'),
                fin: fin.format('YYYY-MM-DD'),
            },
            ...options,
        });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_ANNEE, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, courses: projeterAnnee(commeListe(run.outputs.cours) as CoursExtrait[], group) };
    };
}

export const PlanningApiService = new PlanningApiServiceClass();
