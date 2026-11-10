/**
 * L'ordre d'une liste de lieux du Campus : restaurants, bibliotheques, batiments.
 *
 * Favoris d'abord, puis les lieux dont la distance est connue, du plus proche au plus lointain, puis
 * les autres par leur nom. Il s'ecrivait `(a.distance || 0) - (b.distance || 0)` dans six ecrans :
 * une distance inconnue comptait pour zero, et un lieu sans coordonnees passait devant le plus
 * proche. Sans position (decision du 2026-11-10), aucune distance n'est connue : la liste suit
 * l'ordre alphabetique, qui ne pretend rien.
 *
 * Voir docs/features/campus.md.
 */

export interface LieuOrdonnable {
    readonly id: string;
    readonly distance?: number;
}

export function ordreDesLieux<T extends LieuOrdonnable>(
    favoris: readonly string[],
    nom: (lieu: T) => string,
): (a: T, b: T) => number {
    return (a, b) => {
        const aFavori = favoris.includes(a.id);
        const bFavori = favoris.includes(b.id);
        if (aFavori !== bFavori) return aFavori ? -1 : 1;

        const aConnue = a.distance !== undefined;
        const bConnue = b.distance !== undefined;
        if (aConnue && bConnue) {
            const ecart = (a.distance as number) - (b.distance as number);
            if (ecart !== 0) return ecart;
        } else if (aConnue !== bConnue) {
            return aConnue ? -1 : 1;
        }
        // La ponctuation ne compte pas : « (S)pace' Campus » se range a S, ou on le cherche, et non en
        // tete parce qu'il commence par une parenthese (vu sur l'A8, 2026-11-10).
        return nom(a).localeCompare(nom(b), 'fr', { sensitivity: 'base', ignorePunctuation: true });
    };
}
