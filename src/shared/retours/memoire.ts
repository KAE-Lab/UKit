/**
 * Ce que l'appareil garde des retours (lot 3), dans AsyncStorage : « Mes retours », la boite d'envoi, le
 * brouillon, la memoire de la proposition apres une capture et les « moi aussi » donnes. Chaque lecture
 * est defensive — une valeur illisible vaut une liste vide, jamais une exception — et chaque ecriture
 * de « Mes retours » le diffuse, pour la pastille et l'ecran.
 *
 * Une reinitialisation de l'application efface tout, cles de reponse comprises : un retour d'avant ne
 * se relit plus (limite ecrite, docs/phase-8/3-formulaire.md).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

import type { MemoireDeProposition, NatureDeRetour, RetourConnu, RetourEnAttente } from './donnees';

const CLE_CONNUS = 'retours-connus@1';
const CLE_BOITE = 'retours-a-envoyer@1';
const CLE_BROUILLON = 'retours-brouillon@1';
const CLE_PROPOSITION = 'retours-proposition@1';
const CLE_LECTURE = 'retours-lecture@1';
const CLE_VOTES = 'problemes-votes@1';

/** Diffuse apres chaque ecriture de « Mes retours ». */
export const EVENEMENT_RETOURS = 'retoursChanges';

async function lireJson<T>(cle: string, defaut: T, valide: (brut: unknown) => boolean): Promise<T> {
    try {
        const brut: unknown = JSON.parse((await AsyncStorage.getItem(cle)) ?? 'null');
        return valide(brut) ? brut as T : defaut;
    } catch {
        return defaut;
    }
}

async function ecrireJson(cle: string, valeur: unknown): Promise<void> {
    try {
        await AsyncStorage.setItem(cle, JSON.stringify(valeur));
    } catch (erreur) {
        console.warn(`[retours] ${cle} non ecrit : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

const estListe = (brut: unknown) => Array.isArray(brut);

let connus: RetourConnu[] | null = null;

export async function lireConnus(): Promise<RetourConnu[]> {
    connus ??= (await lireJson<unknown[]>(CLE_CONNUS, [], estListe))
        .filter((r): r is RetourConnu => typeof r === 'object' && r !== null && typeof (r as RetourConnu).local === 'string' && Array.isArray((r as RetourConnu).reponses));
    return connus;
}

/** Le dernier etat connu, sans attendre : vide tant que rien n'a ete lu. */
export function connusEnMemoire(): readonly RetourConnu[] {
    return connus ?? [];
}

async function ecrireConnus(liste: RetourConnu[]): Promise<void> {
    connus = liste;
    await ecrireJson(CLE_CONNUS, liste);
    DeviceEventEmitter.emit(EVENEMENT_RETOURS, liste);
}

let connusEnEcriture: Promise<unknown> = Promise.resolve();

/** Modifie « Mes retours », une modification a la fois, pour la meme raison que la boite. */
export function modifierConnus(modifier: (liste: RetourConnu[]) => RetourConnu[]): Promise<RetourConnu[]> {
    const suivante = connusEnEcriture.then(async () => {
        const liste = modifier(await lireConnus());
        await ecrireConnus(liste);
        return liste;
    });
    connusEnEcriture = suivante.catch(() => undefined);
    return suivante;
}

export function lireBoite(): Promise<RetourEnAttente[]> {
    return lireJson<RetourEnAttente[]>(CLE_BOITE, [], estListe);
}

let boiteEnEcriture: Promise<unknown> = Promise.resolve();

/**
 * Modifie la boite d'envoi, une modification a la fois : un depot qui s'ajoute pendant qu'un vidage en
 * retire un autre ne doit perdre ni l'un ni l'autre.
 */
export function modifierBoite(modifier: (boite: RetourEnAttente[]) => RetourEnAttente[]): Promise<void> {
    const suivante = boiteEnEcriture.then(async () => ecrireJson(CLE_BOITE, modifier(await lireBoite())));
    boiteEnEcriture = suivante.catch(() => undefined);
    return suivante;
}

/** Ce que l'etudiant a commence a ecrire, retrouve a la reouverture du formulaire. */
export interface Brouillon {
    readonly nature: NatureDeRetour;
    readonly texte: string;
    readonly campus: string;
    readonly volontaire: boolean;
    readonly contact: string;
}

export function lireBrouillon(): Promise<Brouillon | null> {
    return lireJson<Brouillon | null>(CLE_BROUILLON, null, (b) => typeof b === 'object' && b !== null && typeof (b as Brouillon).texte === 'string');
}

export function ecrireBrouillon(brouillon: Brouillon | null): Promise<void> {
    if (brouillon === null) return AsyncStorage.removeItem(CLE_BROUILLON).catch(() => undefined);
    return ecrireJson(CLE_BROUILLON, brouillon);
}

export function lireProposition(): Promise<MemoireDeProposition> {
    return lireJson<MemoireDeProposition>(CLE_PROPOSITION, { jour: null, jamais: false }, (m) => typeof m === 'object' && m !== null);
}

export function ecrireProposition(memoire: MemoireDeProposition): Promise<void> {
    return ecrireJson(CLE_PROPOSITION, memoire);
}

export async function derniereLecture(): Promise<number> {
    const at = Number(await AsyncStorage.getItem(CLE_LECTURE).catch(() => null));
    return Number.isFinite(at) ? at : 0;
}

export function noterLecture(at: number): Promise<void> {
    return AsyncStorage.setItem(CLE_LECTURE, String(at)).catch(() => undefined);
}

export function lireVotes(): Promise<string[]> {
    return lireJson<string[]>(CLE_VOTES, [], estListe);
}

export async function noterVote(id: string): Promise<string[]> {
    const votes = await lireVotes();
    const suivants = votes.includes(id) ? votes : [...votes, id].slice(-200);
    await ecrireJson(CLE_VOTES, suivants);
    return suivants;
}
