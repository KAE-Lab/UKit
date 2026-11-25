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
 * Rien ici ne part au demarrage : les lots suivants appellent ces fonctions depuis leurs ecrans.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase, describeSupabaseFailure, reportSupabaseFailure } from '../supabase';
import { assertion, identiteDeLAppareil, jetonPlayIntegrity, oublierLaCleAppAttest, type Identite } from './appareil';
import {
    COLONNES, depuis, ecrireCache, fusionner, jourDeParis, lireCache, lireResultat, lireSignalement, serialiserDonnees,
    type Contribution, type ResultatDeContribution, type Signalement,
} from './donnees';
import { appelerLaFonction, demanderUnDefi } from './fonction';

export { capacites } from './appareil';
export type { Contribution, Famille, Poids, ResultatDeContribution, Signalement, StatutDeSignalement } from './donnees';
export { etatDUnLieu, finDeValidite, REGLAGES, type EtatDeLaCommunaute, type EtatDUnLieu, type Reglages } from './etat';

/** `{ jour, curseur, lignes }` : les signalements du jour de Paris, tels que la base les rend. */
const CLE_CACHE = 'communaute-signalements@1';
/** PostgREST plafonne ses reponses : on lit par pages, dans un ordre stable. */
const TAILLE_DE_PAGE = 1000;

// ---------------------------------------------------------------------------
// L'envoi
// ---------------------------------------------------------------------------

async function corpsDeLaDemande(identite: Identite, donnees: string): Promise<Record<string, unknown> | null> {
    if (identite.nature === 'app_attest') {
        const signee = await assertion(identite.cle, donnees);
        return signee === null ? null : { action: 'contribuer', donnees, appareil: { nature: 'app_attest', cle: identite.cle }, preuve: { assertion: signee } };
    }
    const jeton = identite.plateforme === 'android' ? await jetonPlayIntegrity(donnees) : null;
    return {
        action: 'contribuer',
        donnees,
        appareil: { nature: 'secret', plateforme: identite.plateforme, secret: identite.secret },
        preuve: jeton === null ? null : { jeton },
    };
}

async function unEnvoi(contribution: Contribution, essai: boolean): Promise<ResultatDeContribution> {
    const defi = await demanderUnDefi();
    if (defi === null) return getSupabase() === null ? { etat: 'sans-base' } : { etat: 'echec', raison: 'defi' };
    const identite = await identiteDeLAppareil();
    const donnees = serialiserDonnees(defi, identite.cle, contribution, essai);
    const corps = await corpsDeLaDemande(identite, donnees);
    // Une cle App Attest devenue inutilisable a ete oubliee : l'envoi suivant partira par le secret.
    if (corps === null) return { etat: 'a-refaire', raison: 'assertion' };
    const reponse = await appelerLaFonction(corps);
    return reponse === null ? { etat: 'sans-base' } : lireResultat(reponse.statut, reponse.corps);
}

let envoiEnCours: Promise<unknown> = Promise.resolve();

/**
 * Envoie une contribution. Une cle App Attest que la base ne connait plus se reenregistre, et une
 * assertion devancee se refait : une fois chacune, jamais en boucle. `essai` joue tout sans rien
 * ecrire d'autre que l'appareil — le menu de developpement et le protocole sur telephone. Les envois
 * se suivent, un a la fois : deux assertions simultanees se disputeraient le compteur.
 */
export function envoyerUneContribution(contribution: Contribution, options: { readonly essai?: boolean } = {}): Promise<ResultatDeContribution> {
    const essai = options.essai === true;
    const envoi = envoiEnCours.then(async () => {
        const premier = await unEnvoi(contribution, essai);
        if (premier.etat !== 'a-refaire') return premier;
        if (premier.raison === 'appareil_inconnu') await oublierLaCleAppAttest('enregistrement');
        if (premier.raison === 'assertion') await oublierLaCleAppAttest('tout');
        const second = await unEnvoi(contribution, essai);
        return second.etat === 'a-refaire' ? { etat: 'echec', raison: second.raison } as const : second;
    });
    envoiEnCours = envoi.catch(() => undefined);
    return envoi;
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

    const aPartirDe = depuis(cache);
    const lues: Signalement[] = [];
    for (let debut = 0; ; debut += TAILLE_DE_PAGE) {
        let requete = supabase.from('signalements').select(COLONNES).order('maj_le').order('id').range(debut, debut + TAILLE_DE_PAGE - 1);
        if (aPartirDe !== null) requete = requete.gte('maj_le', aPartirDe);
        const { data, error } = await requete;
        if (error !== null) {
            reportSupabaseFailure('signalements', describeSupabaseFailure(error));
            return { etat: 'cache', signalements: cache.signalements };
        }
        const page = (data ?? []) as unknown[];
        for (const ligne of page) {
            const lue = lireSignalement(ligne);
            if (lue !== null) lues.push(lue);
        }
        if (page.length < TAILLE_DE_PAGE) break;
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
