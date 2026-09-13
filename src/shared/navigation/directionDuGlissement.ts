/**
 * Ou mene un glissement horizontal entre onglets — la partie pure du geste (glissementDOnglets.tsx).
 *
 * Un glissement compte s'il a fait assez de chemin **ou** s'il etait assez vif : un petit geste
 * rapide est un geste voulu, un long geste lent aussi. Le doigt qui va vers la gauche amene l'onglet
 * de droite, le suivant ; pas de bouclage aux extremites — glisser plus loin que le dernier onglet ne
 * fait rien, comme partout ailleurs. Les seuils se dosent sur appareil (un ecran de 360 dp est la
 * reference basse), c'est pour cela qu'ils sont nommes.
 */

/** La distance, en points, a partir de laquelle un glissement lent compte. */
export const SEUIL_DISTANCE = 60;
/** La vitesse, en points par seconde, a partir de laquelle un glissement court compte. */
export const SEUIL_VITESSE = 500;

/**
 * `-1` l'onglet precedent, `1` le suivant, `0` rien. `rtl` inverse le sens de lecture.
 */
export function directionDuGlissement(
    translationX: number,
    velocityX: number,
    index: number,
    nombre: number,
    rtl: boolean = false,
): -1 | 0 | 1 {
    const franchi = Math.abs(translationX) >= SEUIL_DISTANCE || Math.abs(velocityX) >= SEUIL_VITESSE;
    if (!franchi) return 0;

    const sens = translationX !== 0 ? translationX : velocityX;
    let direction: -1 | 1 = sens < 0 ? 1 : -1;
    if (rtl) direction = direction === 1 ? -1 : 1;

    const cible = index + direction;
    return cible < 0 || cible >= nombre ? 0 : direction;
}
