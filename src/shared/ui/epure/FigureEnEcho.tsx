/**
 * Fig. 01, le U en echo : la figure signature de l'Epure, dans l'application (jalon 7-J).
 *
 * Quarante copies du contour du U, aux nombres du kit (geometrie.ts). Elle ne vit que dans les
 * **moments** que l'Epure s'autorise dans l'application — l'accueil — et jamais sur un ecran de
 * travail ([identite.md](../../../../docs/identite.md#les-intensités)).
 *
 * **Son entree est le seul moment orchestre de l'accueil** : les copies paraissent du fond vers
 * l'avant, par groupes de cinq, en un peu plus d'une seconde, comme un trace qui se construit. Sous
 * « reduire les animations », la figure est la tout de suite, entiere. Le trait garde 1,2 point quelle
 * que soit la taille (`non-scaling-stroke`) : a l'echelle d'un telephone, un trait mis a l'echelle
 * tombait sous le pixel.
 */

import React, { useEffect, useMemo } from 'react';
import Svg, { G, Path } from 'react-native-svg';
import Reanimated, {
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedProps,
    useReducedMotion,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';

import type { AppThemeType } from '../../theme/Theme';
import { copiesDEcho, ECHO, TRACE_DU_U, type CopieDEcho } from './geometrie';

const GroupeAnime = Reanimated.createAnimatedComponent(G);

/** Les copies paraissent par groupes : quarante proprietes animees seraient de trop pour un vieil Android. */
const PAR_GROUPE = 5;
const DUREE_D_ENTREE = 1300;

function GroupeDeCopies({ copies, rang, groupes, apparition }: {
    copies: readonly CopieDEcho[];
    rang: number;
    groupes: number;
    apparition: SharedValue<number>;
}) {
    const proprietes = useAnimatedProps(() => ({
        opacity: interpolate(apparition.value, [rang / groupes, (rang + 2) / groupes], [0, 1], Extrapolation.CLAMP),
    }));
    return (
        <GroupeAnime animatedProps={proprietes}>
            {copies.map((copie) => (
                <Path
                    key={copie.rang}
                    d={TRACE_DU_U}
                    transform={`translate(${copie.x} ${copie.y})`}
                    fill="none"
                    stroke={copie.teinte}
                    strokeOpacity={copie.opacite}
                    strokeWidth={ECHO.trait}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
        </GroupeAnime>
    );
}

export function FigureEnEcho({ theme, largeur }: { theme: AppThemeType; largeur: number }) {
    const mouvementReduit = useReducedMotion();
    const apparition = useSharedValue(mouvementReduit ? 1 : 0);

    useEffect(() => {
        if (mouvementReduit) return;
        apparition.value = withTiming(1, { duration: DUREE_D_ENTREE, easing: Easing.out(Easing.cubic) });
    }, [apparition, mouvementReduit]);

    // Du fond vers l'avant, en groupes de cinq : le premier groupe dessine est celui du fond.
    const groupes = useMemo(() => {
        const copies = copiesDEcho(theme.logo.bleu, theme.logo.indigo);
        const paquets: CopieDEcho[][] = [];
        for (let i = 0; i < copies.length; i += PAR_GROUPE) paquets.push(copies.slice(i, i + PAR_GROUPE));
        return paquets;
    }, [theme.logo.bleu, theme.logo.indigo]);

    const hauteur = (largeur * ECHO.boite.hauteur) / ECHO.boite.largeur;
    return (
        <Svg width={largeur} height={hauteur} viewBox={`0 0 ${ECHO.boite.largeur} ${ECHO.boite.hauteur}`} accessible={false}>
            {groupes.map((copies, rang) => (
                <GroupeDeCopies key={rang} copies={copies} rang={rang} groupes={groupes.length} apparition={apparition} />
            ))}
        </Svg>
    );
}
