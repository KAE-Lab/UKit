/**
 * La requete d'une liste, decrite avant d'etre envoyee : le tri, les filtres, la recherche, le
 * campus, la plage. Pure — aucun appel a la base — pour que la traduction de l'etat d'une table en
 * requete PostgREST se verifie sous vitest (requete.test.ts) ; `base.ts` ne fait que l'appliquer.
 *
 * Le mode est « serveur » : la base trie, filtre et pagine, et rend le total exact. La console ne
 * charge jamais tout pour trier dans le navigateur (docs/phase-7/7-e-console-socle.md).
 */

import { champDe, colonnesTriables, type Descripteur, type FiltreDeCampus } from '../schema/descripteurs';

export interface Tri {
    readonly colonne: string;
    readonly desc: boolean;
}

export type Filtre =
    | { readonly colonne: string; readonly op: 'eq'; readonly valeur: string | boolean }
    | { readonly colonne: string; readonly op: 'in'; readonly valeurs: readonly string[] };

export interface Recherche {
    readonly colonnes: readonly string[];
    readonly texte: string;
}

export interface Plage {
    readonly de: number;
    readonly a: number;
}

export interface SpecDeRequete {
    readonly tri: readonly Tri[];
    readonly filtres: readonly Filtre[];
    readonly recherche: Recherche | null;
    /** Une expression `or` de PostgREST, deja ecrite, ou `null`. */
    readonly campus: string | null;
    readonly plage: Plage;
}

/** L'etat d'une table tel que TanStack Table le tient ; les filtres de colonne portent une chaine ou une liste. */
export interface EtatDeTable {
    readonly sorting: readonly { readonly id: string; readonly desc: boolean }[];
    readonly columnFilters: readonly { readonly id: string; readonly value: unknown }[];
    readonly globalFilter: string;
    readonly pagination: { readonly pageIndex: number; readonly pageSize: number };
}

/**
 * Une valeur dans une expression `or` de PostgREST : entre guillemets, avec les guillemets et les
 * barres obliques inverses echappes, pour qu'une virgule ou une parenthese saisie ne casse pas la
 * syntaxe. `*` est le joker d'`ilike` dans cette syntaxe.
 */
export function echapper(valeur: string): string {
    return `"${valeur.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `titre.ilike."*mot*",emetteur.ilike."*mot*"` — a passer a `.or()`. */
export function expressionDeRecherche(recherche: Recherche): string {
    const motif = echapper(`*${recherche.texte.trim()}*`);
    return recherche.colonnes.map((colonne) => `${colonne}.ilike.${motif}`).join(',');
}

/**
 * Le filtre global par campus : un ciblage nul vise tous les campus et reste visible ; un code
 * d'etablissement se compare tel quel.
 */
export function expressionDeCampus(filtre: FiltreDeCampus, code: string): string {
    if (filtre.type === 'code') return `${filtre.colonne}.eq.${echapper(code)}`;
    return `${filtre.colonne}.is.null,${filtre.colonne}.cs.{${echapper(code)}}`;
}

function filtreDeColonne(descripteur: Descripteur, id: string, value: unknown): Filtre | null {
    const champ = champDe(descripteur, id);
    if (champ === undefined) return null;
    if (Array.isArray(value)) {
        const valeurs = value.filter((v): v is string => typeof v === 'string' && v !== '');
        return valeurs.length === 0 ? null : { colonne: id, op: 'in', valeurs };
    }
    if (typeof value !== 'string' || value === '') return null;
    if (champ.type.type === 'booleen') return { colonne: id, op: 'eq', valeur: value === 'true' };
    return { colonne: id, op: 'eq', valeur: value };
}

/** L'etat d'une table, traduit en requete ; un tri hors des colonnes triables est ignore. */
export function specDepuisEtat(descripteur: Descripteur, etat: EtatDeTable, campus: string | null): SpecDeRequete {
    const triables = colonnesTriables(descripteur);
    const tri = etat.sorting.filter((s) => triables.includes(s.id)).map((s) => ({ colonne: s.id, desc: s.desc }));
    const filtres = etat.columnFilters.map((f) => filtreDeColonne(descripteur, f.id, f.value)).filter((f): f is Filtre => f !== null);
    const texte = etat.globalFilter.trim();
    const colonnes = descripteur.recherche ?? [];
    const recherche = texte === '' || colonnes.length === 0 ? null : { colonnes, texte };
    const expressionCampus = campus !== null && descripteur.campus !== undefined ? expressionDeCampus(descripteur.campus, campus) : null;
    const { pageIndex, pageSize } = etat.pagination;
    return {
        tri: tri.length > 0 ? tri : (descripteur.tri === undefined ? [] : [{ colonne: descripteur.tri.colonne, desc: descripteur.tri.desc === true }]),
        filtres,
        recherche,
        campus: expressionCampus,
        plage: { de: pageIndex * pageSize, a: (pageIndex + 1) * pageSize - 1 },
    };
}

/** La cle de cache d'une requete : sa forme serialisable, stable d'un rendu a l'autre. */
export function cleDeSpec(spec: SpecDeRequete): string {
    return JSON.stringify(spec);
}
