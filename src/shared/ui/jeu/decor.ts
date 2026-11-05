/**
 * Le decor du jeu, sans React (7-J, deuxieme passe) : la silhouette du campus qui defile au loin.
 *
 * Des batiments au trait de plan, toits plats, une antenne ici ou la : une periode de 360 points,
 * dessinee trois fois — de quoi couvrir le plus large des telephones pendant tout un glissement —
 * pour que le glissement d'une periode retombe exactement sur son depart (la meme regle que le fond
 * des onglets du 7-I). Le chemin est calcule ici, et teste ; `DecorDuJeu` le dessine.
 */

/** La largeur d'une periode du decor, en points. */
export const PERIODE_DU_DECOR = 360;
/** La hauteur de la bande du decor, au-dessus de l'horizon. */
export const HAUTEUR_DU_DECOR = 52;

/** [largeur, hauteur, antenne] : dix batiments, dont la somme des largeurs fait une periode. */
const BATIMENTS: readonly (readonly [number, number, boolean])[] = [
    [34, 26, false], [20, 40, true], [46, 20, false], [28, 33, false], [40, 24, false],
    [18, 46, true], [52, 28, false], [30, 21, false], [44, 35, false], [48, 18, false],
];

/** Le chemin SVG de `periodes` periodes de silhouette, ferme sur l'horizon (le bas de la bande). */
export function silhouetteDuCampus(periodes = 3): string {
    const base = HAUTEUR_DU_DECOR;
    const morceaux: string[] = [`M0 ${base}`];
    let x = 0;
    for (let periode = 0; periode < periodes; periode += 1) {
        for (const [largeur, hauteur, antenne] of BATIMENTS) {
            const toit = base - hauteur;
            morceaux.push(`L${x} ${toit}`);
            if (antenne) {
                const milieu = x + largeur / 2;
                morceaux.push(`L${milieu - 1} ${toit}`, `L${milieu - 1} ${toit - 6}`, `L${milieu + 1} ${toit - 6}`, `L${milieu + 1} ${toit}`);
            }
            morceaux.push(`L${x + largeur} ${toit}`);
            x += largeur;
        }
    }
    morceaux.push(`L${x} ${base}`, 'Z');
    return morceaux.join(' ');
}

/** Le decalage du decor pour une distance parcourue : il defile plus lentement que l'horizon. */
export function decalageDuDecor(distance: number, parallaxe: number): number {
    'worklet';
    return -((distance * parallaxe) % PERIODE_DU_DECOR);
}

/** La somme des largeurs d'une periode : un test le verrouille, sans quoi la boucle saute. */
export function largeurDUnePeriode(): number {
    return BATIMENTS.reduce((somme, [largeur]) => somme + largeur, 0);
}
