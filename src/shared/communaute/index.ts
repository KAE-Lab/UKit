/**
 * La communaute, porte d'entree (phase 8, lot 1 de la 7.0 ; docs/phase-8/1-base-communautaire.md) :
 * envoyer une contribution, lire les signalements du jour, et l'etat d'un lieu qu'on en tire.
 *
 * **L'ecriture** passe par la fonction `communaute`, jamais par une table : un defi, le texte exact
 * signe par la cle App Attest ou fait attester par Play Integrity, puis la base qui juge les plafonds
 * et le poids. **La lecture** prend tous les signalements du jour, pour tous les lieux, et les trie ici :
 * la base ne sait pas quel lieu l'etudiant regarde, ni quel campus il a choisi. Elle ne redemande que ce
 * qui a bouge depuis la lecture precedente, et garde le jour en cache pour le hors-ligne.
 *
 * Rien ici ne part au demarrage : les lots suivants appellent ces fonctions depuis leurs ecrans. Le
 * formulaire de retour (lot 3) passe par le meme envoi signe, `envoyerSigne`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase, describeSupabaseFailure, reportSupabaseFailure } from '../supabase';
import { assertion, identiteDeLAppareil, jetonPlayIntegrity, oublierLaCleAppAttest, type Identite } from './appareil';
import { COLONNES_OFFICIELS, lireEtatOfficiel, type EtatOfficiel } from './lieu';
import {
    COLONNES, depuis, ecrireCache, fusionner, jourDeParis, lireCache, lireResultat, lireSignalement, serialiserDonnees,
    type Contribution, type ResultatDeContribution, type Signalement,
} from './donnees';
import { appelerLaFonction, demanderUnDefi } from './fonction';

export { capacites } from './appareil';
export { classement, lireLeLieu, nomDePlat, type EtatDuSujet, type EtatOfficiel, type PlatClasse } from './lieu';
export type { Contribution, Famille, Poids, ResultatDeContribution, Signalement, StatutDeSignalement } from './donnees';
export { etatDUnLieu, finDeValidite, REGLAGES, type EtatDeLaCommunaute, type EtatDUnLieu, type Reglages } from './etat';

/** `{ jour, curseur, lignes }` : les signalements du jour de Paris, tels que la base les rend. */
const CLE_CACHE = 'communaute-signalements@1';
/** Les etats officiels valables a la derniere lecture, tels que la base les rend (lot 2). */
const CLE_CACHE_OFFICIELS = 'communaute-officiels@1';
/** PostgREST plafonne ses reponses : on lit par pages, dans un ordre stable. */
const TAILLE_DE_PAGE = 1000;

// ---------------------------------------------------------------------------
// L'envoi
// ---------------------------------------------------------------------------

async function corpsDeLaDemande(action: ActionSignee, identite: Identite, donnees: string): Promise<Record<string, unknown> | null> {
    if (identite.nature === 'app_attest') {
        const signee = await assertion(identite.cle, donnees);
        return signee === null ? null : { action, donnees, appareil: { nature: 'app_attest', cle: identite.cle }, preuve: { assertion: signee } };
    }
    const jeton = identite.plateforme === 'android' ? await jetonPlayIntegrity(donnees) : null;
    return {
        action,
        donnees,
        appareil: { nature: 'secret', plateforme: identite.plateforme, secret: identite.secret },
        preuve: jeton === null ? null : { jeton },
    };
}

/** Ce qui se prouve par l'appareil : une contribution, ou un retour natif (lot 3). */
export type ActionSignee = 'contribuer' | 'deposer';

/** Ce qu'un envoi signe est devenu, et le corps de la reponse, quand il y en a une. */
export interface IssueDEnvoi {
    readonly resultat: ResultatDeContribution;
    readonly corps: unknown;
}

