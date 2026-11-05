/**
 * La geometrie et les couleurs du fond d'un onglet (jalon 7-I, repris en 7-J) : ce que `FondDOnglet`
 * et le fondu du bord dessinent, sans React, pour se tester hors appareil.
 *
 * Le fond etait la variante K1 du labo, choisie le 2026-11-04 : un motif oblique qui glissait
 * lentement. La deuxieme passe de 7-J l'a fixe et confine a l'en-tete (`FondDOnglet`) ; restent ici
 * le voile qui le ramene a la page, et le fondu du contenu qui passe dessous.
 */

/** Les onglets qui portent un fond ; Planning attend la reprise de son en-tete (7-J). */
export type OngletAFond = 'planning' | 'campus' | 'scolarite' | 'reglages';

export const GEOMETRIE_DU_FOND = {
    /** La hauteur du fond, en points, depuis le haut de l'ecran. */
    hauteur: 470,
    /** Le voile qui ramene a la page : transparent a `debut`, plein a `fin` (points). */
    voile: { debut: 150, fin: 470 },
} as const;

/**
 * Les alphas du voile adouci, du transparent au plein : seize arrets, pour qu'aucune bande ne se
 * lise la ou il s'arrete. La courbe de Revolut (WallpaperAssetOverlayDrawable), relevee au labo.
 */
const ALPHAS_DU_VOILE = [
    0, 0.074, 0.154, 0.238, 0.326, 0.415, 0.503, 0.589,
    0.672, 0.749, 0.819, 0.879, 0.93, 0.968, 0.992, 1,
];

export interface Degrade {
    colors: [string, string, ...string[]];
    locations: [number, number, ...number[]];
}

function avecAlpha(couleur: string, alpha: number): string {
    const octet = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    return `${couleur.slice(0, 7)}${octet}`;
}

export interface HauteurDuFond {
    readonly hauteur: number;
    readonly voile: { readonly debut: number; readonly fin: number };
}

/**
 * La geometrie d'un fond ramene a une hauteur donnee (7-J) : celle de l'en-tete collant du Planning,
 * plus court que les 470 points d'un onglet qui defile. Le voile garde ses proportions et se ferme
 * exactement au bas du fond, pour que la page reprenne sans arete sous l'en-tete.
 */
export function fondDeHauteur(hauteur: number): HauteurDuFond {
    const { voile } = GEOMETRIE_DU_FOND;
    return { hauteur, voile: { debut: hauteur * (voile.debut / GEOMETRIE_DU_FOND.hauteur), fin: hauteur } };
}

/**
 * Le voile vertical qui ramene le fond a la page : `fond` transparent jusqu'a `voile.debut`, plein
 * a partir de `voile.fin`, sur la hauteur du fond.
 */
export function voileDuFond(fond: string, geometrie: HauteurDuFond = GEOMETRIE_DU_FOND): Degrade {
    const { hauteur, voile } = geometrie;
    const colors = ALPHAS_DU_VOILE.map((a) => avecAlpha(fond, a));
    const locations = ALPHAS_DU_VOILE.map((_, i) => (voile.debut + ((voile.fin - voile.debut) * i) / 15) / hauteur);
    return { colors, locations } as Degrade;
}

/**
 * Le fondu du bord haut d'une zone qui defile sous un en-tete fixe (7-J, deuxieme passe) : `fond`
 * plein en haut, transparent en bas, sur la courbe adoucie du voile. Il part d'une couleur unie, celle
 * de la page, sur laquelle l'en-tete se ferme deja : le raccord est exact, sans bande.
 */
export function fonduDuBord(fond: string): Degrade {
    const alphas = [...ALPHAS_DU_VOILE].reverse();
    return {
        colors: alphas.map((a) => avecAlpha(fond, a)),
        locations: alphas.map((_, i) => i / (alphas.length - 1)),
    } as Degrade;
}
