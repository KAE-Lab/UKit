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