async function unEnvoi(action: ActionSignee, serialiser: (defi: string, cle: string) => string): Promise<IssueDEnvoi> {
    if (getSupabase() === null) return { resultat: { etat: 'sans-base' }, corps: null };
    // L'identite d'abord : enregistrer une cle App Attest passe par Apple, et le defi ne vaut que
    // cinq minutes.
    const identite = await identiteDeLAppareil();
    const defi = await demanderUnDefi();
    if (defi === null) return { resultat: { etat: 'echec', raison: 'defi' }, corps: null };
    const corps = await corpsDeLaDemande(action, identite, serialiser(defi, identite.cle));
    // Une cle App Attest devenue inutilisable a ete oubliee : l'envoi suivant partira par le secret.
    if (corps === null) return { resultat: { etat: 'a-refaire', raison: 'assertion' }, corps: null };
    const reponse = await appelerLaFonction(corps);
    return reponse === null ? { resultat: { etat: 'sans-base' }, corps: null } : { resultat: lireResultat(reponse.statut, reponse.corps), corps: reponse.corps };
}

let envoiEnCours: Promise<unknown> = Promise.resolve();

/**
 * Envoie un texte signe par l'appareil, que `serialiser` ecrit a partir du defi et de la cle serveur.
 * Une cle App Attest que la base ne connait plus se reenregistre, et une assertion devancee se refait :
 * une fois chacune, jamais en boucle. Les envois se suivent, un a la fois, contributions et retours
 * confondus : deux assertions simultanees se disputeraient le compteur.
 */
export function envoyerSigne(action: ActionSignee, serialiser: (defi: string, cle: string) => string): Promise<IssueDEnvoi> {
    const envoi = envoiEnCours.then(async (): Promise<IssueDEnvoi> => {
        const premier = await unEnvoi(action, serialiser);
        if (premier.resultat.etat !== 'a-refaire') return premier;
        if (premier.resultat.raison === 'appareil_inconnu') await oublierLaCleAppAttest('enregistrement');
        if (premier.resultat.raison === 'assertion') await oublierLaCleAppAttest('tout');
        const second = await unEnvoi(action, serialiser);
        return second.resultat.etat === 'a-refaire' ? { resultat: { etat: 'echec', raison: second.resultat.raison }, corps: second.corps } : second;
    });
    envoiEnCours = envoi.catch(() => undefined);
    return envoi;
}

/**
 * Envoie une contribution. `essai` joue tout sans rien ecrire d'autre que l'appareil — le menu de
 * developpement et le protocole sur telephone.
 */
export async function envoyerUneContribution(contribution: Contribution, options: { readonly essai?: boolean } = {}): Promise<ResultatDeContribution> {
    const essai = options.essai === true;
    return (await envoyerSigne('contribuer', (defi, cle) => serialiserDonnees(defi, cle, contribution, essai))).resultat;
}

// ---------------------------------------------------------------------------
// La lecture
// ---------------------------------------------------------------------------

export interface LectureDuJour {
    /** `ok` : la base a repondu ; `cache` : elle n'a pas repondu, voici ce que l'appareil savait. */
    readonly etat: 'ok' | 'cache' | 'sans-base';
    readonly signalements: readonly Signalement[];
}

let lectureEnCours: Promise<LectureDuJour> | null = null;

