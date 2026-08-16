/**
 * L'emploi du temps, joue par le moteur embarque.
 *
 * Ce service n'emet aucune requete : il joue des Blueprints et travaille la donnee recue. Depuis le
 * jalon 6-I il en existe **deux jeux**, et le catalogue decide lequel — le serveur Celcat de
 * l'universite, ou son export iCalendar. Les quatre signatures publiques n'ont pas bouge d'une
 * lettre : les ecrans ne doivent pas apprendre qu'il y a deux sources, sinon la migration cesse
 * d'etre reversible.
 *
 * Ce n'est pas une branche par etablissement — il n'y a toujours aucun `if (etablissement === …)` —
 * c'est une lecture de ce que le catalogue **declare** (`shared/etablissements/edt.ts`). Un
 * etablissement qui ne declare ni l'un ni l'autre fait rendre `PLANNING_ABSENT` **sans qu'aucun run
 * ne parte** : ce n'est pas une panne, et les deux ne doivent pas s'afficher pareil.
 *
 * Ce qui reste ici est ce qui ne descend pas dans un fichier, et c'est le calcul des plages : le
 * lundi d'un numero de semaine ISO, et la bascule d'annee scolaire au 1er aout. Les deux ont besoin
 * de l'heure courante, ce qui rendrait un Blueprint non rejouable, donc non verifiable. Les deux
 * projections, elles, vivent dans `PlanningApiMapping` et `IcsMapping`.
 *
 * Le contrat rendu aux appelants porte l'echec (`{ ok: false, failure }`) : une source en panne et une
 * journee legitimement vide cessent d'etre la meme chose. Le cache, lui, n'a pas bouge d'un octet — il
 * enveloppe l'appel, avant comme apres.
 *
 * Voir docs/features/planning.md, docs/phase-6/6-e-planning.md et 6-i-planning-universel.md.
 */

import moment from 'moment';
import type { AbortSignalLike } from '@aetherius/engine';

import { BLUEPRINT, reportFailure, runBlueprint, type UkitFailure } from '../../../shared/aetherius';
import { lienEdtAttendu, planningAbsent, sourceEdt, type SourceEdt } from '../../../shared/etablissements';
import { decouperSemaineIcs, projeterAnneeIcs, projeterJourIcs } from './IcsMapping';
import {
    decouperSemaine,
    projeterAnnee,
    projeterGroupes,
    projeterJour,
    type CoursExtrait,
} from './PlanningApiMapping';
import {
    groupesDuReferentiel,
    jouerAbonnement,
    jouerAnnee,
    jouerPlage,
    plageSemaine,
    type IcsRun,
} from './PlanningIcalSource';
import type { CibleGroupe, PlanningEvent, PlanningWeekDay } from './PlanningAssembly';

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

/**
 * `manquants` nomme les groupes favoris que le referentiel ne resout plus.
 *
 * Il accompagne un **succes** : les autres favoris ont bien ete joues. Un seul favori perime ne doit
 * pas vider tout un planning agrege — mais il ne doit pas non plus disparaitre en silence, d'ou ce
 * champ plutot qu'un simple filtrage (jalon 6-I, defaut trouve sur appareil).
 */
export type PlanningDayResult =
    | { readonly ok: true; readonly courses: PlanningEvent[]; readonly manquants?: readonly string[] }
    | { readonly ok: false; readonly failure: UkitFailure };

export type PlanningWeekResult =
    | { readonly ok: true; readonly week: PlanningWeekDay[]; readonly manquants?: readonly string[] }
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

/**
 * La source jouable, ou l'echec qui explique pourquoi il n'y en a pas.
 *
 * Les deux arbres « rien a jouer » de `sourceEdt()` deviennent ici **deux echecs distincts**, et c'est
 * tout l'objet du jalon 6-J : `PLANNING_ABSENT` veut dire « cette universite n'a pas d'emploi du temps
 * », `EDT_LIEN_ATTENDU` veut dire « elle en a un, il te manque un geste ». Les confondre afficherait
 * une phrase d'excuse la ou il faut un bouton.
 *
 * Aucun run ne part dans ni l'un ni l'autre cas : rien n'est en panne, et les deux echecs sont de
 * famille `config`, donc sans bouton Reessayer.
 */
type SourceJouable = Exclude<SourceEdt, { kind: 'lien-attendu' } | { kind: 'aucun' }>;

function source(): SourceJouable | { readonly failure: UkitFailure } {
    const edt = sourceEdt();
    if (edt.kind === 'aucun') return { failure: planningAbsent() };
    if (edt.kind === 'lien-attendu') return { failure: lienEdtAttendu() };
    return edt;
}

/** Les bornes de l'annee scolaire courante. Elle bascule au 1er aout, d'ou l'heure courante ici. */
function anneeScolaire(): { debut: moment.Moment; fin: moment.Moment } {
    const maintenant = moment();
    const debut = moment().set('month', 7).startOf('month');
    const fin = moment().set('month', 7).startOf('month').add(1, 'year');

    if (maintenant.isBefore(debut)) {
        debut.subtract(1, 'year');
        fin.subtract(1, 'year');
    }
    return { debut, fin };
}

