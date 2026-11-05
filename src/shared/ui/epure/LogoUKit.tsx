/**
 * Le logo UKit, vectoriel, dans son degrade (jalon 7-J).
 *
 * Le trace exact de [logo-ukit.svg](../../../../docs/identite/logo-ukit.svg) — redessine a 99,5 % de
 * recouvrement avec l'original — a la place du PNG de 850 x 343 que l'accueil et A propos posaient :
 * net a toutes les tailles, et du meme degrade que la figure en echo.
 */

import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { AppThemeType } from '../../theme/Theme';
import { BOITE_DU_LOGO, DEGRADE_DU_LOGO, TRACE_DU_LOGO } from './geometrie';

export function LogoUKit({ theme, largeur }: { theme: AppThemeType; largeur: number }) {
    const hauteur = (largeur * BOITE_DU_LOGO.hauteur) / BOITE_DU_LOGO.largeur;
    const { debut, fin, arrets } = DEGRADE_DU_LOGO;
    return (
        <Svg width={largeur} height={hauteur} viewBox={`0 0 ${BOITE_DU_LOGO.largeur} ${BOITE_DU_LOGO.hauteur}`} accessibilityLabel="UKit">
            <Defs>
                <LinearGradient id="degradeDuLogo" gradientUnits="userSpaceOnUse" x1={debut.x} y1={debut.y} x2={fin.x} y2={fin.y}>
                    <Stop offset={arrets.bleu} stopColor={theme.logo.bleu} />
                    <Stop offset={arrets.indigo} stopColor={theme.logo.indigo} />
                </LinearGradient>
            </Defs>
            <Path d={TRACE_DU_LOGO} fill="url(#degradeDuLogo)" transform="translate(0.5 0.5)" />
        </Svg>
    );
}
