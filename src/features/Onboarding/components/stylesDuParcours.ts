/**
 * Le vocabulaire visuel du parcours d'accueil, partage par ses etapes.
 *
 * Tout vient des tokens et du theme courant : le parcours n'a pas de jeu de styles a lui. Ses carte et
 * pastille sont parties avec l'accueil refait (7-J) : les etapes posent leurs reponses en tuiles
 * (`EtapesDeChoix`).
 * `StyleWelcome` — un second jeu de couleurs, hors des deux themes — est sorti de `Theme.ts` en
 * 6.1-C : l'accueil ne l'importait plus depuis 6-G, et son dernier consommateur n'etait jamais monte.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';

export const MAXIMUM_NUMBER_ITEMS_GROUPLIST = 10;

/**
 * Ce qu'une etape laisse sous elle pour le pied du parcours : le degagement du pied flottant des
 * listes, **plus la marge du systeme en bas**. Le pied pose `paddingBottom: insets.bottom`
 * (WelcomeScreen), et le contenu defile sous lui jusqu'au bas de l'ecran, barre de navigation
 * comprise : sans la marge, la fin d'une etape restait derriere « Suivant ». Mesure sur le banc au
 * format de l'A8 le 2026-11-05 : le pied commencait a 146 points du bas, le degagement en laissait
 * 112, et « Plus tard » ne remontait jamais au-dessus du bouton (7-J).
 */
export function useDegagementDuPied(): number {
    return PIED_FLOTTANT_DEGAGEMENT + useSafeAreaInsets().bottom;
}
