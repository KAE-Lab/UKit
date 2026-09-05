/**
 * Le vocabulaire visuel du parcours d'accueil, partage par ses etapes.
 *
 * Tout vient des tokens et du theme courant : le parcours n'a pas de jeu de styles a lui.
 * `StyleWelcome` — un second jeu de couleurs, hors des deux themes — est sorti de `Theme.ts` en
 * 6.1-C : l'accueil ne l'importait plus depuis 6-G, et son dernier consommateur n'etait jamais monte.
 */

import { tokens } from '../../../shared/theme/Theme';
import { PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';

export type ThemeObj = Record<string, string>;

export const MAXIMUM_NUMBER_ITEMS_GROUPLIST = 10;

/** Ce qu'une etape laisse sous elle pour le pied du parcours : le degagement du pied flottant des listes. */
export const DEGAGEMENT_PIED_PARCOURS = PIED_FLOTTANT_DEGAGEMENT;

/** La carte qui enveloppe chaque groupe de choix. Une seule definition, cinq usages. */
export const carte = (themeObj: ThemeObj) => ({
    backgroundColor: themeObj.cardBackground,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    marginBottom: tokens.space.md,
    borderWidth: 1,
    borderColor: themeObj.border,
    ...tokens.shadow.sm,
});

export const titreDeCarte = (themeObj: ThemeObj) => ({
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: themeObj.font,
    marginBottom: tokens.space.md,
});

/** Une pastille de choix : le motif visuel de tout le parcours, factorise plutot que recopie. */
export const pastille = (themeObj: ThemeObj, selected: boolean) => ({
    backgroundColor: themeObj.greyBackground,
    borderWidth: 2,
    borderColor: selected ? themeObj.primary : 'transparent',
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginRight: tokens.space.sm,
    marginBottom: tokens.space.sm,
});

export const texteDePastille = (themeObj: ThemeObj, selected: boolean) => ({
    color: selected ? themeObj.primary : themeObj.fontSecondary,
    fontWeight: selected ? tokens.fontWeight.bold : tokens.fontWeight.medium,
    fontSize: tokens.fontSize.sm,
});
