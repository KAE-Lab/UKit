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
import { BOITE_DU_LOGO, BOITE_DU_U, DEGRADE_DU_LOGO, TRACE_DU_LOGO, TRACE_DU_U } from './geometrie';

/**
 * `glyphe="u"` dessine le U seul, le premier glyphe du logo, a sa place dans le degrade : l'accueil
 * l'emploie a la place de Fig. 01 depuis la deuxieme passe de 7-J.
 */
export function LogoUKit({ theme, largeur, glyphe = 'logo' }: { theme: AppThemeType; largeur: number; glyphe?: 'logo' | 'u' }) {
    const boite = glyphe === 'u' ? BOITE_DU_U : { x: 0, y: 0, ...BOITE_DU_LOGO };
    const hauteur = (largeur * boite.hauteur) / boite.largeur;
    const { debut, fin, arrets } = DEGRADE_DU_LOGO;
    return (
        <Svg width={largeur} height={hauteur} viewBox={`${boite.x} ${boite.y} ${boite.largeur} ${boite.hauteur}`} accessibilityLabel="UKit">
            <Defs>
                <LinearGradient id="degradeDuLogo" gradientUnits="userSpaceOnUse" x1={debut.x} y1={debut.y} x2={fin.x} y2={fin.y}>
                    <Stop offset={arrets.bleu} stopColor={theme.logo.bleu} />
                    <Stop offset={arrets.indigo} stopColor={theme.logo.indigo} />
                </LinearGradient>
            </Defs>
            <Path d={glyphe === 'u' ? TRACE_DU_U : TRACE_DU_LOGO} fill="url(#degradeDuLogo)" transform="translate(0.5 0.5)" />
        </Svg>
    );
}
