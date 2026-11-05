/**
 * La geometrie et les couleurs du fond d'un onglet (jalon 7-I) : ce que `FondDOnglet` dessine, sans
 * React, pour se tester hors appareil.
 *
 * Le fond est la variante K1 du labo, choisie le 2026-11-04 : un voile oblique de deux teintes
 * proches de la section, separees par des respirations ou la page reparait, qui glisse lentement
 * sur le haut de l'ecran et se fond dans la page avant le contenu. La 3D (tours 3 et 4) a ete
 * abandonnee la meme semaine : trop lourde pour ce qu'elle apportait.
 */

/** Les onglets qui portent un fond ; Planning attend la reprise de son en-tete (7-J). */
export type OngletAFond = 'planning' | 'campus' | 'scolarite' | 'reglages';

export const GEOMETRIE_DU_FOND = {
    /** La hauteur du fond, en points, depuis le haut de l'ecran. */
    hauteur: 470,
    /** Le voile qui ramene a la page : transparent a `debut`, plein a `fin` (points). */
    voile: { debut: 150, fin: 470 },
    /**
     * La periode du motif, le long de son axe : une teinte, la page, l'autre teinte, la page. Le
     * motif glisse d'une periode par cycle, si bien que la fin d'un cycle retombe exactement sur
     * son debut ; un glissement d'une autre longueur sautait a chaque tour (labo, tour 5).
     */
    periode: 780,
    /** Le nombre de periodes dessinees : de quoi couvrir l'ecran incline, pendant tout le glissement. */
    periodes: 4,
    /** L'inclinaison du motif, en degres : celle du labo (115 degres CSS). */
    inclinaison: 25,
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
 * Le motif horizontal (avant inclinaison) : `periodes` fois la suite teinte A, page, teinte B,
 * page, et la teinte A pour finir. La page est opaque : le fond se pose sur elle, et un transparent
 * s'interpolerait par le noir sur iOS.
 */
export function motifDuFond(teinteA: string, teinteB: string, fond: string): Degrade {
    const { periodes } = GEOMETRIE_DU_FOND;
    const colors: string[] = [];
    const locations: number[] = [];
    for (let p = 0; p < periodes; p += 1) {
        [teinteA, fond, teinteB, fond].forEach((couleur, i) => {
            colors.push(couleur);
            locations.push((p + i / 4) / periodes);
        });
    }
    colors.push(teinteA);
    locations.push(1);
    return { colors, locations } as Degrade;
}
