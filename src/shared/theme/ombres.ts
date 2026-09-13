/**
 * Les ombres, resolues par plateforme — la partie pure.
 *
 * Une ombre se decrit par trois nombres : le decalage vertical, le flou, l'opacite. iOS les rend par
 * ses quatre proprietes natives ; Android, depuis React Native 0.76 (nouvelle architecture), par
 * `boxShadow` — un vrai flou, rendu des l'API 28. Jusqu'en 6.2.x, Android recevait une `elevation`,
 * qui dessine une ombre dure, grossiere a cote de celle d'iOS, et qui decide de l'**ordre de dessin** :
 * mesure le 2026-09-11 sur un Galaxy A8 (Android 9), un bandeau eleve recouvrait l'en-tete
 * transparent de navigation, boutons compris. Plus aucune elevation, nulle part ; la regle ESLint le
 * tient.
 *
 * Les deux facteurs Android sont des calibrations, pas des lois : un `shadowRadius` iOS est un
 * ecart-type, un `blur-radius` CSS en vaut deux ; et le compositing Android attenue une ombre floue.
 * Ils se dosent sur appareil, cote a cote avec l'iPhone (docs/theme.md).
 *
 * Pur : `Theme.ts` lit `Platform.OS` et appelle `resoudreOmbre` ; ce fichier-ci est testable.
 */

import type { BoxShadowValue } from 'react-native';

export interface SpecOmbre {
    /** Le decalage vertical, en points. */
    readonly y: number;
    /** Le flou, au sens d'iOS (`shadowRadius`). */
    readonly flou: number;
    /** L'opacite, au sens d'iOS (`shadowOpacity`). */
    readonly opacite: number;
}

export interface OmbreIos {
    readonly shadowColor: string;
    readonly shadowOffset: { readonly width: number; readonly height: number };
    readonly shadowOpacity: number;
    readonly shadowRadius: number;
}

export interface OmbreAndroid {
    readonly boxShadow: readonly BoxShadowValue[];
}

export type Ombre = OmbreIos | OmbreAndroid;

export const COULEUR_OMBRE = '#000';
/** `blur-radius` CSS pour un `shadowRadius` iOS : deux ecarts-types. */
export const FLOU_ANDROID = 2;
/**
 * L'opacite iOS, telle quelle. Dosee sur captures du tableau de bord Campus (Galaxy A8 et iPhone,
 * 2026-09-11 puis 2026-09-13) : doublee, l'ombre etait lourde ; a un quart de plus, encore un peu
 * plus marquee sous une carte. Le facteur reste nomme pour le jour ou un appareil dira autre chose.
 */
export const OPACITE_ANDROID = 1;

export function ombreIos(spec: SpecOmbre): OmbreIos {
    return {
        shadowColor: COULEUR_OMBRE,
        shadowOffset: { width: 0, height: spec.y },
        shadowOpacity: spec.opacite,
        shadowRadius: spec.flou,
    };
}

export function ombreAndroid(spec: SpecOmbre): OmbreAndroid {
    const opacite = Math.min(1, spec.opacite * OPACITE_ANDROID);
    return {
        boxShadow: [{
            offsetX: 0,
            offsetY: spec.y,
            blurRadius: spec.flou * FLOU_ANDROID,
            color: `rgba(0, 0, 0, ${opacite})`,
        }],
    };
}

/** L'ombre de la plateforme : iOS garde la sienne, tout le reste recoit `boxShadow`. */
export function resoudreOmbre(spec: SpecOmbre, os: string): Ombre {
    return os === 'ios' ? ombreIos(spec) : ombreAndroid(spec);
}
