/**
 * Les ombres — la partie pure.
 *
 * Une ombre se decrit par trois nombres : le decalage vertical, le flou, l'opacite. Elle se rend par
 * `boxShadow` **sur les deux plateformes** depuis le jalon 7-J (2026-11-05), en une ou plusieurs
 * couches.
 *
 * **Pourquoi plus l'ombre native d'iOS.** Ses quatre proprietes (`shadowColor`, `shadowOpacity`…)
 * se posent sur le calque de la vue, et React Native coupe ce calque quand la vue est en
 * `overflow: hidden` : c'est le cas de toute carte (`Card`), qui rogne son image a son rayon. Lu dans
 * `RCTViewComponentView.mm` (React Native 0.86) : une vue qui porte un `boxShadow` et rogne son
 * contenu recoit un conteneur a part pour le contenu, et l'ombre reste dehors. Les cartes n'avaient
 * donc aucune ombre sur iPhone. `boxShadow` donne en plus la meme ombre aux deux plateformes, et
 * plusieurs couches — un contact net et une portee douce — la ou iOS n'en dessinait qu'une.
 *
 * **Pourquoi plus d'`elevation` sur Android**, depuis 6.2.x : elle dessine une ombre dure, et elle
 * decide de l'ordre de dessin — mesure le 2026-09-11 sur un Galaxy A8 (Android 9), un bandeau eleve
 * recouvrait l'en-tete transparent de navigation, boutons compris. La regle ESLint la refuse.
 *
 * Le flou se donne au sens d'iOS (`shadowRadius`, un ecart-type) et se convertit en `blurRadius` CSS,
 * qui en vaut deux : les specifications ecrites avant 7-J gardent leur sens. Pur : `Theme.ts` appelle
 * `resoudreOmbre`, ce fichier-ci se teste hors appareil, et la console le lit sans `react-native`.
 */

/** Une couche, dans la forme du `boxShadow` de React Native : le type est local, le module reste pur. */
export interface CoucheDOmbre {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly blurRadius: number;
    readonly color: string;
}

export interface SpecOmbre {
    /** Le decalage vertical, en points. */
    readonly y: number;
    /** Le flou, au sens d'iOS (`shadowRadius`). */
    readonly flou: number;
    /** L'opacite du noir de l'ombre. */
    readonly opacite: number;
}

export interface Ombre {
    readonly boxShadow: readonly CoucheDOmbre[];
}

/** `blur-radius` CSS pour un `shadowRadius` iOS : deux ecarts-types. */
export const FLOU_CSS = 2;

function couche(spec: SpecOmbre): CoucheDOmbre {
    return {
        offsetX: 0,
        offsetY: spec.y,
        blurRadius: spec.flou * FLOU_CSS,
        color: `rgba(0, 0, 0, ${Math.min(1, spec.opacite)})`,
    };
}

/** L'ombre, en une couche ou plusieurs, la plus proche de la surface en premier. */
export function resoudreOmbre(spec: SpecOmbre | readonly SpecOmbre[]): Ombre {
    const couches = Array.isArray(spec) ? spec : [spec as SpecOmbre];
    return { boxShadow: couches.map(couche) };
}
