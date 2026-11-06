/**
 * Le jeu Encre, sans dessin : ses sprites en pixels, et ce qui les trace (7-J, troisieme passe).
 *
 * **Un genre, pas une copie.** Le jeu du parcours froid est un coureur, le genre que le jeu du
 * dinosaure de Chrome a rendu familier ; ses personnages, ses obstacles et son decor sont les notres
 * (review du 2026-11-06 : « une version amelioree, pas une version eco+ »). Un renard a l'echarpe
 * bleue, la seule touche d'accent, court devant des montagnes, des collines et des sapins ; il saute
 * des cailloux, des rochers et des souches, et passe sous ou par-dessus des chouettes.
 *
 * **Deux encres, du papier, un accent** : `#` l'encre, `+` l'encre grisee, `o` le papier (un oeil, un
 * reflet, le bout de la queue), `s` l'accent. En sombre, les encres s'inversent (blanc sur nuit) : le theme les fournit.
 * Les grilles sont peintes par lignes et rectangles hors de l'application, puis copiees ici.
 *
 * Un pixel de jeu vaut `PIXEL` points : les sprites restent nets a toutes les tailles de plateau.
 */

export type Grille = readonly string[];

/** La taille d'un pixel de jeu, en points. */
export const PIXEL = 3;

/** Les symboles d'une grille, dans l'ordre du trace : l'encre grisee sous l'encre, l'accent dessus. */
export const SYMBOLES = ['+', '#', 'o', 's'] as const;
export type Symbole = (typeof SYMBOLES)[number];

/**
 * Les pixels d'un symbole, fusionnes ligne par ligne en rectangles, en chemin SVG (unite : le pixel
 * de jeu). Un rectangle par suite de pixels : une ligne de dix pixels ne coute qu'une commande.
 */
export function traceDuSymbole(grille: Grille, symbole: Symbole): string {
    let trace = '';
    grille.forEach((ligne, y) => {
        let x = 0;
        while (x < ligne.length) {
            if (ligne[x] !== symbole) {
                x += 1;
                continue;
            }
            let fin = x;
            while (fin < ligne.length && ligne[fin] === symbole) fin += 1;
            trace += `M${x} ${y}h${fin - x}v1h${x - fin}z`;
            x = fin;
        }
    });
    return trace;
}

export function tailleDe(grille: Grille): { largeur: number; hauteur: number } {
    return { largeur: grille[0]?.length ?? 0, hauteur: grille.length };
}

/**
 * Le renard, 20 x 13 pixels (il en faisait 26 x 16, la review du 2026-11-06 le trouvait gros). La
 * course est un galop en quatre temps, suspension, reception, rassemble, poussee, et le corps descend
 * d'une rangee aux deux temps du milieu : c'est ce rebond qui fait courir, plus que les pattes.
 */
export const COURSE_1: Grille = [
    '............#..#....',
    '............#+.#+...',
    '###........######...',
    '#oo#......####o##...',
    '#ooo#.s...#########.',
    '#####..ss..##++++#..',
    '.#######..sssss.....',
    '..###########+......',
    '....#++++++##.......',
    '...##.......##......',
    '..##.........##.....',
    '.##...........##....',
    '....................',
];

export const COURSE_2: Grille = [
    '....................',
    '............#..#....',
    '............#+.#+...',
    '###........######...',
    '#oo#......####o##...',
    '#ooo#.....#########.',
    '#####...s..##++++#..',
    '.#######s.sssss.....',
    '..###########+......',
    '....#++++++##.......',
    '......##....##......',
    '.......##...##......',
    '........#...##......',
];

export const COURSE_3: Grille = [
    '....................',
    '............#..#....',
    '............#+.#+...',
    '###........######...',
    '#oo#......####o##...',
    '#ooo#.s...#########.',
    '#####..ss..##++++#..',
    '.#######..sssss.....',
    '..###########+......',
    '....#++++++##.......',
    '......##..##........',
    '.......####.........',
    '.......#..#.........',
];

