/**
 * Les journees entieres d'un iCalendar, etalees sur chacun de leurs jours.
 *
 * Sorti d'IcsMapping.ts : la reconnaissance d'une journee entiere, puis son etalement sur le contrat
 * de l'emploi du temps. Ses cas sont dans IcsMapping.test.ts, qui les joue par les vues jour et semaine.
 *
 * Voir docs/features/planning.md.
 */

import type ICAL from 'ical.js';
import moment from 'moment';

import type { PlanningEvent } from './PlanningAssembly';

/**
 * L'evenement est-il une **journee entiere** — un `DTSTART` de type date, sans heure (RFC 5545) ?
 *
 * C'est la forme des vacances et des jours feries de l'export PRONOTE (onze dans l'annee de l'IUT,
 * mesure du 2026-11-10). Projetes comme un cours, ils s'affichaient « 00:00 - 00:00 » dans le fil de
 * la journee (limite ecrite au jalon 6-J) ; marques, ils prennent le bandeau que le Planning dessine
 * deja pour les calendriers du telephone.
 */
export function estJourneeEntiere(evenement: ICAL.Component): boolean {
    const valeur = evenement.getFirstPropertyValue('dtstart');
    return valeur !== null && typeof valeur === 'object' && 'isDate' in valeur && valeur.isDate === true;
}

/** Au-dela, une fin est aberrante : une journee entiere ne s'etale pas sur plus d'une annee. */
const JOURS_MAX = 366;

/**
 * Une journee entiere de plusieurs jours, etalee en un evenement par jour.
 *
 * Les vacances de la Toussaint sont **un** evenement de neuf jours (`DTEND` exclusif, a minuit). Le
 * Planning range un evenement au jour de son debut : sans cet etalement, le bandeau ne paraissait que
 * le premier samedi. Chaque copie porte un identifiant a elle, que les listes exigent uniques.
 *
 * Applique aux vues jour et semaine seulement : la plage annuelle, qui sert la synchronisation de
 * l'agenda, garde l'evenement tel que la source le donne.
 */
export function etalerJourneesEntieres(evenements: readonly PlanningEvent[]): PlanningEvent[] {
    return evenements.flatMap((evenement) => {
        if (evenement.journeeEntiere !== true) return [evenement];
        const debut = moment(evenement.date.start ?? null).startOf('day');
        const fin = moment(evenement.date.end ?? null);
        if (!debut.isValid() || !fin.isValid()) return [evenement];

        const jours: PlanningEvent[] = [];
        for (const jour = debut.clone(); jour.isBefore(fin) && jours.length < JOURS_MAX; jour.add(1, 'day')) {
            jours.push({
                ...evenement,
                id: `${evenement.id}@${jour.format('YYYY-MM-DD')}`,
                date: { start: jour.toISOString(), end: jour.clone().add(1, 'day').toISOString() },
            });
        }
        return jours.length > 1 ? jours : [evenement];
    });
}
