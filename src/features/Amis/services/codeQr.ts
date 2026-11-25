/**
 * Le trace du code QR d'un lien d'ami (docs/phase-8/8-amis.md), sans React : `lean-qr` pour la matrice,
 * un trace SVG pour la dessiner (components/CodeQr.tsx).
 *
 * **Les modes sont nommes, et c'est une correction du banc** : par defaut, `lean-qr` essaie aussi le
 * Shift-JIS, dont le decodeur n'existe pas dans Hermes (`RangeError: Unknown encoding: sjis`), et le
 * code ne se dessinait pas. Un lien d'ami est de l'ASCII (ses valeurs sont encodees pour URL) : les
 * modes numerique, alphanumerique et ASCII suffisent, sans ECI.
 */

import { correction, generate, mode } from 'lean-qr';

/** La zone de silence autour du code, en modules (ISO/IEC 18004). */
export const MARGE = 4;

/** Le trace des modules sombres, un carre d'un module par case, et le cote du code marge comprise. */
export function traceDuCodeQr(valeur: string): { readonly trace: string; readonly cote: number } {
    // Le niveau M : lisible a bout de bras, assez court pour un lien de deux cents caracteres.
    const code = generate(valeur, { minCorrectionLevel: correction.M, modes: [mode.numeric, mode.alphaNumeric, mode.ascii] });
    let trace = '';
    for (let y = 0; y < code.size; y += 1) {
        for (let x = 0; x < code.size; x += 1) {
            if (code.get(x, y)) trace += `M${x + MARGE} ${y + MARGE}h1v1h-1z`;
        }
    }
    return { trace, cote: code.size + MARGE * 2 };
}
