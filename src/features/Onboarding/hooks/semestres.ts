/**
 * Les semestres proposes a l'accueil, et celui qu'on presente d'emblee.
 *
 * Le filtre Celcat ne montre rien tant qu'annee et semestre ne sont pas choisis tous les deux : partir
 * sans semestre laissait la liste vide apres le choix de l'annee, sans rien dire (constate le
 * 2026-11-08). Le semestre en cours est la bonne reponse presque toujours, et il se change d'un geste.
 *
 * Sans dependance a l'application, pour se tester sans React Native.
 */

import type { OptionListee } from './useWelcomeState';

export const AUTOMNE: OptionListee = { id: 'autumn', title: 'AUTUMN' };
export const PRINTEMPS: OptionListee = { id: 'spring', title: 'SPRING' };
export const SEMESTRES: readonly OptionListee[] = [AUTOMNE, PRINTEMPS];

/** Le semestre d'une date : le printemps de fevrier a juillet, l'automne d'aout a janvier. */
export function semestreDe(date: Date): OptionListee {
    const mois = date.getMonth();
    return mois >= 1 && mois <= 6 ? PRINTEMPS : AUTOMNE;
}
