/**
 * La fin du parcours d'accueil : un cercle et une coche qui se tracent (jalon 7-J).
 *
 * Le parcours s'ouvre sur Fig. 01, les contours du U dans le degrade du logo ; il se ferme sur un
 * trait du meme degrade, qui se dessine comme a la plume — le cercle d'abord, la coche ensuite. C'etait
 * l'icone de validation du kit d'icones, celle de n'importe quelle application. Le trait du cercle
 * reste fin, celui de la figure ; la coche est plus appuyee, parce que c'est elle qui dit « c'est
 * fait ». Sous « reduire les animations », le trait est la tout de suite, entier.
 */

import React, { useEffect } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Reanimated, {
    Easing,
    useAnimatedProps,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

import type { AppThemeType } from '../../../shared/theme/Theme';

const CercleAnime = Reanimated.createAnimatedComponent(Circle);
const TraceAnime = Reanimated.createAnimatedComponent(Path);

const BOITE = 96;
const RAYON = 44;
const CIRCONFERENCE = 2 * Math.PI * RAYON;
const COCHE = 'M30 49 L43 62 L67 36';
/** La longueur de la coche : ses deux segments, 13·√2 et √(24² + 26²). */
const LONGUEUR_DE_LA_COCHE = 13 * Math.SQRT2 + Math.hypot(24, 26);
const DUREE_DU_CERCLE = 520;
const DUREE_DE_LA_COCHE = 320;
/** La coche part un peu avant que le cercle ne se ferme : un seul geste, pas deux. */
const CHEVAUCHEMENT = 120;

export function TraitDeValidation({ theme, taille = BOITE }: { theme: AppThemeType; taille?: number }) {
    const mouvementReduit = useReducedMotion();
    const cercle = useSharedValue(mouvementReduit ? 1 : 0);
    const coche = useSharedValue(mouvementReduit ? 1 : 0);

    useEffect(() => {
        if (mouvementReduit) return;
        const courbe = Easing.out(Easing.cubic);
        cercle.value = withTiming(1, { duration: DUREE_DU_CERCLE, easing: courbe });
        coche.value = withDelay(DUREE_DU_CERCLE - CHEVAUCHEMENT, withTiming(1, { duration: DUREE_DE_LA_COCHE, easing: courbe }));
    }, [cercle, coche, mouvementReduit]);

    const traceDuCercle = useAnimatedProps(() => ({ strokeDashoffset: CIRCONFERENCE * (1 - cercle.value) }));
    const traceDeLaCoche = useAnimatedProps(() => ({ strokeDashoffset: LONGUEUR_DE_LA_COCHE * (1 - coche.value) }));

    return (
        <Svg width={taille} height={taille} viewBox={`0 0 ${BOITE} ${BOITE}`} accessible={false}>
            <Defs>
                <LinearGradient id="degradeDeValidation" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={theme.logo.bleu} />
                    <Stop offset="1" stopColor={theme.logo.indigo} />
                </LinearGradient>
            </Defs>
            {/* Le cercle part du haut, dans le sens des aiguilles d'une montre. */}
            <CercleAnime
                cx={BOITE / 2}
                cy={BOITE / 2}
                r={RAYON}
                fill="none"
                stroke="url(#degradeDeValidation)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray={[CIRCONFERENCE, CIRCONFERENCE]}
                transform={`rotate(-90 ${BOITE / 2} ${BOITE / 2})`}
                animatedProps={traceDuCercle}
            />
            <TraceAnime
                d={COCHE}
                fill="none"
                stroke="url(#degradeDeValidation)"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={[LONGUEUR_DE_LA_COCHE, LONGUEUR_DE_LA_COCHE]}
                animatedProps={traceDeLaCoche}
            />
        </Svg>
    );
}
