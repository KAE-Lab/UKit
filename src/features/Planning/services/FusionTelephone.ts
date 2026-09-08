/**
 * La fusion des evenements du telephone avec les cours, jour et semaine (jalon 6.1.x-D).
 *
 * Pure, pour que `ScheduleList` — un composant a classe deja dense — ne fasse que l'appeler. La
 * fusion se joue **apres** la derivation des cours (filtres d'UE, indexation des UE, rappels) et
 * jamais avant : `poserLesUE` mute le sujet, et l'indexation prendrait « 2B Dentiste » pour une UE.
 * Ce qui entre ici n'est donc plus touche par rien, sauf le tri.
 *
 * Voir docs/features/planning.md.
 */

import moment from 'moment';

import { assemblerJour, type PlanningEvent, type PlanningWeekDay } from './PlanningAssembly';
import { CLE_JOUR, SOURCE_TELEPHONE } from './TelephoneMapping';

/** Les evenements du telephone, par jour `YYYY-MM-DD`. */
export type TelephoneParJour = ReadonlyMap<string, readonly PlanningEvent[]>;

export const TELEPHONE_VIDE: TelephoneParJour = new Map();

export function estDuTelephone(evenement: { source?: string }): boolean {
    return evenement.source === SOURCE_TELEPHONE;
}

/**
 * Les six jours d'une semaine affichee, du lundi au samedi.
 *
 * La meme expression que `ScheduleList.renderWeekMode` pour sa date de repli : les jours viennent
 * de l'**index de colonne**, jamais de `dayTimestamp` — le cache accepte trois formes historiques
 * de semaine, et toutes n'en portent pas un.
 */
export function joursDeLaSemaine(cible: { week: number; year?: number }): moment.Moment[] {
    const annee = cible.year || moment().year();
    return Array.from({ length: 6 }, (_, index) => moment().year(annee).isoWeek(cible.week).isoWeekday(index + 1).startOf('day'));
}

/** Une journee : les cours, puis le telephone, tries ensemble par le tri d'affichage. */
export function fusionnerJour(cours: PlanningEvent[], telephone: readonly PlanningEvent[] | undefined): PlanningEvent[] {
    if (telephone === undefined || telephone.length === 0) return cours;
    return assemblerJour([...cours, ...telephone]);
}

/** Une semaine : chaque colonne recoit le jour qui lui correspond par son index. */
export function fusionnerSemaine(semaine: PlanningWeekDay[], jours: readonly moment.Moment[], telephone: TelephoneParJour): PlanningWeekDay[] {
    if (telephone.size === 0) return semaine;
    return semaine.map((jour, index) => {
        const cle = jours[index]?.format(CLE_JOUR);
        const evenements = cle === undefined ? undefined : telephone.get(cle);
        return evenements === undefined || evenements.length === 0 ? jour : { ...jour, courses: fusionnerJour(jour.courses, evenements) };
    });
}

/**
 * Les journees entieres a part : sans heures, `groupOverlappingCourses` les mettrait a minuit et les
 * fusionnerait avec le premier cours du matin. Elles se rendent en bandeau, en tete du jour.
 */
export function separerJourneeEntiere<T extends { journeeEntiere?: boolean }>(evenements: readonly T[]): { bandeaux: T[]; horaires: T[] } {
    const bandeaux: T[] = [];
    const horaires: T[] = [];
    for (const evenement of evenements) (evenement.journeeEntiere === true ? bandeaux : horaires).push(evenement);
    return { bandeaux, horaires };
}
