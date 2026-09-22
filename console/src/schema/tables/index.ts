/**
 * Les descripteurs des tables publiables, un par page de la console — un fichier par table ou par
 * famille, rassembles ici dans l'ordre de la navigation.
 *
 * Chaque avertissement reprend une regle ecrite dans docs/backend.md : la console ne les invente
 * pas, elle les met la ou on ecrit. Les Blueprints n'ont pas de descripteur, et c'est une decision
 * (docs/phase-6/6-1-b-pilotage-a-distance.md) : ils se publient par le script, qui les valide.
 */

import type { Descripteur } from '../descripteurs';
import { ANNONCES } from './annonces';
import { JETONS, MESSAGES } from './messages';
import { BATIMENTS, ETABLISSEMENTS, SALUTATIONS, TESTEURS, VERSION, VISUELS } from './publiees';
import { RETOURS } from './retours';

export { ANNONCES, BATIMENTS, ETABLISSEMENTS, JETONS, MESSAGES, RETOURS, SALUTATIONS, TESTEURS, VERSION, VISUELS };

/** Les pages a descripteur, dans l'ordre de la navigation ; `section` dit sous quel titre. */
export const RESSOURCES: readonly Descripteur[] = [RETOURS, JETONS, ANNONCES, MESSAGES, TESTEURS, VISUELS, ETABLISSEMENTS, SALUTATIONS, BATIMENTS, VERSION];

export function ressourceDe(chemin: string): Descripteur | undefined {
    return RESSOURCES.find((ressource) => ressource.chemin === chemin);
}
