/**
 * Le code QR d'un lien d'ami, genere sur l'appareil (docs/phase-8/8-amis.md) : `lean-qr`, sans
 * dependance ni natif, pour la matrice ; `react-native-svg`, deja la, pour la dessiner. Un seul trace
 * pour tous les modules, et la marge blanche de quatre modules que la norme demande autour.
 *
 * L'appareil photo du systeme le lit et ouvre le lien : l'application n'a pas de lecteur a elle.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { correction, generate } from 'lean-qr';

import { tokens } from '../../../shared/theme/Theme';

/** La zone de silence autour du code, en modules (ISO/IEC 18004). */
const MARGE = 4;

/** Le trace des modules sombres : un carre d'un module par case, sur la grille du code. */
function traceDe(valeur: string): { trace: string; cote: number } | null {
    try {
        // Le niveau M : un code lisible a distance de bras, assez court pour un lien de deux cents caracteres.
        const code = generate(valeur, { minCorrectionLevel: correction.M });
        let trace = '';
        for (let y = 0; y < code.size; y += 1) {
            for (let x = 0; x < code.size; x += 1) {
                if (code.get(x, y)) trace += `M${x + MARGE} ${y + MARGE}h1v1h-1z`;
            }
        }
        return { trace, cote: code.size + MARGE * 2 };
    } catch (erreur) {
        console.warn('[amis] code QR impossible', erreur);
        return null;
    }
}

export function CodeQr({ valeur, taille, accessibilityLabel }: { valeur: string; taille: number; accessibilityLabel: string }) {
    const dessin = useMemo(() => traceDe(valeur), [valeur]);
    if (dessin === null) return null;
    return (
        <View style={[styles.papier, { width: taille, height: taille }]} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
            <Svg width={taille} height={taille} viewBox={`0 0 ${dessin.cote} ${dessin.cote}`}>
                <Rect x={0} y={0} width={dessin.cote} height={dessin.cote} fill={tokens.codeQr.papier} />
                <Path d={dessin.trace} fill={tokens.codeQr.encre} />
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    papier: {
        borderRadius: tokens.radius.md,
        overflow: 'hidden',
        backgroundColor: tokens.codeQr.papier,
    },
});
