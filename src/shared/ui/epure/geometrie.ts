/**
 * La geometrie de l'Epure dans l'application (jalon 7-J) : le logo et la figure en echo.
 *
 * Les traces viennent du logo redessine en geometrie exacte ([identite.md](../../../../docs/identite.md),
 * [logo-ukit.svg](../../../../docs/identite/logo-ukit.svg)) et la figure de **Fig. 01**, le U en echo
 * ([fig01-u.svg](../../../../tools/epure/fig01-u.svg)) : quarante copies du contour du U, decalees
 * chacune de (5 ; 3,2), au trait de 1,2, l'opacite descendant de 1 a 0,1 vers le fond et la teinte
 * glissant du bleu a l'indigo. Rien n'est invente : ce sont les nombres du kit.
 *
 * Pur, sans React : les nombres se testent, et le dessin vit dans `LogoUKit` et `FigureEnEcho`.
 */

/** Le dessin du logo, dans sa boite de 850 x 343 (unites du dessin). */
export const BOITE_DU_LOGO = { largeur: 850, hauteur: 343 } as const;

/** Le trace complet du logo : U, K, i et son point, t. */
export const TRACE_DU_LOGO =
    'M78.192 0.180L91.160 0.180A1.200 1.200 0 0 1 92.360 1.380L92.360 224.900A69.470 69.470 0 0 0 161.830 294.370A69.470 69.470 0 0 0 231.300 224.900L231.300 5.780A5.600 5.600 0 0 1 236.900 0.180L273.050 0.180A5.600 5.600 0 0 1 278.650 5.780L278.650 224.800A117.090 117.090 0 0 1 161.560 341.890A117.090 117.090 0 0 1 44.470 224.800L44.470 57.842A2.300 2.300 0 0 0 42.942 55.676L1.868 41.050A2.300 2.300 0 0 1 0.340 38.883L0.340 27.854A1.500 1.500 0 0 1 1.345 26.438L74.894 0.740A10.000 10.000 0 0 1 78.192 0.180ZM340.370 5.780A5.600 5.600 0 0 1 345.970 0.180L382.200 0.180A5.600 5.600 0 0 1 387.800 5.780L387.800 127.330A4.000 4.000 0 0 0 395.250 129.353L468.224 4.924A9.600 9.600 0 0 1 476.505 0.180L515.647 0.180A3.800 3.800 0 0 1 518.941 5.874L432.520 156.166A15.200 15.200 0 0 0 432.525 171.329L529.000 338.832A2.100 2.100 0 0 1 527.180 341.980L475.768 341.980A7.800 7.800 0 0 1 468.865 337.811L394.398 196.212A3.500 3.500 0 0 0 387.800 197.841L387.800 336.380A5.600 5.600 0 0 1 382.200 341.980L345.970 341.980A5.600 5.600 0 0 1 340.370 336.380ZM568.840 88.900A3.300 3.300 0 0 1 572.140 85.600L608.100 85.600A3.300 3.300 0 0 1 611.400 88.900L611.400 338.790A3.300 3.300 0 0 1 608.100 342.090L572.140 342.090A3.300 3.300 0 0 1 568.840 338.790ZM564.660 25.640A25.510 25.510 0 1 1 615.680 25.640A25.510 25.510 0 1 1 564.660 25.640ZM689.240 17.320L725.280 17.320A3.300 3.300 0 0 1 728.580 20.620L728.580 79.600A6.000 6.000 0 0 0 734.580 85.600L801.970 85.600A3.700 3.700 0 0 1 805.670 89.300L805.670 115.900A3.700 3.700 0 0 1 801.970 119.600L734.580 119.600A6.000 6.000 0 0 0 728.580 125.600L728.580 239.934C728.580 276.715 757.022 300.709 787.979 300.709C805.415 300.709 814.615 292.924 827.423 287.454A2.000 2.000 0 0 1 829.852 288.210L848.940 317.954A2.000 2.000 0 0 1 848.246 320.772C829.770 331.336 810.486 341.939 780.359 341.939C730.978 341.939 685.940 302.932 685.940 246.287L685.940 125.600A6.000 6.000 0 0 0 679.940 119.600L655.340 119.600A3.700 3.700 0 0 1 651.640 115.900L651.640 89.300A3.700 3.700 0 0 1 655.340 85.600L679.940 85.600A6.000 6.000 0 0 0 685.940 79.600L685.940 20.620A3.300 3.300 0 0 1 689.240 17.320Z';

