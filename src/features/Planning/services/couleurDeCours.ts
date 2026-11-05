/**
 * La couleur d'une ligne de cours, resolue depuis la cle que l'evenement porte.
 *
 * `PlanningEvent.color` a toujours ete une **cle** de `theme.courses` — une couleur brute Celcat ou
 * une teinte `palette-n` derivee (IcsMapping). Les evenements du telephone (jalon 6.1.x-D) apportent
 * une troisieme forme : l'hexadecimale du calendrier lui-meme, que l'utilisateur reconnait — c'est le
 * sens de son choix. Une cle inconnue retombait sur `default` et effacait cette couleur.
 *
 * Pur, sans le theme : il recoit la palette, ce qui le rend jouable sous vitest.
 */

const HEX_COURT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{6})$/i;

/**
 * Une hexadecimale `#rrggbb` en minuscules, ou `null`.
 *
 * Ce qui varie d'une plateforme a l'autre n'est pas l'alpha — Android formate deja `#%06X` — mais la
 * casse, la forme courte, et l'absence : iOS rend `nil` pour un calendrier sans couleur. Six chiffres
 * exactement, parce que `CourseRow` compose ses fonds en suffixant une opacite (`${couleur}18`).
 */
export function normaliserHex(couleur: unknown): string | null {
    if (typeof couleur !== 'string') return null;
    const brut = couleur.trim();
    const court = HEX_COURT.exec(brut);
    if (court !== null) return ('#' + court[1] + court[1] + court[2] + court[2] + court[3] + court[3]).toLowerCase();
    const long = HEX_LONG.exec(brut);
    return long !== null ? '#' + long[1].toLowerCase() : null;
}

/** La cle de palette d'abord, l'hexadecimale ensuite, `default` enfin. */
export function couleurDeCours(palette: Readonly<Record<string, string>>, couleur: string | undefined): string {
    if (couleur !== undefined && palette[couleur] !== undefined) return palette[couleur];
    return normaliserHex(couleur) ?? palette.default;
}

/** La luminance relative WCAG d'une hexadecimale `#rrggbb`. */
function luminance(hex: string): number {
    const canal = (debut: number) => {
        const c = parseInt(hex.slice(debut, debut + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

/** Le contraste WCAG entre deux hexadecimales `#rrggbb`. */
export function contraste(a: string, b: string): number {
    const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (clair + 0.05) / (sombre + 0.05);
}

function melanger(hex: string, vers: number, part: number): string {
    const canal = (debut: number) => {
        const c = parseInt(hex.slice(debut, debut + 2), 16);
        return Math.round(c + (vers - c) * part).toString(16).padStart(2, '0');
    };
    return `#${canal(1)}${canal(3)}${canal(5)}`;
}

/**
 * La couleur d'un cours quand elle **ecrit** : un libelle, une icone sur la carte (7-J).
 *
 * La teinte d'un cours sert d'abord de fond et de rail ; ecrite telle quelle, le jaune ou le cyan
 * des palettes ne se lisaient plus sur une carte blanche (le badge « Cours » en `#5AC8FA`, 1,9:1).
 * L'encre garde la teinte et s'en eloigne vers le noir sur un fond clair, vers le blanc sur un fond
 * sombre, par pas de cinq pour cent, jusqu'au contraste demande. Une teinte deja lisible reste
 * intacte.
 */
export function encreDeCours(couleur: string, fond: string, seuil = 4.5): string {
    const teinte = normaliserHex(couleur);
    const support = normaliserHex(fond);
    if (teinte === null || support === null) return couleur;
    const vers = luminance(support) > 0.5 ? 0 : 255;
    for (let pas = 0; pas <= 20; pas += 1) {
        const essai = melanger(teinte, vers, pas / 20);
        if (contraste(essai, support) >= seuil) return essai;
    }
    return melanger(teinte, vers, 1);
}