export const COURSE_4: Grille = [
    '............#..#....',
    '............#+.#+...',
    '###........######...',
    '#oo#......####o##...',
    '#ooo#.....#########.',
    '#####...s..##++++#..',
    '.#######s.sssss.....',
    '..###########+......',
    '....#++++++##.......',
    '....##......##......',
    '...##........###....',
    '...##...............',
    '..##................',
];

export const SAUT: Grille = [
    '............#..#....',
    '............#+.#+...',
    '###........######...',
    '#oo#......####o##...',
    '#ooo#.s...#########.',
    '#####..ss..##++++#..',
    '.#######..sssss.....',
    '..###########+......',
    '....#++++++##.......',
    '....##.....###......',
    '...##........#......',
    '..##................',
    '....................',
];

export const ASSIS: Grille = [
    '............#..#....',
    '............#+.#+...',
    '...........######...',
    '..........####o##...',
    '..........#########.',
    '...........##++++#..',
    '..........sssss.....',
    '.........####+......',
    '........#####+......',
    '..###..######+......',
    '.#ooo#.#######......',
    '.#oo#########.......',
    '..#########.##.##...',
];

export const ASSIS_CLIGNE: Grille = [
    '............#..#....',
    '............#+.#+...',
    '...........######...',
    '..........####+##...',
    '..........#########.',
    '...........##++++#..',
    '..........sssss.....',
    '.........####+......',
    '........#####+......',
    '..###..######+......',
    '.#ooo#.#######......',
    '.#oo#########.......',
    '..#########.##.##...',
];

export const CHUTE: Grille = [
    '............#..#....',
    '............#+.#+...',
    '###........##o#o#...',
    '#oo#......####o##...',
    '#ooo#.....###o#o###.',
    '#####...s..##++++#..',
    '.#######s.sssss.....',
    '..###########+......',
    '....#++++++##.......',
    '....##......##......',
    '....##......##......',
    '...##........##.....',
    '...##........##.....',
];

/** Le renard baisse, oreilles couchees, le ventre au ras du sol : deux temps de course. */
export const BAISSE_1: Grille = [
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '..............##+...',
    '###.........######..',
    '#oo#.......####o##..',
    '#ooo#.s....#########',
    '#####..ss.sss#++++#.',
    '.############+......',
    '..#+++++++##........',
    '..##......##........',
];

export const BAISSE_2: Grille = [
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '..............##+...',
    '###.........######..',
    '#oo#.......####o##..',
    '#ooo#......#########',
    '#####.ss..sss#++++#.',
    '.############+......',
    '..#+++++++##........',
    '...##....##.........',
];

export const CHOUETTE_HAUT: Grille = [
    '...............',
    '######...######',
    '.#############.',
    '...###o#o###...',
    '.....##+##.....',
    '.....#####.....',
    '.....#+++#.....',
    '.....#####.....',
    '......#.#......',
];

export const CHOUETTE_BAS: Grille = [
    '...............',
    '.....#...#.....',
    '.....#####.....',
    '.....#o#o#.....',
    '..#####+#####..',
    '###############',
    '###..#+++#..###',
    '.....#####.....',
    '......#.#......',
];

export const SOUCHE: Grille = [
    '...#++++++++#...',
    '...#++####++#...',
    '...##########...',
    '...##+#######...',
    '...######+###...',
    '...###+######...',
    '...#+#####+##...',
    '...##########...',
    '.##############.',
    '###..##..##..###',
];

export const ROCHER: Grille = [
    '......####......',
    '....##+++###....',
    '...##+++#####...',
    '..##++########..',
    '.##############.',
    '###########+####',
    '############++##',
    '################',
];

export const CAILLOU: Grille = [
    '....###....',
    '..##++###..',
    '.##+######.',
    '###########',
];

export const SAPIN: Grille = [
    '.....#.....',
    '....###....',
    '...#####...',
    '....###....',
    '..#######..',
    '.#########.',
    '...#####...',
    '.#########.',
    '###########',
    '.....#.....',
];

