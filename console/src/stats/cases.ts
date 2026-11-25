/**
 * Les petites cases (docs/mesure.md) : la console n'affiche jamais un compte sous cinq. Un campus a
 * trois etudiants, une version que deux personnes n'ont pas mise a jour : a cette taille, un chiffre
 * peut designer quelqu'un. La case devient « moins de 5 » a l'ecran comme dans l'export, et le rapport
 * partenaire regroupe les campus trop petits en « campus regroupes ».
 *
 * Cacher la case ne suffit pas quand le total est a cote : le total moins les cases visibles la
 * redonne. D'ou le secret secondaire (`proteger`) : tant qu'une case cachee se retrouverait par
 * difference, la plus petite case visible est cachee aussi, et se lit « masque ».
 *
 * Zero n'est pas une petite case : il ne designe personne, et le cacher ferait croire a un compte.
 *
 * Pur : joue par `npm test` a la racine du depot (cases.test.ts).
 */

export const SEUIL_PETITE_CASE = 5;

/** Une case cachee pour proteger une petite case voisine : son compte depasse le seuil. */
export const SECRET = 'secret';

/** Ce qu'une case affiche : son compte, `null` sous le seuil (« moins de 5 »), ou `SECRET` (« masque »). */
export type Affiche = number | null | typeof SECRET;

/** Un compte tel qu'il s'affiche seul : `null` sous le seuil. */
export function masquer(n: number): number | null {
    return n > 0 && n < SEUIL_PETITE_CASE ? null : n;
}

export function libelleDeCase(n: Affiche): string {
    if (n === null) return `moins de ${SEUIL_PETITE_CASE}`;
    if (n === SECRET) return 'masqué';
    return n.toLocaleString('fr-FR');
}

function somme(valeurs: readonly number[]): number {
    return valeurs.reduce((a, b) => a + b, 0);
}

/**
 * Les cases d'une colonne dont le total se lit (affiche, ou retrouve par une part) : les petites
 * cachees, et, au besoin, de quoi les proteger. Celui qui lit sait qu'une case « moins de 5 » vaut de 1
 * a 4, et qu'une case « masque » vaut 5 ou plus ; il connait la somme des cases cachees (le total moins
 * les visibles). Une petite case ne s'en deduit pas quand la somme laisse ouvertes ses quatre valeurs :
 * il faut au moins deux cases cachees, et une marge de trois au-dela de leurs minima. Les cases visibles
 * se cachent de la plus petite a la plus grande jusqu'a l'atteindre.
 */
export function proteger(valeurs: readonly number[]): Affiche[] {
    const affiche: Affiche[] = valeurs.map(masquer);
    const total = somme(valeurs);
    // Un total lui-meme cache ne donne aucune equation.
    if (masquer(total) === null || total === 0) return affiche;
    const petites = valeurs.filter((_, i) => affiche[i] === null);
    if (petites.length === 0) return affiche;
    const candidates = valeurs
        .map((v, i) => ({ v, i }))
        .filter(({ v, i }) => affiche[i] !== null && v > 0)
        .sort((a, b) => a.v - b.v || a.i - b.i);
    const secondaires: number[] = [];
    const marge = () => somme(petites) - petites.length + somme(secondaires.map((s) => s - SEUIL_PETITE_CASE));
    const protegee = () => petites.length + secondaires.length >= 2 && marge() >= SEUIL_PETITE_CASE - 2;
    for (const { v, i } of candidates) {
        if (protegee()) break;
        affiche[i] = SECRET;
        secondaires.push(v);
    }
    return affiche;
}

export interface Case {
    readonly cle: string;
    readonly n: Affiche;
    /** La part du total, seulement pour une case visible. */
    readonly part: number | null;
}

/**
 * Les cases d'une repartition, de la plus grande a la plus petite, puis les cachees, par ordre
 * alphabetique : triees par leur compte, elles diraient laquelle est la plus grande. La part se prend
 * sur le total de toutes les cases : il se retrouve par elle, et `proteger` en tient compte.
 */
export function casesDe(comptes: ReadonlyMap<string, number>): Case[] {
    const entrees = [...comptes.entries()].filter(([, n]) => n > 0);
    const total = somme(entrees.map(([, n]) => n));
    const affiches = proteger(entrees.map(([, n]) => n));
    return entrees
        .map(([cle, n], i): Case => {
            const visible = affiches[i] ?? null;
            return { cle, n: visible, part: typeof visible === 'number' && total > 0 ? n / total : null };
        })
        .sort((a, b) => {
            const cacheeA = typeof a.n !== 'number';
            const cacheeB = typeof b.n !== 'number';
            if (cacheeA || cacheeB) return Number(cacheeA) - Number(cacheeB) || a.cle.localeCompare(b.cle);
            return (b.n as number) - (a.n as number) || a.cle.localeCompare(b.cle);
        });
}

/**
 * Regroupe les cles sous le seuil en une seule : le rapport partenaire ne nomme pas un campus a deux
 * impressions. `petite` dit, pour chaque cle, si elle passe dans le groupe.
 */
export function regrouper(comptes: ReadonlyMap<string, number>, petite: (cle: string) => boolean, groupe: string): Map<string, number> {
    const resultat = new Map<string, number>();
    for (const [cle, n] of comptes) {
        const cible = petite(cle) ? groupe : cle;
        resultat.set(cible, (resultat.get(cible) ?? 0) + n);
    }
    return resultat;
}
