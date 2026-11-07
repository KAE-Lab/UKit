/**
 * Les cours d'exemple de l'accueil : la vitrine de l'arrivee et l'apercu du theme les partagent. Une
 * journee plausible, datee d'aujourd'hui, dans la langue choisie ; les couleurs viennent de la palette
 * des cours du theme, par ses cles, comme celles d'une vraie source.
 */

import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import type { AppThemeType } from '../../../shared/theme/Theme';
import type { CourseData } from '../../Planning/components/CourseCard';
import { maintenant } from '../../../shared/services/Temps';

const JOURNEE = [
    { matiere: 'VITRINE_COURS', debut: '10:15', fin: '11:45', salle: 'Amphi A22', type: 'VITRINE_CM' },
    { matiere: 'VITRINE_COURS_2', debut: '13:30', fin: '15:00', salle: 'B07', type: 'VITRINE_TD' },
    { matiere: 'VITRINE_COURS_3', debut: '15:15', fin: '17:15', salle: 'TP 12', type: 'VITRINE_TP' },
] as const;

export function coursDExemple(theme: AppThemeType): CourseData[] {
    const jour = moment(maintenant()).format('YYYY-MM-DD');
    const couleurs = Object.keys(theme.courses);
    return JOURNEE.map((cours, rang) => ({
        subject: Translator.get(cours.matiere),
        date: { start: `${jour}T${cours.debut}:00`, end: `${jour}T${cours.fin}:00` },
        schedule: `${cours.debut} - ${cours.fin}`,
        description: cours.salle,
        color: couleurs[(rang * 2 + 1) % Math.max(1, couleurs.length)],
        category: Translator.get(cours.type),
        starttime: cours.debut,
        endtime: cours.fin,
    }));
}

/** L'heure de l'exemple, en minutes depuis minuit : le premier cours commence dans vingt-cinq minutes. */
export const MINUTE_D_EXEMPLE = 9 * 60 + 50;
