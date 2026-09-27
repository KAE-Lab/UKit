/**
 * Le vocabulaire du mouvement, en code : les animations que les composants se partagent, tirees de
 * `tokens.mouvement` (jalon 7-I, docs/theme.md).
 *
 * `tokens.ts` porte les nombres et reste jouable sous Node ; ce module en fait des animations
 * Reanimated, pour qu'une entree, un reflux ou une sortie ne s'ecrivent qu'une fois. Un composant qui
 * anime prend d'abord ce qui est ici ; une animation nouvelle s'ajoute ici avant de servir.
 *
 * Reanimated applique de lui-meme le reglage « reduire les animations » du systeme a tout ce qui est
 * ici (`ReduceMotion.System`, son defaut) : l'entree et la sortie deviennent immediates, le reflux un
 * saut. Seule une boucle doit le lire elle-meme (Squelette).
 */

import { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { tokens } from '../theme/tokens';

const { couture, cascade, ressort } = tokens.mouvement;

/**
 * Le reflux : un element qui change de place parce que ce qui l'entoure a change — une carte qu'un
 * favori remonte, une section qui glisse quand celle du dessus se replie. Le ressort unique.
 */
export const REFLUX = LinearTransition.springify()
    .damping(ressort.damping)
    .mass(ressort.mass)
    .stiffness(ressort.stiffness);

/** La sortie d'un element qui disparait : le fondu de la couture, a l'envers. */
export const SORTIE = FadeOut.duration(couture);

/**
 * L'entree d'un element selon son rang dans une liste qui arrive d'un coup : le fondu de la couture,
 * decale d'un pas par rang. Les rangs au-dela de `cascade.rangs` entrent avec le dernier, sinon la
 * fin d'une longue liste se ferait attendre ; sans rang, l'element entre sans attendre.
 */
export function entreeEnCascade(rang?: number) {
    const fondu = FadeIn.duration(couture);
    if (rang === undefined || rang <= 0) return fondu;
    return fondu.delay(Math.min(rang, cascade.rangs - 1) * cascade.pas);
}
