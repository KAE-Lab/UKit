/**
 * Le sondage d'une annonce, cote reseau et memoire (phase 8, lot 4 ; docs/phase-8/4-sondages-idees-notation.md) :
 * le vote, un bulletin du lot 1 par appareil (sujet `sondage.choix`, cible l'annonce, valeur le choix) ;
 * les resultats, par `resultats_sondage` ; et le choix de l'appareil, qu'il est seul a garder — un vote ne
 * porte aucun identifiant, la base ne sait pas qui a vote quoi.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { lireResultats, type ResultatsDeSondage, type Sondage } from '../../../shared/annonces/sondage';
import { envoyerUneContribution } from '../../../shared/communaute';
import { noterUneQuestionDAvis } from '../../../shared/notation';
import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../../../shared/supabase';
import { appeler } from '../../../shared/supabase/rpc';

const CLE = 'sondages-votes@1';
const GARDES = 100;

type Votes = Record<string, string>;

async function lireVotes(): Promise<Votes> {
    try {
        const brut: unknown = JSON.parse((await AsyncStorage.getItem(CLE)) ?? '{}');
        return typeof brut === 'object' && brut !== null && !Array.isArray(brut) ? brut as Votes : {};
    } catch {
        return {};
    }
}

export async function monChoix(annonce: string): Promise<string | null> {
    const choix = (await lireVotes())[annonce];
    return typeof choix === 'string' ? choix : null;
}

async function noterMonChoix(annonce: string, choix: string): Promise<void> {
    const votes = await lireVotes();
    // Les plus anciens partent d'abord : un sondage clos depuis longtemps ne se relit plus.
    const suivants = Object.entries({ ...votes, [annonce]: choix }).slice(-GARDES);
    await AsyncStorage.setItem(CLE, JSON.stringify(Object.fromEntries(suivants))).catch(() => undefined);
}

/**
 * `vote` : compte, ou deja donne ; `clos` : le sondage ne s'ouvre plus ; `change` : ses choix ont change
 * depuis la lecture de l'annonce ; `echec` : a refaire plus tard.
 */
export type IssueDuVote = 'vote' | 'clos' | 'change' | 'echec';

export async function voter(annonce: string, choix: string): Promise<IssueDuVote> {
    noterUneQuestionDAvis();
    const resultat = await envoyerUneContribution({ sujet: 'sondage.choix', cible: annonce, valeur: choix });
    if (resultat.etat === 'acceptee' || (resultat.etat === 'refusee' && resultat.raison === 'deja_vote')) {
        await noterMonChoix(annonce, choix);
        return 'vote';
    }
    if (resultat.etat === 'refusee' && (resultat.raison === 'sondage_clos' || resultat.raison === 'cible_inconnue')) return 'clos';
    if (resultat.etat === 'refusee' && resultat.raison === 'valeur_invalide') return 'change';
    return 'echec';
}

/** Les resultats publics, ou `null` : la base injoignable, ou l'annonce retiree. */
export async function lireLesResultats(annonce: string, sondage: Sondage): Promise<ResultatsDeSondage | null> {
    const supabase = getSupabase();
    if (supabase === null) return null;
    const { data, error } = await appeler(supabase, 'resultats_sondage', { p_annonce: annonce });
    if (error !== null) {
        reportSupabaseFailure('resultats_sondage', describeSupabaseFailure(error));
        return null;
    }
    return lireResultats(data, sondage);
}