async function lire(maintenant: Date): Promise<LectureDuJour> {
    const jour = jourDeParis(maintenant);
    const cache = lireCache(await AsyncStorage.getItem(CLE_CACHE).catch(() => null), jour);
    const supabase = getSupabase();
    if (supabase === null) return { etat: 'sans-base', signalements: cache.signalements };

    // Les pages se suivent par le curseur, pas par un decalage : une ligne qui change de `maj_le`
    // pendant la lecture passe plus loin, au lieu de decaler les suivantes et d'en faire sauter une.
    let aPartirDe = depuis(cache);
    const lues: Signalement[] = [];
    for (;;) {
        let requete = supabase.from('signalements').select(COLONNES).order('maj_le').order('id').limit(TAILLE_DE_PAGE);
        if (aPartirDe !== null) requete = requete.gte('maj_le', aPartirDe);
        const { data, error } = await requete;
        if (error !== null) {
            reportSupabaseFailure('signalements', describeSupabaseFailure(error));
            return { etat: 'cache', signalements: cache.signalements };
        }
        const page = (data ?? []) as Array<{ maj_le?: unknown }>;
        for (const ligne of page) {
            const lue = lireSignalement(ligne);
            if (lue !== null) lues.push(lue);
        }
        const suivant = page[page.length - 1]?.maj_le;
        // Une page pleine sur un seul instant ne ferait plus avancer le curseur : on s'arrete la.
        if (page.length < TAILLE_DE_PAGE || typeof suivant !== 'string' || suivant === aPartirDe) break;
        aPartirDe = suivant;
    }
    const neuf = fusionner(cache, lues);
    await AsyncStorage.setItem(CLE_CACHE, ecrireCache(neuf)).catch(() => undefined);
    return { etat: 'ok', signalements: neuf.signalements };
}

/**
 * Les signalements du jour, tous lieux confondus, a filtrer sur l'appareil par `etatDUnLieu`. Deux
 * appels simultanes partagent la meme lecture. Ne leve jamais : une base injoignable rend le cache.
 */
export function lireLesSignalementsDuJour(maintenant: Date = new Date()): Promise<LectureDuJour> {
    lectureEnCours ??= lire(maintenant)
        .catch((): LectureDuJour => ({ etat: 'cache', signalements: [] }))
        .finally(() => {
            lectureEnCours = null;
        });
    return lectureEnCours;
}

// ---------------------------------------------------------------------------
// Les etats officiels (lot 2)
// ---------------------------------------------------------------------------

export interface LectureDesOfficiels {
    readonly etat: 'ok' | 'cache' | 'sans-base';
    readonly officiels: readonly EtatOfficiel[];
}

function relireLeCache(texte: string | null, maintenant: number): readonly EtatOfficiel[] {
    if (texte === null) return [];
    try {
        const lignes = JSON.parse(texte) as unknown;
        if (!Array.isArray(lignes)) return [];
        return lignes.map(lireEtatOfficiel).filter((o): o is EtatOfficiel => o !== null && o.expireLe > maintenant);
    } catch {
        return [];
    }
}

let officielsEnCours: Promise<LectureDesOfficiels> | null = null;

async function lireOfficiels(maintenant: number): Promise<LectureDesOfficiels> {
    const cache = relireLeCache(await AsyncStorage.getItem(CLE_CACHE_OFFICIELS).catch(() => null), maintenant);
    const supabase = getSupabase();
    if (supabase === null) return { etat: 'sans-base', officiels: cache };
    // Tous ceux qui valent encore, en une page : l'equipe en publie quelques-uns, jamais des milliers.
    // Une relecture entiere, et non par curseur : un etat retire est supprime, et seule son absence le dit.
    const { data, error } = await supabase.from('etats_officiels').select(COLONNES_OFFICIELS).order('cree_le').limit(TAILLE_DE_PAGE);
    if (error !== null) {
        reportSupabaseFailure('etats_officiels', describeSupabaseFailure(error));
        return { etat: 'cache', officiels: cache };
    }
    const lignes = (data ?? []) as unknown[];
    await AsyncStorage.setItem(CLE_CACHE_OFFICIELS, JSON.stringify(lignes)).catch(() => undefined);
    return { etat: 'ok', officiels: lignes.map(lireEtatOfficiel).filter((o): o is EtatOfficiel => o !== null) };
}

/** Les etats officiels qui valent encore, tous lieux confondus. Ne leve jamais : une base injoignable rend le cache. */
export function lireLesEtatsOfficiels(maintenant: number = Date.now()): Promise<LectureDesOfficiels> {
    officielsEnCours ??= lireOfficiels(maintenant)
        .catch((): LectureDesOfficiels => ({ etat: 'cache', officiels: [] }))
        .finally(() => {
            officielsEnCours = null;
        });
    return officielsEnCours;
}
