/**
 * Les problemes connus (lot 3) : ce que l'equipe publie depuis la console, montre avant d'envoyer un bug,
 * avec « moi aussi », qui joint la plateforme, le modele, le systeme et la version. Le mecanisme — la
 * lecture, le cache, les votes gardes sur l'appareil — est celui de la boite a idees (`suivis.ts`).
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { versionApplication } from '../ciblage/contexte';
import type { ResultatDeContribution } from '../communaute';
import { contexteDuVote, lireProbleme, type ProblemeConnu } from './donnees';
import { direMoiAussiSur, lireLesLignes, lireLesVotes, type GenreDeSuivi } from './suivis';

const PROBLEMES: GenreDeSuivi = {
    table: 'problemes_connus',
    colonnes: 'id, titre, detail, statut, plateformes, version_corrigee, maj_le',
    statuts: ['publie', 'corrige'],
    cache: 'problemes-connus@1',
    votes: 'problemes-votes@1',
    sujet: 'probleme.moi_aussi',
};

/** Les problemes publies pour cette plateforme ; une base injoignable rend la derniere liste lue. */
export async function lireLesProblemes(maintenant: number = Date.now()): Promise<ProblemeConnu[]> {
    return (await lireLesLignes(PROBLEMES)).map((l) => lireProbleme(l, Platform.OS, maintenant)).filter((p): p is ProblemeConnu => p !== null);
}

export function lireVotes(): Promise<string[]> {
    return lireLesVotes(PROBLEMES);
}

export type { ProblemeConnu };

/**
 * « Moi aussi » sur un probleme. Rend le resultat de la contribution, ou `null` quand l'appareil ne se
 * nomme pas assez pour remplir la forme du vote.
 */
export async function direMoiAussi(id: string): Promise<ResultatDeContribution | null> {
    const systeme = [Device.osName, Device.osVersion].filter((p) => typeof p === 'string' && p !== '').join(' ');
    const valeur = contexteDuVote(Platform.OS === 'ios' ? 'ios' : 'android', Device.modelName, systeme, versionApplication());
    if (valeur === null) return null;
    return direMoiAussiSur(PROBLEMES, id, valeur);
}
