/**
 * Les exemples de l'accueil : la vitrine de l'arrivee et l'apercu du theme les partagent.
 *
 * Des donnees reelles, relevees aux sources de l'application le 2026-11-08 : une journee de Licence
 * d'informatique sur Celcat (groupe `INF601A5`), un restaurant du Crous et une bibliotheque de Talence.
 * La forme d'une vraie carte (code d'UE, salle, type), sans nom d'enseignant ; des exemples inventes
 * se reconnaissaient comme tels (review du 2026-11-07). Ces noms sont ceux des sources : ils ne se
 * traduisent pas, comme un vrai cours dans une application en anglais.
 */

import moment from 'moment';

import type { AppThemeType } from '../../../shared/theme/Theme';
import type { CourseData } from '../../Planning/components/CourseCard';
import { maintenant } from '../../../shared/services/Temps';

const JOURNEE = [
    { matiere: '4TIN603U Compilation', debut: '11:00', fin: '12:20', salle: 'A22/Amphithéâtre Charles DARWIN', type: 'Cours' },
    { matiere: '4TIN602U Techn algorithmiques et program', debut: '14:00', fin: '15:20', salle: 'A9.b / Salle 102', type: 'TD' },
    { matiere: '4TIN612U Projets de Développement Logiciel', debut: '15:30', fin: '16:50', salle: 'CREMI - Bât. A28 Salle 208', type: 'TD Machine' },
] as const;

export const RESTAURANT = {
    nom: "Resto U L'Amazone",
    zone: 'Talence',
    horaires: ['du lundi au vendredi', '11h45-13h45'],
    distance: 0.64,
} as const;

export const BIBLIOTHEQUE = { nom: 'BU ST Bordeaux-Talence', campus: 'Talence', distance: 0.35 } as const;

export function coursDExemple(theme: AppThemeType): CourseData[] {
    const jour = moment(maintenant()).format('YYYY-MM-DD');
    const couleurs = Object.keys(theme.courses);
    return JOURNEE.map((cours, rang) => ({
        subject: cours.matiere,
        date: { start: `${jour}T${cours.debut}:00`, end: `${jour}T${cours.fin}:00` },
        schedule: `${cours.debut} - ${cours.fin}`,
        description: cours.salle,
        color: couleurs[(rang * 2 + 1) % Math.max(1, couleurs.length)],
        category: cours.type,
        starttime: cours.debut,
        endtime: cours.fin,
    }));
}

/** L'heure de l'exemple, en minutes depuis minuit : le premier cours commence dans vingt-cinq minutes. */
export const MINUTE_D_EXEMPLE = 10 * 60 + 35;
