/**
 * Les messages de service en notification push : le depot du jeton (jalon 6.1.x-E).
 *
 * La couture de plateforme : `expo-notifications` pour le jeton, `expo-device` pour distinguer un
 * simulateur, la base pour deposer — par deux fonctions SQL, jamais par la table (fonctions.sql).
 * La regle du redepot vit dans `inscription.ts`, pure.
 *
 * Ce module ne demande **jamais** la permission de notifications : c'est le geste de l'utilisateur
 * dans les Reglages — l'interrupteur des rappels ou celui des messages — qui la demande. Ici on lit
 * ce qui est, et on depose si tout est la : le reglage allume, un vrai appareil, la permission, un
 * jeton, une base. L'entretien appelle `deposerLeJeton` a chaque lancement et retour au premier plan.
 *
 * **`expo-notifications` se charge en import dynamique**, apres la garde Expo Go : son emetteur de
 * jetons leve sur Android des qu'on y touche depuis Expo Go, et l'exception remontait au chargement
 * des modules (shared/push/reception.ts).
 *
 * Voir docs/pilotage.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import type { SupabaseClient } from '@supabase/supabase-js';

import { contexteDeCiblage } from '../ciblage';
import { SettingsManager } from '../services/AppCore';
import { notificationsNatives } from '../services/notificationsNatives';
import { getSupabase } from '../supabase';
import type { Database } from '../supabase/types';
import { doitDeposer, estUnJeton, lireMemoire, type Inscription, type MemoireDeDepot } from './inscription';

type Fonctions = Database['public']['Functions'];

/**
 * L'appel d'une fonction SQL, type par `Args` de `types.ts`.
 *
 * Le client type par `Database` ne sait pas typer `rpc` : le schema du depot ne satisfait pas la
 * contrainte `GenericSchema` de supabase-js 2.109 — des `interface` de lignes sans signature d'index
 * —, et `from` y accepte deja n'importe quelle chaine (mesure le 2026-09-08, docs/backend.md,
 * limites). On garde le typage des arguments ici, et le client nu pour l'appel.
 */
function appeler<F extends keyof Fonctions>(client: SupabaseClient, fonction: F, args: Fonctions[F]['Args']) {
    return client.rpc(fonction, args);
}

const CLE_MEMOIRE = 'push@1';

export type { Inscription, MemoireDeDepot } from './inscription';

export type EtatDepot = 'depose' | 'inchange' | 'retire' | 'inactif' | 'expo-go' | 'simulateur' | 'sans-permission' | 'sans-base' | 'echec';

let dernierEtat: EtatDepot | null = null;

/** Le dernier etat du depot et sa memoire, pour le menu de developpement. */
export async function etatDuPush(): Promise<{ etat: EtatDepot | null; memoire: MemoireDeDepot | null }> {
    return { etat: dernierEtat, memoire: lireMemoire(await AsyncStorage.getItem(CLE_MEMOIRE)) };
}

function fin(etat: EtatDepot): EtatDepot {
    dernierEtat = etat;
    if (__DEV__) console.info(`[push] ${etat}`);
    return etat;
}

async function jetonExpo(): Promise<string | null> {
    const Notifications = await notificationsNatives();
    if (Notifications === null) return null;
    const extra = (Constants.expoConfig?.extra ?? {}) as { eas?: { projectId?: unknown } };
    const projectId = typeof extra.eas?.projectId === 'string' ? extra.eas.projectId : undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId === undefined ? undefined : { projectId });
    return estUnJeton(data) ? data : null;
}

/** La permission telle qu'elle est, sans jamais la demander — et sans charger le module sous Expo Go. */
async function permissionAccordee(): Promise<boolean> {
    const Notifications = await notificationsNatives();
    return Notifications !== null && (await Notifications.getPermissionsAsync()).status === 'granted';
}

/** Depose le jeton si tout est la ; retire ce qui a ete depose si le reglage est eteint. Ne leve jamais. */
export async function deposerLeJeton(): Promise<EtatDepot> {
    if (!SettingsManager.getMessagesEnNotification()) return retirerLeJeton();
    // Expo Go ne porte plus les notifications distantes depuis le SDK 53 : un build est necessaire.
    if (isRunningInExpoGo()) return fin('expo-go');
    if (!Device.isDevice) return fin('simulateur');
    if (!(await permissionAccordee())) {
        // La permission a pu etre **retiree** dans les reglages du systeme apres un depot. Le jeton
        // resterait alors en base, et chaque envoi croirait atteindre un appareil qui n'affichera
        // rien : la console compterait un appareil vise de trop, et le service d'envoi ne le saurait
        // jamais — il accepte le message sans pouvoir dire ce que le systeme en fait. On le retire
        // donc ici, la ou on l'apprend (mesure sur iPhone le 2026-09-08).
        await retirerLeJeton();
        return fin('sans-permission');
    }
    const supabase = getSupabase();
    if (supabase === null) return fin('sans-base');

    try {
        const jeton = await jetonExpo();
        const contexte = contexteDeCiblage();
        if (jeton === null || contexte.plateforme === 'inconnue' || contexte.version === null) return fin('echec');
        const inscription: Inscription = {
            jeton, plateforme: contexte.plateforme, etablissement: contexte.etablissement, version: contexte.version, testeur: contexte.testeur,
        };
        const memoire = lireMemoire(await AsyncStorage.getItem(CLE_MEMOIRE));
        if (!doitDeposer(memoire, inscription, Date.now())) return fin('inchange');

        const { error } = await appeler(supabase, 'deposer_jeton', {
            p_jeton: inscription.jeton, p_plateforme: inscription.plateforme, p_etablissement: inscription.etablissement,
            p_version: inscription.version, p_testeur: inscription.testeur,
        });
        if (error) throw new Error(error.message);
        await AsyncStorage.setItem(CLE_MEMOIRE, JSON.stringify({ inscription, at: Date.now() } satisfies MemoireDeDepot));
        return fin('depose');
    } catch (erreur) {
        console.warn(`[push] depot impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return fin('echec');
    }
}

/** Retire de la base ce qui y a ete depose, et oublie la memoire. Le geste de l'interrupteur. */
export async function retirerLeJeton(): Promise<EtatDepot> {
    const memoire = lireMemoire(await AsyncStorage.getItem(CLE_MEMOIRE));
    if (memoire === null) return fin('inactif');
    const supabase = getSupabase();
    if (supabase === null) return fin('sans-base');
    try {
        const { error } = await appeler(supabase, 'retirer_jeton', { p_jeton: memoire.inscription.jeton });
        if (error) throw new Error(error.message);
        await AsyncStorage.removeItem(CLE_MEMOIRE);
        return fin('retire');
    } catch (erreur) {
        console.warn(`[push] retrait impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return fin('echec');
    }
}
