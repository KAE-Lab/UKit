/**
 * La couture de plateforme des messages de service : la lecture de la base, le cache local, et ce
 * qui previent l'ecran.
 *
 * Meme forme que les salutations, et pour les memes raisons : un **cache** pour qu'un incident en
 * cours se montre des le lancement, meme sans reseau ou avant que la base ne reponde ; une lecture
 * qui **ne leve jamais** et n'est pas attendue — elle part du demarrage et du retour au premier
 * plan, jamais du chemin d'un rendu (`shared/navigation/rootContainer.tsx`).
 *
 * Il n'y a pas de socle embarque, et c'est normal : un message de service est par nature quelque
 * chose qu'on ne connaissait pas a la construction du binaire. Sans base, il n'y a rien a dire.
 *
 * Voir docs/pilotage.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../supabase';
import { rafraichirStatutTesteur } from '../testeur';
import { projeterMessages, type MessageDeService } from './projection';
import { chargerVus, elaguerVus, marquerVu } from './vus';

export { choisirPresentation, messagesVisibles, RIEN_A_MONTRER } from './presentation';
export type { Presentation } from './presentation';
export type { MessageDeService, NiveauDeMessage } from './projection';
export { chargerVus, oublierVus, vusConnus } from './vus';

const TABLE = 'service_messages';
/** Versionnee comme les autres caches : elle garde des lignes brutes, et leur forme peut changer. */
const CLE_CACHE = 'messages@1';
const COLONNES = 'id,cle,niveau,titre,corps,actif,publie_le,expire_le,audience,etablissements,version_min,version_max';

/** Ce que rend un rafraichissement : un resultat, jamais une exception. */
export interface RapportMessages {
    readonly ok: boolean;
    readonly messages?: number;
    readonly reason?: string;
    /** L'heure de la lecture, en clair, pour le panneau de developpement. */
    readonly quand: string;
}

let connus: readonly MessageDeService[] = [];
let dernierRapport: RapportMessages | null = null;
const abonnes = new Set<() => void>();

/** Les messages tels que le module les connait — du cache, puis de la base. Tous, vus compris. */
export function messagesConnus(): readonly MessageDeService[] {
    return connus;
}

export function dernierRapportMessages(): RapportMessages | null {
    return dernierRapport;
}

/** Previent a chaque changement de ce qui est connu ; rend la fonction de desabonnement. */
export function onMessages(abonne: () => void): () => void {
    abonnes.add(abonne);
    return () => { abonnes.delete(abonne); };
}

function prevenir(): void {
    abonnes.forEach((abonne) => abonne());
}

/**
 * Ferme un message : le marque « vu » et previent ce qui l'affiche. C'est le **seul** geste qui
 * marque vu — la croix du bandeau, le bouton de la feuille —, jamais l'affichage.
 */
export async function fermerMessage(cle: string): Promise<void> {
    await marquerVu(cle);
    prevenir();
}

/**
 * Installe le cache **et la memoire des vus**, sans reseau. Appele au demarrage, avant le premier
 * rendu. Les deux ensemble, parce que l'un sans l'autre est le defaut mesure sur appareil : des
 * messages connus sans savoir lesquels ont ete fermes, c'est trois messages qui reviennent.
 */
export async function chargerMessages(): Promise<void> {
    await chargerVus();
    try {
        const brut = await AsyncStorage.getItem(CLE_CACHE);
        if (brut === null) return;
        connus = projeterMessages(JSON.parse(brut));
        prevenir();
    } catch (erreur) {
        // Un cache illisible se jette sans bruit : il n'y a pas de socle, donc rien a montrer, ce qui
        // est l'etat par defaut du module.
        console.warn(`[messages] cache illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

function heure(): string {
    // L'heure reelle, pas la simulee : c'est une trace de diagnostic (shared/services/Temps.ts).
    return new Date().toTimeString().slice(0, 8);
}

function rapporter(rapport: RapportMessages): RapportMessages {
    dernierRapport = rapport;
    if (!rapport.ok) {
        console.warn(`[messages] non rafraichis : ${rapport.reason ?? 'sans detail'}`);
    } else if (__DEV__) {
        console.log(`[messages] ${rapport.messages} message(s) en ligne`);
    }
    prevenir();
    return rapport;
}

/**
 * Le statut de testeur d'abord, les messages ensuite.
 *
 * Dans cet ordre parce que le premier decide de ce que le second laisse voir. Une lecture qui
 * aboutit **remplace** ce qui etait connu — un message retire disparait — et elague la memoire des
 * vus, ce qu'un cache n'a pas le droit de faire.
 */
export async function rafraichirMessages(): Promise<RapportMessages> {
    await rafraichirStatutTesteur();

    const supabase = getSupabase();
    if (supabase === null) {
        return rapporter({ ok: false, reason: 'base non configuree', quand: heure() });
    }

    try {
        const { data, error } = await supabase.from(TABLE).select(COLONNES);
        if (error) {
            reportSupabaseFailure(TABLE, describeSupabaseFailure(error));
            return rapporter({ ok: false, reason: error.message, quand: heure() });
        }

        const lignes = data ?? [];
        connus = projeterMessages(lignes);
        await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(lignes));
        await elaguerVus(new Set(connus.map((message) => message.cle)));
        return rapporter({ ok: true, messages: connus.length, quand: heure() });
    } catch (erreur) {
        return rapporter({ ok: false, reason: erreur instanceof Error ? erreur.message : String(erreur), quand: heure() });
    }
}