class PlanningApiServiceClass {
    /**
     * La liste complete des groupes d'etudiants.
     *
     * Chez Celcat elle vient d'un run, filtree et triee ; par l'export iCalendar elle vient du
     * **referentiel du catalogue**, sans reseau — ADE n'expose aucun arbre de ressources anonyme.
     *
     * Par un abonnement colle, **il n'y en a pas** : le lien est deja l'emploi du temps de cet
     * etudiant-la, nominatif et filtre par son universite. Une liste vide est donc le bon resultat, et
     * non un echec — les ecrans qui proposent de chercher un groupe se taisent par `groupesRequis()`.
     */
    fetchGroupList = async (options: PlanningRunOptions = {}): Promise<GroupListResult> => {
        const edt = source();
        if ('failure' in edt) return { ok: false, failure: edt.failure };
        if (edt.kind === 'abonnement') return { ok: true, groups: [] };
        if (edt.kind === 'ical') return { ok: true, groups: groupesDuReferentiel(edt.config) };

        const run = await runBlueprint(BLUEPRINT.CELCAT_GROUPES, { inputs: { ...edt.entrees }, ...options });
        if (run.ok === false) {
            reportFailure(BLUEPRINT.CELCAT_GROUPES, run.failure);
            return { ok: false, failure: run.failure };
        }

        return { ok: true, groups: projeterGroupes(commeListe(run.outputs.groupes)) };
    };

    /**
     * Les cours d'une journee, pour un groupe ou pour l'agregation des favoris.
     *
     * Une seule requete quel que soit le nombre de groupes, des deux cotes : `federationIds[]` est une
     * cle repetable chez Celcat, `resources` accepte une liste separee par des virgules chez ADE. En
     * faire N multiplierait la charge sur un serveur universitaire.
     */
    fetchCalendarDay = async (
        group: CibleGroupe,
        date: string,
        options: PlanningRunOptions = {},
    ): Promise<PlanningDayResult> => {
        const edt = source();
        if ('failure' in edt) return { ok: false, failure: edt.failure };

        if (edt.kind === 'abonnement') {
            // Le calendrier arrive **entier** : un lien colle ne prend pas de bornes, c'est ce qui le
            // rend universel. La journee se decoupe donc ici, et `moment(date)` lit la date locale.
            const run = await jouerAbonnement(edt.lien, options);
            if (run.ok === false) return { ok: false, failure: run.failure };
            return { ok: true, courses: projeterJourIcs(run.ics, group, moment(date)) };
        }

        if (edt.kind === 'ical') {
            // Les bornes d'ADE sont inclusives : une journee se demande par `debut = fin`.
            const run = await jouerPlage(edt.config, group, { debut: date, fin: date }, options);
            if (run.ok === false) return { ok: false, failure: run.failure };
            return { ok: true, courses: projeterJourIcs(run.ics, group), manquants: run.manquants };
        }

        const run = await runBlueprint(BLUEPRINT.CELCAT_JOUR, {
            inputs: { ...edt.entrees, groupes: commeCible(group), jour: date },
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
        const edt = source();
        if ('failure' in edt) return { ok: false, failure: edt.failure };

        // `startOf('week')` suit la locale : lundi en francais. Le calcul reste ici parce qu'il a
        // besoin de l'heure courante, qu'un Blueprint n'a pas et ne doit pas avoir.
        const lundi = moment().year(week.year).isoWeek(week.week).startOf('week');

        if (edt.kind === 'abonnement') {
            const run = await jouerAbonnement(edt.lien, options);
            if (run.ok === false) return { ok: false, failure: run.failure };
            return { ok: true, week: decouperSemaineIcs(run.ics, group, lundi) };
        }

        if (edt.kind === 'ical') {
            const run = await jouerPlage(edt.config, group, plageSemaine(lundi), options);
            if (run.ok === false) return { ok: false, failure: run.failure };
            return { ok: true, week: decouperSemaineIcs(run.ics, group, lundi), manquants: run.manquants };
        }

        const run = await runBlueprint(BLUEPRINT.CELCAT_SEMAINE, {
            inputs: { ...edt.entrees, groupes: commeCible(group), lundi: lundi.format('YYYY-MM-DD') },
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
     * Le run part d'une tache de fond, sans ecran — aucun `confirm` ne doit donc entrer dans ces
     * Blueprints, personne ne l'ecouterait.
     */
    fetchCalendarForSynchronization = async (
        group: CibleGroupe,
        options: PlanningRunOptions = {},
    ): Promise<PlanningSyncResult> => {
        const edt = source();
        if ('failure' in edt) return { ok: false, failure: edt.failure };

        const { debut, fin } = anneeScolaire();

        if (edt.kind === 'abonnement') {
            // Rien a borner : la reponse porte deja tout ce que l'etablissement publie, et la
            // synchronisation veut precisement toute l'annee.
            const run = await jouerAbonnement(edt.lien, options);
            if (run.ok === false) return { ok: false, failure: run.failure };
            return { ok: true, courses: projeterAnneeIcs(run.ics, group) };
        }

        if (edt.kind === 'ical') {
            const plage = { debut: debut.format('YYYY-MM-DD'), fin: fin.format('YYYY-MM-DD') };
            const run: IcsRun = await jouerAnnee(edt.config, group, plage, options);
            if (run.ok === false) return { ok: false, failure: run.failure };
            return { ok: true, courses: projeterAnneeIcs(run.ics, group) };
        }

        const run = await runBlueprint(BLUEPRINT.CELCAT_ANNEE, {
            inputs: {
                ...edt.entrees,
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