export const NUAGE: Grille = [
    '......######.........',
    '....##......##.......',
    '..##..........###....',
    '.#...............##..',
    '#..................#.',
    '.###################.',
];

export const TOUFFE: Grille = [
    '.#..#.',
    '#.##.#',
];

/**
 * La tuile du sol, repetee sous la course : deux touffes posees sur la ligne, des graviers dessous.
 * La ligne est a la troisieme rangee (`LIGNE_DU_SOL`) : c'est elle que le renard foule.
 */
export const LIGNE_DU_SOL = 2;
const GRAVIERS: Grille = [
    '.+.....++.........+......+......',
    '.........+...........++.......+.',
    '...++..............+............',
    '..............+.................',
];
function posees(largeur: number, touffes: readonly number[]): string[] {
    return TOUFFE.map((ligne) => {
        const rang = Array.from({ length: largeur }, () => '.');
        for (const x of touffes) [...ligne].forEach((c, i) => { if (c !== '.') rang[x + i] = '+'; });
        return rang.join('');
    });
}
export const TUILE_DU_SOL: Grille = [...posees(32, [3, 21]), '#'.repeat(32), ...GRAVIERS];

/** La lune du theme sombre, un croissant ; le soleil du clair, cerne, ses rayons en pointilles. */
export const LUNE: Grille = [
    '..####.',
    '.###...',
    '###....',
    '###....',
    '###....',
    '.###...',
    '..####.',
];
export const SOLEIL: Grille = [
    '....+....',
    '.+.....+.',
    '...###...',
    '..#ooo#..',
    '+.#ooo#.+',
    '..#ooo#..',
    '...###...',
    '.+.....+.',
    '....+....',
];

/** La periode du profil des montagnes, en pixels de jeu, et sa hauteur maximale. */
export const MONTAGNES = { periode: 160, hauteur: 28 } as const;
/** Les cretes : abscisse et hauteur, en pixels ; la premiere et la derniere se rejoignent. */
const CRETES: readonly (readonly [number, number])[] = [[0, 6], [18, 20], [34, 12], [58, 26], [84, 10], [104, 22], [128, 8], [146, 16], [160, 6]];

/** La periode du profil des collines, en pixels de jeu, et sa hauteur maximale. */
export const COLLINES = { periode: 120, hauteur: 13 } as const;
/** Les collines : centre, demi-largeur et hauteur, en pixels. */
const BOSSES: readonly (readonly [number, number, number])[] = [[20, 26, 9], [70, 34, 13], [112, 22, 8]];

/** Un profil en escalier, colonne par colonne : le bord d'un decor de pixel art, pas une courbe. */
function escalier(periode: number, hauteur: number, hauteurEn: (x: number) => number): string {
    let trace = `M0 ${hauteur}`;
    for (let x = 0; x < periode; x += 1) {
        const y = hauteur - Math.max(0, Math.min(hauteur, Math.round(hauteurEn(x))));
        trace += `L${x} ${y}L${x + 1} ${y}`;
    }
    return `${trace}L${periode} ${hauteur}Z`;
}

/** Les montagnes lointaines : des cretes reliees en droite ligne, posees en escalier. */
export function profilDeMontagnes(): string {
    return escalier(MONTAGNES.periode, MONTAGNES.hauteur, (x) => {
        for (let i = 0; i < CRETES.length - 1; i += 1) {
            const [x0, h0] = CRETES[i];
            const [x1, h1] = CRETES[i + 1];
            if (x >= x0 && x <= x1) return h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
        }
        return 0;
    });
}

/** Les collines du milieu : des bosses arrondies, la periode refermee sur elle-meme. */
export function profilDeCollines(): string {
    return escalier(COLLINES.periode, COLLINES.hauteur, (x) => {
        let haut = 0;
        for (const [centre, demi, h] of BOSSES) {
            for (const decale of [centre - COLLINES.periode, centre, centre + COLLINES.periode]) {
                const t = (x - decale) / demi;
                if (Math.abs(t) < 1) haut = Math.max(haut, h * Math.sqrt(1 - t * t));
            }
        }
        return haut;
    });
}
