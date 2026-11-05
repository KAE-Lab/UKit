/**
 * Ce que la vue semaine en agenda decide, sans React (7-J, deuxieme passe) : la date d'un jour, son
 * etat par rapport a aujourd'hui, et les jours qui s'affichent. `AgendaDeLaSemaine` dessine.
 */

import moment from 'moment';

import type { PlanningEvent } from './PlanningAssembly';
import { separerJourneeEntiere } from './FusionTelephone';

/** Un jour de semaine tel que le cache le garde : quatre noms de date, selon l'age du cache. */
export interface JourDuCache {
    date?: string;
    day?: string;
    dateString?: string;
    name?: string;
    courses?: PlanningEvent[];
}

/**
 * La date d'un jour : son champ de date, puis le debut de son premier cours, puis la date de repli
 * qu'on deduit de son rang dans la semaine. La logique etait celle des jours repliables (6-E).
 */
export function dateDuJour(jour: JourDuCache, repli?: moment.MomentInput): moment.Moment {
    let brut = jour.date ?? jour.day ?? jour.dateString ?? jour.name;
    if (!brut && jour.courses && jour.courses.length > 0) brut = jour.courses[0].date?.start;
    const date = brut ? moment(brut, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', moment.ISO_8601]) : moment.invalid();
    return !date.isValid() && repli !== undefined ? moment(repli) : date;
}

export type EtatDuJour = 'passe' | 'aujourdhui' | 'avenir';

export function etatDuJour(jour: moment.Moment, instant: Date): EtatDuJour {
    const aujourdhui = moment(instant).startOf('day');
    if (jour.isSame(aujourdhui, 'day')) return 'aujourdhui';
    return jour.isBefore(aujourdhui, 'day') ? 'passe' : 'avenir';
}

/**
 * Les cours d'un jour, tels que l'agenda les montre : sans les creneaux vides ni les cours masques
 * par un filtre, tries par heure, et les journees entieres du telephone a part, en bandeau.
 */
export function coursDuJour(cours: readonly PlanningEvent[] | undefined): { bandeaux: PlanningEvent[]; horaires: PlanningEvent[] } {
    const actifs = (cours ?? []).filter((c) => c.category !== 'nocourse' && c.category !== 'masked');
    const { bandeaux, horaires } = separerJourneeEntiere(actifs);
    return { bandeaux, horaires: [...horaires].sort((a, b) => a.starttime.localeCompare(b.starttime)) };
}

/** Le samedi et le dimanche ne s'affichent que s'ils portent un cours : vides, ils allongeaient la page. */
export function jourAffiche(date: moment.Moment, nombre: number): boolean {
    const isoJour = date.isoWeekday();
    return isoJour <= 5 || nombre > 0;
}