/** Le contour du U seul, premier sous-trace du logo : la matiere de Fig. 01. */
export const TRACE_DU_U =
    'M78.192 0.180L91.160 0.180A1.200 1.200 0 0 1 92.360 1.380L92.360 224.900A69.470 69.470 0 0 0 161.830 294.370A69.470 69.470 0 0 0 231.300 224.900L231.300 5.780A5.600 5.600 0 0 1 236.900 0.180L273.050 0.180A5.600 5.600 0 0 1 278.650 5.780L278.650 224.800A117.090 117.090 0 0 1 161.560 341.890A117.090 117.090 0 0 1 44.470 224.800L44.470 57.842A2.300 2.300 0 0 0 42.942 55.676L1.868 41.050A2.300 2.300 0 0 1 0.340 38.883L0.340 27.854A1.500 1.500 0 0 1 1.345 26.438L74.894 0.740A10.000 10.000 0 0 1 78.192 0.180Z';

/**
 * Le degrade du logo : un axe a 21 degres, le bleu pur jusqu'a 32 % de sa longueur, l'indigo pur a
 * partir de 78 %. Les deux couleurs sont celles du theme (`theme.logo`).
 */
export const DEGRADE_DU_LOGO = {
    debut: { x: 10.26, y: 3.95 },
    fin: { x: 845.43, y: 325.71 },
    arrets: { bleu: 0.32, indigo: 0.78 },
} as const;

/** L'echo de Fig. 01, aux nombres du kit. */
export const ECHO = {
    copies: 40,
    decalage: { x: 5, y: 3.2 },
    trait: 1.2,
    opacite: { avant: 1, fond: 0.1 },
    /** La boite de la figure entiere : le U et ses trente-neuf decalages, avec la marge du kit. */
    boite: { largeur: 480, hauteur: 473.8 },
    /** La copie de devant, decalee de la marge du kit. */
    origine: { x: 1.5, y: 1.5 },
} as const;

function canal(hex: string, debut: number): number {
    return parseInt(hex.slice(debut, debut + 2), 16);
}

function melange(a: string, b: string, t: number): string {
    const c = (debut: number) => Math.round(canal(a, debut) + (canal(b, debut) - canal(a, debut)) * t)
        .toString(16).padStart(2, '0').toUpperCase();
    return `#${c(1)}${c(3)}${c(5)}`;
}

export interface CopieDEcho {
    /** Le rang, 0 devant, 39 au fond. */
    readonly rang: number;
    readonly x: number;
    readonly y: number;
    readonly opacite: number;
    readonly teinte: string;
}

/**
 * Les copies de l'echo, **du fond vers l'avant** — l'ordre du dessin : la copie de devant passe
 * par-dessus les autres. L'opacite et la teinte varient lineairement d'une copie a l'autre, de
 * `avant` (le bleu du logo) a `fond` (son indigo).
 */
export function copiesDEcho(avant: string, fond: string): CopieDEcho[] {
    const n = ECHO.copies;
    return Array.from({ length: n }, (_, i) => {
        const rang = n - 1 - i;
        const t = rang / (n - 1);
        return {
            rang,
            x: ECHO.origine.x + ECHO.decalage.x * rang,
            y: ECHO.origine.y + ECHO.decalage.y * rang,
            opacite: ECHO.opacite.avant + (ECHO.opacite.fond - ECHO.opacite.avant) * t,
            teinte: melange(avant, fond, t),
        };
    });
}
