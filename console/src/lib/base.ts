/**
 * Lire et ecrire une table depuis son descripteur.
 *
 * Une page a la fois, avec le total exact ; ou tout, par pages de mille, quand la lecture est un
 * calcul (le parc des jetons, l'export du journal). L'erreur est traduite (erreurs.ts).
 *
 * Depuis le jalon 7-H, deux choses de plus. La console ne lit que les colonnes que la base lui laisse
 * (`colonnesLues`) : l'adresse d'un retour et le jeton d'un appareil ne sont lisibles par aucun de ses
 * comptes, et `select *` y serait refuse en entier. Et une ecriture qui ne touche aucune ligne se dit —
 * une politique qui filtre ne leve rien, et un enregistrement devance non plus : la ligne se relit pour
 * savoir ce qui est arrive (verrou.ts).
 */

import { supabase, type Ligne } from '../supabase';
import { cleDeLigne, colonnesLues, type Descripteur } from '../schema/descripteurs';
import { ErreurDeBase, ErreurDeConflit, traduire } from './erreurs';
import { expressionDeRecherche, type SpecDeRequete } from './requete';
import { issueDUneEcritureVide, phraseDuConflit, type Auteur } from './verrou';

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
    const { data, error } = await supabase.from(descripteur.table).select(colonnesLues(descripteur)).match(cle).maybeSingle();
    if (error !== null) throw traduire(error);
    return data as unknown as Ligne | null;
}

/** La derniere ecriture d'une ligne, lue dans le journal ; `null` quand il ne la rend pas. */
async function derniereEcriture(descripteur: Descripteur, ligne: Ligne): Promise<Auteur | null> {
    const { data, error } = await supabase
        .from('journal')
        .select('par, quand')
        .eq('table_name', descripteur.table)
        .eq('ligne_id', cleDeLigne(descripteur, ligne))
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error !== null || data === null) return null;
    return { par: typeof data.par === 'string' ? data.par : '', quand: typeof data.quand === 'string' ? data.quand : '' };
}

/** Une modification qui n'a touche aucune ligne : la relire, et dire pourquoi. */
async function echecDUneEcritureVide(descripteur: Descripteur, lue: Ligne): Promise<ErreurDeBase> {
    const fraiche = await lireLigne(descripteur, filtreDeCle(descripteur, lue));
    switch (issueDUneEcritureVide(descripteur.verrou, lue, fraiche)) {
        case 'supprimee':
            return new ErreurDeBase('Cette ligne n’existe plus : elle a été supprimée entre-temps.', 'PGRST116');
        case 'refusee':
            return new ErreurDeBase('Refusé : les droits de ce compte ne permettent pas de modifier cette ligne.', '42501');
        case 'devancee': {
            const [auteur, { data }] = await Promise.all([derniereEcriture(descripteur, lue), supabase.auth.getSession()]);
            return new ErreurDeConflit(phraseDuConflit(auteur, data.session?.user.email ?? null), fraiche ?? {});
        }
    }
}

/**
 * Insere une ligne neuve, ou met a jour la ligne existante par sa cle. Rend la ligne telle que la base
 * l'a ecrite. Sous verrou, la mise a jour ne passe que si la version de la ligne est celle d'`existante`,
 * la ligne que le formulaire a chargee — pas la derniere relue.
 */
export async function enregistrer(descripteur: Descripteur, valeurs: Ligne, existante: Ligne | null): Promise<Ligne> {
    const table = supabase.from(descripteur.table);
    const colonnes = colonnesLues(descripteur);
    if (existante === null) {
        const { data, error } = await table.insert(valeurs).select(colonnes).single();
        if (error !== null) throw traduire(error);
        return data as unknown as Ligne;
    }
    let modification = table.update(valeurs).match(filtreDeCle(descripteur, existante));
    const verrou = descripteur.verrou;
    if (verrou !== undefined && typeof existante[verrou] === 'string') modification = modification.eq(verrou, existante[verrou]);
    const { data, error } = await modification.select(colonnes).maybeSingle();
    if (error !== null) throw traduire(error);
    if (data === null) throw await echecDUneEcritureVide(descripteur, existante);
    return data as unknown as Ligne;
}

/** Supprime une ligne ; une suppression que la politique filtre ne touche rien, et se dit. */
export async function supprimer(descripteur: Descripteur, ligne: Ligne): Promise<void> {
    const { data, error } = await supabase.from(descripteur.table).delete().match(filtreDeCle(descripteur, ligne)).select(descripteur.cle.join(','));
    if (error !== null) throw traduire(error);
    if ((data ?? []).length === 0) throw new ErreurDeBase('Rien n’a été supprimé : la ligne n’existe plus, ou les droits de ce compte ne le permettent pas.', '42501');
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
