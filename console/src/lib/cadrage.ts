/**
 * Le cadrage d'une image par sa focale : ce que le champ qui la choisit et l'apercu qui la montre
 * doivent dire de la meme facon.
 *
 * **La focale n'est pas un centre.** Elle s'applique comme `object-position` en pourcentages :
 * `80% 90%` aligne le point situe a 80 % de l'image sur le point situe a 80 % du cadre. Le point
 * choisi reste donc toujours visible, a la meme place relative, et il n'est au centre du cadre que
 * pour 50 %. C'est la semantique de `contentPosition` d'expo-image, « l'equivalent de
 * `object-position` », celle que l'application appliquera en 6.3 : la console et le telephone
 * recadrent a l'identique.
 *
 * Pur : joue par `npm test` a la racine du depot (cadrage.test.ts).
 */

/** Un point de l'image, en fractions de sa largeur et de sa hauteur. */
export interface Focale {
    readonly x: number;
    readonly y: number;
}

/** Une zone de l'image, en fractions : ce que le cadre en montre. */
export interface Zone {
    readonly gauche: number;
    readonly haut: number;
    readonly largeur: number;
    readonly hauteur: number;
}

/** Le cadre de la carte d'annonce v2 : quatre de large pour cinq de haut. */
export const RATIO_CARTE = 4 / 5;

const TOUTE_L_IMAGE: Zone = { gauche: 0, haut: 0, largeur: 1, hauteur: 1 };

/** La focale en `object-position`, comme l'apercu et l'application l'appliquent. */
export function positionDeFocale(focale: Focale): string {
    return `${Math.round(focale.x * 100)}% ${Math.round(focale.y * 100)}%`;
}

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
