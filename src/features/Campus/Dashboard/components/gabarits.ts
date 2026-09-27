/**
 * Les mesures des cartes du tableau de bord Campus, en un seul endroit.
 *
 * `width * 0.85` etait ecrit cinq fois — trois cartes et deux sections qui en tirent le pas
 * d'aimantation de leur carrousel — et la hauteur du visuel trois fois (docs/inventaire-mouvement.md,
 * section 2). Le squelette d'une carte (7-I) doit avoir exactement ses mesures : les nommer une fois
 * est ce qui les empeche de diverger entre la carte et son squelette.
 *
 * La largeur se lit au chargement du module, comme avant : le tableau de bord ne suit pas une
 * rotation, l'application est verrouillee en portrait (app.config.ts).
 */

import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/** Une carte de lieu : 85 % de l'ecran, pour que la suivante depasse et dise que le carrousel continue. */
export const LARGEUR_CARTE_LIEU = width * 0.85;

/** Le visuel d'une carte de lieu, dans le carrousel. La liste complete a le sien (180, CampusCard). */
export const HAUTEUR_VISUEL_CARTE = 160;

/**
 * Une carte d'annonce dans son carrousel : 60 % de l'ecran. Une affiche 4:5 a 85 % serait plus haute
 * que la moitie de l'ecran ; a 60 %, elle reste lisible et l'amorce de la suivante depasse du bord.
 */
export const LARGEUR_CARTE_ANNONCE = Math.round(width * 0.6);
