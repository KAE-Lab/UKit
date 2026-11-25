/**
 * Les problemes connus (lot 3) : ce que l'equipe publie depuis la console, montre avant d'envoyer un bug,
 * avec « moi aussi » — un vote de la communaute, un par appareil, qui joint la plateforme, le modele, le
 * systeme et la version. La lecture est anonyme et garde la derniere liste pour le hors-ligne ; les
 * « moi aussi » donnes se gardent sur l'appareil, qui n'a pas d'autre moyen de s'en souvenir : un vote ne
 * porte aucun identifiant (docs/phase-8/README.md, vie privee).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { versionApplication } from '../ciblage/contexte';
import { envoyerUneContribution, type ResultatDeContribution } from '../communaute';
import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../supabase';
import { contexteDuVote, lireProbleme, type ProblemeConnu } from './donnees';
import { lireVotes, noterVote } from './memoire';

const COLONNES = 'id, titre, detail, statut, plateformes, version_corrigee, maj_le';
const CLE_CACHE = 'problemes-connus@1';

function trier(lignes: readonly unknown[], maintenant: number): ProblemeConnu[] {
    return lignes.map((l) => lireProbleme(l, Platform.OS, maintenant)).filter((p): p is ProblemeConnu => p !== null);
}

/** Les problemes publies pour cette plateforme ; une base injoignable rend la derniere liste lue. */
export async function lireLesProblemes(maintenant: number = Date.now()): Promise<ProblemeConnu[]> {
    const cache = async () => {
        try {
            const brut: unknown = JSON.parse((await AsyncStorage.getItem(CLE_CACHE)) ?? '[]');
            return Array.isArray(brut) ? trier(brut, maintenant) : [];
        } catch {
            return [];
        }
    };
    const supabase = getSupabase();
    if (supabase === null) return cache();
    const { data, error } = await supabase.from('problemes_connus').select(COLONNES).in('statut', ['publie', 'corrige'])
        .order('maj_le', { ascending: false }).limit(50);
    if (error !== null) {
        reportSupabaseFailure('problemes_connus', describeSupabaseFailure(error));
        return cache();
    }
    const lignes = (data ?? []) as unknown[];
    await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(lignes)).catch(() => undefined);
    return trier(lignes, maintenant);
}

export { lireVotes };
export type { ProblemeConnu };

/**
 * « Moi aussi » sur un probleme : la contribution part, et l'appareil s'en souvient si elle est acceptee
 * ou deja donnee. Rend le resultat de la contribution, ou `null` quand l'appareil ne se nomme pas assez
 * pour remplir la forme du vote.
 */
export async function direMoiAussi(id: string): Promise<ResultatDeContribution | null> {
    const systeme = [Device.osName, Device.osVersion].filter((p) => typeof p === 'string' && p !== '').join(' ');
    const valeur = contexteDuVote(Platform.OS === 'ios' ? 'ios' : 'android', Device.modelName, systeme, versionApplication());
    if (valeur === null) return null;
    const resultat = await envoyerUneContribution({ sujet: 'probleme.moi_aussi', cible: id, valeur });
    if (resultat.etat === 'acceptee' || (resultat.etat === 'refusee' && resultat.raison === 'deja_vote')) await noterVote(id);
    return resultat;
}
