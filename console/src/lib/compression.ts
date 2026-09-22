/**
 * Ce qui se decide avant de compresser une image : le grand cote vise par dossier, et les
 * dimensions cibles d'une image — les memes valeurs que la passe sur le bucket
 * (tools/media/plan.mjs), pour qu'un visuel televerse depuis la console pese ce que pese un visuel
 * re-encode par le script.
 *
 * Pur : joue par `npm test` a la racine du depot (compression.test.ts).
 */

/** Une affiche d'annonce est vue au plus en pleine largeur d'un telephone ; une photo sert aussi de fond de carte. */
export const LARGEUR_PAR_DOSSIER: Readonly<Record<string, number>> = {
    annonces: 1080,
    restaurants: 1200,
    bibliotheques: 1200,
    batiments: 1200,
    etablissements: 1280,
    // Le logo d'un partenaire (7-F) : un badge de carte, jamais plus large qu'une vignette.
    partenaires: 400,
};
export const LARGEUR_PAR_DEFAUT = 1200;
export const QUALITE_WEBP = 0.75;
export const MIME_WEBP = 'image/webp';

export function grandCoteVise(dossier: string): number {
    return LARGEUR_PAR_DOSSIER[dossier] ?? LARGEUR_PAR_DEFAUT;
}

export interface Dimensions {
    readonly largeur: number;
    readonly hauteur: number;
}

/** Les dimensions apres reduction : le grand cote borne, le ratio garde, jamais agrandie. */
export function dimensionsCible(source: Dimensions, grandCote: number): Dimensions {
    const plusGrand = Math.max(source.largeur, source.hauteur);
    if (plusGrand <= grandCote || plusGrand === 0) return source;
    const facteur = grandCote / plusGrand;
    return { largeur: Math.round(source.largeur * facteur), hauteur: Math.round(source.hauteur * facteur) };
}
