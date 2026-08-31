/**
 * Les visuels publies : corriger la photo d'un contenu sans passer par une release.
 *
 * Toutes les images de Campus viennent d'une **source tierce** — la route de previsualisation de
 * Croustillant, la galerie d'Affluences — et jusqu'ici l'application n'avait aucun moyen d'en
 * remplacer une. Une photo fausse, ou absente, l'etait pour tout le monde jusqu'au prochain passage
 * en boutique, ce qui revient a dire : pour toujours.
 *
 * Meme modele que le referentiel des lieux, a **une** difference qui decide de toute la forme du
 * module : il n'y a **aucun socle embarque**. Le socle d'un visuel, c'est l'image que la source
 * publie deja. Une table vide, absente ou injoignable laisse donc l'application exactement dans
 * l'etat qui est le sien aujourd'hui — et c'est ce qui rend ce mecanisme entierement retirable, ce
 * qu'un socle embarque de photos ne permettrait pas.
 *
 * Ce fichier ne touche **ni** au reseau **ni** au stockage : il tient une table en memoire et sait
 * la lire. La couture de plateforme vit dans `index.ts`, comme pour les lieux (docs/qualite.md).
 *
 * Les accesseurs sont **synchrones** pour la meme raison que ceux des lieux : ils sont lus pendant
 * qu'un service projette une liste, parfois juste avant un rendu, et un `await` a cet endroit
 * n'attendrait rien.
 *
 * Voir docs/backend.md et docs/donnees-et-persistance.md.
 */

import type { VisuelRow } from '../supabase/types';

/**
 * Les contenus qui portent une image remplacable.
 *
 * Ferme volontairement : la valeur est ecrite a la main dans la base, et un domaine libre ferait
 * d'une faute de frappe une ligne parfaitement valide qui ne corrige rien. La base porte le meme
 * `check`, et les deux doivent bouger ensemble.
 */
export type DomaineVisuel = 'crous' | 'bibliotheque' | 'batiment' | 'annonce';

const DOMAINES: readonly string[] = ['crous', 'bibliotheque', 'batiment', 'annonce'];

/**
 * La surcouche en memoire.
 *
 * Une table plate indexee par `domaine:cle` plutot qu'un dictionnaire a deux niveaux : elle se
 * serialise telle quelle dans le cache, et la lecture est un seul acces. La cle n'est **jamais
 * redecoupee** — on ne la construit que dans un sens — donc un identifiant portant un « : » ne cree
 * aucune ambiguite.
 *
 * La valeur porte les deux etats utiles : une URL remplace le visuel de la source, `null` dit qu'il
 * ne faut en montrer aucun. L'absence d'entree, elle, dit qu'il n'y a rien a corriger.
 */
export type TableVisuels = Record<string, string | null>;

let table: TableVisuels = {};

function cleDe(domaine: string, cle: string): string {
    return `${domaine}:${cle}`;
}

/**
 * Traduit les lignes publiees en surcouche.
 *
 * Trois lignes sont ecartees, et aucune n'est une erreur a signaler : un domaine que cette version
 * ne connait pas — une publication peut ouvrir un domaine avant que le parc installe ne le suive —
 * une cle vide, et une colonne **nulle**, qui veut dire « je ne corrige pas ce visuel ». Seule la
 * chaine **vide** est retenue, et elle se distingue du nul : elle dit « la photo de la source est
 * fausse, n'en montre aucune ». Aplatir les deux ferait perdre le seul moyen de retirer une image.
 */
export function projeterVisuels(rows: readonly VisuelRow[]): TableVisuels {
    const surcouche: TableVisuels = {};

    for (const row of rows) {
        const domaine = typeof row.domaine === 'string' ? row.domaine : '';
        const cle = typeof row.cle === 'string' ? row.cle : '';
        if (!DOMAINES.includes(domaine) || cle === '') continue;
        if (typeof row.image_url !== 'string') continue;

        surcouche[cleDe(domaine, cle)] = row.image_url === '' ? null : row.image_url;
    }

    return surcouche;
}

/** Installe une surcouche. Sans argument, revient a l'absence de regle, donc aux visuels des sources. */
export function appliquerSurcouche(surcouche?: TableVisuels | null): void {
    table = surcouche === null || surcouche === undefined ? {} : { ...surcouche };
}

/**
 * La regle publiee pour ce contenu.
 *
 * Trois retours, et les trois comptent : `undefined` — aucune regle, la source decide ; `null` — ne
 * montrer aucune image, donc le repli embarque de l'ecran ; une chaine — cette URL remplace celle de
 * la source.
 */
export function visuelDe(domaine: DomaineVisuel, cle: string): string | null | undefined {
    const index = cleDe(domaine, cle);
    return Object.prototype.hasOwnProperty.call(table, index) ? table[index] : undefined;
}

/**
 * Ce qu'un service pose reellement dans son contrat, en une ligne.
 *
 * L'unique point d'appel des quatre services, pour que la resolution des trois etats vive a un seul
 * endroit. Le repli embarque n'est pas choisi ici : les ecrans savent deja qu'une image absente se
 * remplace par la leur, et c'est ce que `undefined` leur dit — le meme mot que « la source n'en a
 * pas publie », qui appelle exactement le meme affichage.
 */
export function appliquerVisuel(
    domaine: DomaineVisuel,
    cle: string,
    source: string | undefined,
): string | undefined {
    const publie = visuelDe(domaine, cle);
    if (publie === undefined) return source;
    return publie === null ? undefined : publie;
}

/** Le nombre de regles installees. Lu par le rapport de rafraichissement, et par les tests. */
export function nombreDeVisuels(): number {
    return Object.keys(table).length;
}
