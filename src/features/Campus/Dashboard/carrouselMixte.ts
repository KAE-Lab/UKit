/**
 * Le carrousel d'une section de lieux, avec ses cartes speciales : les annonces que la console y a
 * placees, **en tete**, puis les lieux (jalon 7-I, decision du 2026-09-26).
 *
 * Une annonce choisit ses carrousels par `emplacements` ; dans tout autre que celui des annonces, elle
 * est une carte speciale, rendue au gabarit de ses voisines (BdeAnnonceCard, cadre `lieu`). Leur ordre
 * est celui que `ordonner()` a deja pose sur la liste des annonces : ce module ne trie rien.
 *
 * Pur, et c'est ce qui le rend verifiable : l'union d'elements, la cle de chacun, et la regle qui
 * dit qu'**une carte speciale n'est jamais seule** — une section sans lieu a montrer (une panne, un
 * filtre, une absence) dit pourquoi, et une annonce a sa place ferait croire a un contenu de la
 * section.
 */

import { emplacementsSpeciaux, type Emplacement } from '../../../shared/annonces/carte';
import type { BdeAnnonce } from '../services/BdeMapping';

/** Un carrousel de lieux : tout emplacement, sauf celui des annonces. */
export type EmplacementDeLieux = Exclude<Emplacement, 'annonces'>;

export type ElementDeCarrousel<T> =
    | { readonly nature: 'annonce'; readonly cle: string; readonly annonce: BdeAnnonce }
    | { readonly nature: 'lieu'; readonly cle: string; readonly lieu: T };

/** Les cartes speciales d'un carrousel, dans l'ordre ou le service les a rangees. */
export function cartesSpeciales(annonces: readonly BdeAnnonce[], emplacement: EmplacementDeLieux): BdeAnnonce[] {
    return annonces.filter((annonce) => emplacementsSpeciaux(annonce.emplacements).includes(emplacement));
}

/**
 * Les elements d'un carrousel : les speciales, puis les lieux. Les cles sont prefixees par la nature,
 * pour qu'une annonce et un lieu de meme identifiant ne se confondent jamais dans la liste.
 */
export function composerCarrousel<T>(
    speciales: readonly BdeAnnonce[],
    lieux: readonly T[],
    cleDuLieu: (lieu: T) => string,
): ElementDeCarrousel<T>[] {
    if (lieux.length === 0) return [];
    return [
        ...speciales.map((annonce): ElementDeCarrousel<T> => ({ nature: 'annonce', cle: `annonce:${annonce.id}`, annonce })),
        ...lieux.map((lieu): ElementDeCarrousel<T> => ({ nature: 'lieu', cle: `lieu:${cleDuLieu(lieu)}`, lieu })),
    ];
}

/** L'annonce qu'un element montre, pour la mesure des impressions : rien pour un lieu. */
export function annonceDElement<T>(element: ElementDeCarrousel<T>): string | null {
    return element.nature === 'annonce' ? element.annonce.id : null;
}
