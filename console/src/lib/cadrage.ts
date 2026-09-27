/**
 * Le cadrage d'une image par sa focale, du cote de l'editeur : la partie que le cadre garde, pour le
 * voile du champ, et le point sous le pointeur, pour le poser.
 *
 * La focale elle-meme — sa forme, son defaut, sa position CSS, le ratio du cadre — vit dans le
 * module partage avec l'application (`src/shared/annonces/carte.ts`), qui dit pourquoi elle n'est
 * pas un centre : la console et le telephone recadrent a l'identique.
 *
 * Pur : joue par `npm test` a la racine du depot (cadrage.test.ts).
 */

import type { Focale } from '../../../src/shared/annonces/carte';

/** Une zone de l'image, en fractions : ce que le cadre en montre. */
export interface Zone {
    readonly gauche: number;
    readonly haut: number;
    readonly largeur: number;
    readonly hauteur: number;
}

const TOUTE_L_IMAGE: Zone = { gauche: 0, haut: 0, largeur: 1, hauteur: 1 };

/**
 * La partie d'une image qu'un cadre garde quand l'image le couvre : l'image est mise a l'echelle
 * pour remplir le cadre, et ce qui depasse se coupe d'un cote ou de l'autre selon la focale. Une
 * image plus large que le cadre perd des bords a gauche et a droite ; plus haute, en haut et en bas.
 */
export function zoneGardee(ratioImage: number, focale: Focale, ratioCadre: number): Zone {
    if (!(ratioImage > 0) || !(ratioCadre > 0)) return TOUTE_L_IMAGE;
    if (ratioImage > ratioCadre) {
        const largeur = ratioCadre / ratioImage;
        return { gauche: focale.x * (1 - largeur), haut: 0, largeur, hauteur: 1 };
    }
    const hauteur = ratioImage / ratioCadre;
    return { gauche: 0, haut: focale.y * (1 - hauteur), largeur: 1, hauteur };
}

function borner(valeur: number): number {
    return Math.min(1, Math.max(0, Math.round(valeur * 1000) / 1000));
}

/**
 * Le point de l'image sous le pointeur, depuis la boite de l'image a l'ecran — celle de l'image,
 * jamais celle d'un conteneur plus large : le repere se dessine en fractions de l'image, le clic
 * doit se mesurer dans la meme boite. `null` pour une boite sans surface.
 */
export function focaleDepuisPointeur(x: number, y: number, boite: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }): Focale | null {
    if (!(boite.width > 0) || !(boite.height > 0)) return null;
    return { x: borner((x - boite.left) / boite.width), y: borner((y - boite.top) / boite.height) };
}
