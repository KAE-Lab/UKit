/**
 * Ce que les cases du bandeau d'une fiche lisent, sans dessin (`BandeauDeCases`, 7-J, deuxieme passe).
 *
 * Les dates du fournisseur arrivent au format `AAAA-MM-JJ` (CROUS, Affluences) et se lisent **en heure
 * locale** : `new Date('2026-11-05')`, qu'employaient les anciens bandeaux, les lit en UTC, et a
 * l'ouest de Greenwich le jeudi devenait mercredi. Les libelles restent au composant : ce module ne
 * connait pas la langue choisie.
 */

import moment from 'moment';

/** Le jour d'une date du fournisseur ; `null` si elle manque ou ne se lit pas. */
export function jourDuFournisseur(date: string | null): moment.Moment | null {
    if (date === null) return null;
    const jour = moment(date, 'YYYY-MM-DD', true);
    return jour.isValid() ? jour : null;
}

/** L'heure d'un creneau rond (`08:00`) ; `null` si elle ne se lit pas. */
export function heureDuCreneau(creneau: string): number | null {
    const heure = Number.parseInt(creneau.split(':')[0] ?? '', 10);
    return Number.isNaN(heure) ? null : heure;
}
