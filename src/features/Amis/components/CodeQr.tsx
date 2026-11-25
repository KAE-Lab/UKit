/**
 * Le code QR d'un lien d'ami, genere sur l'appareil (docs/phase-8/8-amis.md) : `lean-qr`, sans
 * dependance ni natif, pour la matrice ; `react-native-svg`, deja la, pour la dessiner. Un seul trace
 * pour tous les modules, et la marge blanche de quatre modules que la norme demande autour.
 *
 * L'appareil photo du systeme le lit et ouvre le lien : l'application n'a pas de lecteur a elle. Le
 * trace se calcule dans `services/codeQr.ts`.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { tokens } from '../../../shared/theme/Theme';
import { traceDuCodeQr } from '../services/codeQr';

function dessinDe(valeur: string): ReturnType<typeof traceDuCodeQr> | null {
    try {
        return traceDuCodeQr(valeur);
    } catch (erreur) {
        console.warn('[amis] code QR impossible', erreur);
        return null;
    }
}

export function CodeQr({ valeur, taille, accessibilityLabel }: { valeur: string; taille: number; accessibilityLabel: string }) {
    const dessin = useMemo(() => dessinDe(valeur), [valeur]);
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
