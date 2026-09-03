/**
 * Lire et ecrire une table depuis son descripteur.
 *
 * Trois verbes, et l'erreur traduite : une insertion refusee par la politique (42501) dit « ce
 * compte n'est pas editeur » plutot que « new row violates row-level security policy », parce que
 * c'est ce que la personne devant l'ecran peut comprendre et corriger.
 */

import type { PostgrestError } from '@supabase/supabase-js';

import { supabase, type Ligne } from '../supabase';
import type { Descripteur } from '../schema/descripteurs';

export class ErreurDeBase extends Error {
    constructor(message: string, readonly code: string | null) {
        super(message);
        this.name = 'ErreurDeBase';
    }
}

function traduire(erreur: PostgrestError): ErreurDeBase {
    if (erreur.code === '42501') {
        return new ErreurDeBase('Ecriture refusee : ce compte n est pas dans la table des editeurs.', erreur.code);
    }
    if (erreur.code === '23505') {
        return new ErreurDeBase('Une ligne porte deja cette cle.', erreur.code);
    }
    if (erreur.code === '23514') {
        return new ErreurDeBase(`Une valeur ne respecte pas une contrainte de la table : ${erreur.message}`, erreur.code);
    }
    return new ErreurDeBase(`${erreur.code ?? 'erreur'} : ${erreur.message}`, erreur.code ?? null);
}

export async function lister(descripteur: Descripteur): Promise<Ligne[]> {
    let requete = supabase.from(descripteur.table).select('*');
    if (descripteur.tri !== undefined) {
        requete = requete.order(descripteur.tri.colonne, { ascending: descripteur.tri.desc !== true });
    }
    const { data, error } = await requete;
    if (error !== null) throw traduire(error);
    return (data ?? []) as Ligne[];
}

function filtreDeCle(descripteur: Descripteur, ligne: Ligne): Ligne {
    return Object.fromEntries(descripteur.cle.map((colonne) => [colonne, ligne[colonne]]));
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

/** Le catalogue, pour les cases a cocher du ciblage. Un editeur voit aussi les etablissements inactifs. */
export async function listerEtablissements(): Promise<readonly EtablissementConnu[]> {
    const { data, error } = await supabase.from('etablissements').select('code,nom').order('ordre');
    if (error !== null) throw traduire(error);
    return (data ?? []) as EtablissementConnu[];
}

export function messageDErreur(erreur: unknown): string {
    return erreur instanceof Error ? erreur.message : String(erreur);
}
