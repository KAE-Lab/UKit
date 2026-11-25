/**
 * Ce que l'equipe publie et que les etudiants soutiennent (lots 3 et 4) : les problemes connus et la
 * boite a idees partagent leur mecanisme. Une liste lue anonymement, gardee pour le hors-ligne ; « moi
 * aussi », un vote de la communaute, un par appareil ; et les votes donnes, gardes sur l'appareil, qui
 * n'a pas d'autre moyen de s'en souvenir : un vote ne porte aucun identifiant (docs/phase-8/README.md,
 * vie privee). Ce qui distingue les deux — la table, la forme d'une ligne, la valeur du vote — tient dans
 * leur genre (`problemes.ts`, `idees.ts`).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { envoyerUneContribution, type ResultatDeContribution } from '../communaute';
import { noterUneQuestionDAvis } from '../notation';
import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../supabase';
import { lireVotes, noterVote } from './memoire';

export interface GenreDeSuivi {
    readonly table: 'problemes_connus' | 'idees';
    readonly colonnes: string;
    readonly statuts: readonly string[];
    /** La derniere liste lue, pour le hors-ligne. */
    readonly cache: string;
    /** Les « moi aussi » donnes par cet appareil. */
    readonly votes: string;
    readonly sujet: 'probleme.moi_aussi' | 'idee.moi_aussi';
}

/** Les lignes publiees du genre ; une base injoignable rend la derniere liste lue. */
export async function lireLesLignes(genre: GenreDeSuivi): Promise<unknown[]> {
    const cache = async () => {
        try {
            const brut: unknown = JSON.parse((await AsyncStorage.getItem(genre.cache)) ?? '[]');
            return Array.isArray(brut) ? brut as unknown[] : [];
        } catch {
            return [];
        }
    };
    const supabase = getSupabase();
    if (supabase === null) return cache();
    const { data, error } = await supabase.from(genre.table).select(genre.colonnes).in('statut', [...genre.statuts])
        .order('maj_le', { ascending: false }).limit(50);
    if (error !== null) {
        reportSupabaseFailure(genre.table, describeSupabaseFailure(error));
        return cache();
    }
    const lignes = (data ?? []) as unknown[];
    await AsyncStorage.setItem(genre.cache, JSON.stringify(lignes)).catch(() => undefined);
    return lignes;
}

export function lireLesVotes(genre: GenreDeSuivi): Promise<string[]> {
    return lireVotes(genre.votes);
}

/** Le vote compte, ou avait deja ete donne : l'appareil s'en souvient dans les deux cas. */
export function aCompte(resultat: ResultatDeContribution | null): boolean {
    return resultat !== null && (resultat.etat === 'acceptee' || (resultat.etat === 'refusee' && resultat.raison === 'deja_vote'));
}

/**
 * « Moi aussi » : la contribution part, et l'appareil s'en souvient si elle est acceptee ou deja donnee.
 * C'est une question d'avis : la fiche de notation ne se proposera pas ce jour-la.
 */
export async function direMoiAussiSur(genre: GenreDeSuivi, id: string, valeur: string): Promise<ResultatDeContribution> {
    noterUneQuestionDAvis();
    const resultat = await envoyerUneContribution({ sujet: genre.sujet, cible: id, valeur });
    if (aCompte(resultat)) await noterVote(id, genre.votes);
    return resultat;
}
