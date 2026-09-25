/**
 * Le verrou contre l'ecrasement (jalon 7-H), cote console : ce que veut dire une ecriture qui n'a
 * touche aucune ligne, et la phrase qui le dit.
 *
 * Deux editeurs ouvrent la meme annonce ; le premier enregistre, la version de la ligne (`maj_le`,
 * tenue par la base) change ; le second enregistre avec la version qu'il a lue, et sa modification ne
 * touche plus rien. Mais une modification que la politique filtre ne touche rien non plus, sans lever
 * d'erreur : seule une relecture de la ligne dit laquelle des trois choses est arrivee.
 *
 * Pur : joue par `npm test` a la racine du depot (verrou.test.ts).
 */

import { formaterDate } from './dates';

export type IssueDUneEcritureVide = 'supprimee' | 'devancee' | 'refusee';

/**
 * `lue` est la ligne que le formulaire a chargee, `fraiche` celle que la relecture rend. Sans colonne de
 * verrou, une ligne qui existe encore n'a pu etre que refusee.
 */
export function issueDUneEcritureVide(verrou: string | undefined, lue: Readonly<Record<string, unknown>>, fraiche: Readonly<Record<string, unknown>> | null): IssueDUneEcritureVide {
    if (fraiche === null) return 'supprimee';
    if (verrou !== undefined && fraiche[verrou] !== lue[verrou]) return 'devancee';
    return 'refusee';
}

/** La derniere ecriture de la ligne, lue dans le journal : qui, et quand. */
export interface Auteur {
    readonly par: string;
    readonly quand: string;
}

/** « Modifiée entre-temps par camille@…, le 25 sept. 2026 à 14:32 » ; « par toi » quand c'est un autre onglet. */
export function phraseDuConflit(auteur: Auteur | null, moi: string | null): string {
    const suite = 'la version enregistrée n’est plus celle que tu as ouverte.';
    if (auteur === null || auteur.par === '') return `Modifiée entre-temps : ${suite}`;
    const qui = moi !== null && auteur.par === moi ? 'par toi, dans un autre onglet' : `par ${auteur.par}`;
    return `Modifiée entre-temps ${qui}, le ${formaterDate(auteur.quand)} : ${suite}`;
}
