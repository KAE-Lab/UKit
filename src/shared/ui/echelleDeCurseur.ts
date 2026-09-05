/**
 * L'arithmetique d'un curseur : convertir une position en valeur, et l'inverse.
 *
 * Elle vit dans son propre fichier pour une raison qui a un precedent dans le depot
 * ([`tokens.ts`](../theme/tokens.ts)) : un composant importe `react-native` et n'est donc pas jouable
 * sous Node, alors que **c'est ici que les erreurs se cachent**. Un arrondi qui tombe du mauvais cote,
 * une borne franchie d'un pas, une division par une largeur encore inconnue : rien de tout ca ne se
 * voit a la relecture, et tout se verifie en une ligne de test.
 *
 * Chaque fonction porte la directive `'worklet'`. Elle est **inerte sous Node** — une expression
 * chaine que l'interpreteur traverse — et fait de la fonction un worklet pour le greffon Babel de
 * `react-native-worklets` : le meme code sert au test et au fil d'animation, la ou une copie
 * divergerait.
 */

/** Les bornes d'un curseur, et son pas. */
export interface EchelleDeCurseur {
    readonly min: number;
    readonly max: number;
    readonly pas: number;
}

/** Ramene une valeur entre les bornes. */
export function borner(valeur: number, echelle: EchelleDeCurseur): number {
    'worklet';
    return Math.max(echelle.min, Math.min(echelle.max, valeur));
}

/**
 * Le cran le plus proche.
 *
 * L'arrondi part de `min` et non de zero : une echelle dont le minimum n'est pas un multiple du pas
 * — 3 minutes par pas de 5 — doit rendre 3, 8, 13, et non 0, 5, 10.
 */
export function arrondirAuPas(valeur: number, echelle: EchelleDeCurseur): number {
    'worklet';
    const crans = Math.round((valeur - echelle.min) / echelle.pas);
    return borner(echelle.min + crans * echelle.pas, echelle);
}

/**
 * Ou poser la poignee pour une valeur donnee.
 *
 * `course` est la distance parcourue par le **bord gauche** de la poignee, soit la largeur mesuree
 * moins la poignee elle-meme. Une course nulle — avant le premier `onLayout` — rend 0 plutot qu'un
 * `NaN` qui se propagerait dans le style.
 */
export function positionDepuisValeur(valeur: number, course: number, echelle: EchelleDeCurseur): number {
    'worklet';
    if (course <= 0 || echelle.max <= echelle.min) return 0;
    return course * (borner(valeur, echelle) - echelle.min) / (echelle.max - echelle.min);
}

/** Quelle valeur, pour une poignee posee la. Toujours sur un cran. */
export function valeurDepuisPosition(x: number, course: number, echelle: EchelleDeCurseur): number {
    'worklet';
    if (course <= 0) return echelle.min;
    return arrondirAuPas(echelle.min + (x / course) * (echelle.max - echelle.min), echelle);
}

/** La poignee ne sort pas de sa piste. */
export function bornerPosition(x: number, course: number): number {
    'worklet';
    return Math.max(0, Math.min(x, course));
}

/** Le cran suivant ou precedent : ce qu'un lecteur d'ecran demande par « augmenter » et « diminuer ». */
export function pasSuivant(valeur: number, sens: 1 | -1, echelle: EchelleDeCurseur): number {
    'worklet';
    return arrondirAuPas(valeur + sens * echelle.pas, echelle);
}
