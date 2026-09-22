/**
 * Lire et ecrire une table depuis son descripteur.
 *
 * Une page a la fois, avec le total exact ; ou tout, par pages de mille, quand la lecture est un
 * calcul (le parc des jetons, l'export du journal). L'erreur est traduite (erreurs.ts).
 */

import { supabase, type Ligne } from '../supabase';
import type { Descripteur } from '../schema/descripteurs';
import { traduire } from './erreurs';
import { expressionDeRecherche, type SpecDeRequete } from './requete';

export { ErreurDeBase, messageDErreur } from './erreurs';

/** La taille maximale d'une reponse de la base par defaut ; au-dela, il faut paginer. */
export const TAILLE_DE_LOT = 1000;

export interface Page {
    readonly lignes: readonly Ligne[];
    readonly total: number;
}

type Requete = ReturnType<ReturnType<typeof supabase.from>['select']>;

function appliquer(requete: Requete, spec: SpecDeRequete): Requete {
    let r = requete;
    for (const filtre of spec.filtres) {
        r = filtre.op === 'eq' ? r.eq(filtre.colonne, filtre.valeur) : r.in(filtre.colonne, [...filtre.valeurs]);
    }
    if (spec.recherche !== null) r = r.or(expressionDeRecherche(spec.recherche));
    if (spec.campus !== null) r = r.or(spec.campus);
    for (const tri of spec.tri) r = r.order(tri.colonne, { ascending: !tri.desc });
    return r.range(spec.plage.de, spec.plage.a);
}

/** Une page de la table, et le nombre total de lignes qui repondent aux memes filtres. */
export async function lirePage(table: string, spec: SpecDeRequete, colonnes = '*'): Promise<Page> {
    const { data, error, count } = await appliquer(supabase.from(table).select(colonnes, { count: 'exact' }), spec);
    if (error !== null) throw traduire(error);
    return { lignes: (data ?? []) as unknown as Ligne[], total: count ?? 0 };
}

/** Toute la table, par lots : pour ce qui se compte ou s'exporte, jamais pour une liste a l'ecran. */
export async function lireTout(table: string, spec: Omit<SpecDeRequete, 'plage'>, colonnes = '*'): Promise<Ligne[]> {
    const tout: Ligne[] = [];
    for (let lot = 0; ; lot++) {
        const plage = { de: lot * TAILLE_DE_LOT, a: (lot + 1) * TAILLE_DE_LOT - 1 };
        const { data, error } = await appliquer(supabase.from(table).select(colonnes), { ...spec, plage });
        if (error !== null) throw traduire(error);
        const lignes = (data ?? []) as unknown as Ligne[];
        tout.push(...lignes);
        if (lignes.length < TAILLE_DE_LOT) return tout;
    }
}

export function filtreDeCle(descripteur: Descripteur, ligne: Ligne): Ligne {
    return Object.fromEntries(descripteur.cle.map((colonne) => [colonne, ligne[colonne]]));
}

/** Une ligne par sa cle, ou `null` si elle n'existe pas (ou plus). */
export async function lireLigne(descripteur: Descripteur, cle: Ligne): Promise<Ligne | null> {
    const { data, error } = await supabase.from(descripteur.table).select('*').match(cle).maybeSingle();
    if (error !== null) throw traduire(error);
    return data as Ligne | null;
}

/** Insere une ligne neuve, ou met a jour la ligne existante par sa cle. Rend la ligne telle que la base l'a ecrite. */
export async function enregistrer(descripteur: Descripteur, valeurs: Ligne, existante: Ligne | null): Promise<Ligne> {
    const table = supabase.from(descripteur.table);
    const { data, error } = existante === null
        ? await table.insert(valeurs).select().single()
        : await table.update(valeurs).match(filtreDeCle(descripteur, existante)).select().single();
    if (error !== null) throw traduire(error);
    return data as Ligne;
}

export async function supprimer(descripteur: Descripteur, ligne: Ligne): Promise<void> {
    const { error } = await supabase.from(descripteur.table).delete().match(filtreDeCle(descripteur, ligne));
    if (error !== null) throw traduire(error);
}

export interface EtablissementConnu {
    readonly code: string;
    readonly nom: string;
}

/** Le catalogue, pour les cases a cocher du ciblage et le filtre global. Un editeur voit aussi les etablissements inactifs. */
export async function listerEtablissements(): Promise<readonly EtablissementConnu[]> {
    const { data, error } = await supabase.from('etablissements').select('code,nom').order('ordre');
    if (error !== null) throw traduire(error);
    return (data ?? []) as EtablissementConnu[];
}
