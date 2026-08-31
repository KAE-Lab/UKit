/**
 * La couture de plateforme des visuels publies : le cache local et la lecture de la base.
 *
 * Deux regles, les memes que pour le referentiel des lieux et tentantes a violer de la meme facon :
 *
 *   - les accesseurs **ne touchent jamais au reseau**. Un service qui projette une liste n'attend pas
 *     une base pour choisir une photo ;
 *   - `refreshVisuels()` **ne leve jamais**. Elle rend un rapport. Un point de publication en panne
 *     ne doit pas devenir une application en panne — ici moins qu'ailleurs, puisque son echec ramene
 *     simplement les visuels des sources, qui sont deja ce que l'application montrait avant.
 *
 * Le cache existe pour la raison inverse de celle des lieux, et elle vaut d'etre dite : sans lui, une
 * photo retiree parce qu'elle etait fausse **reviendrait** au premier lancement hors ligne. La
 * derniere correction connue doit survivre a l'absence de reseau, sinon corriger ne veut rien dire.
 *
 * Voir docs/donnees-et-persistance.md et docs/backend.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '../supabase';
import { appliquerSurcouche, projeterVisuels, type TableVisuels } from './referentiel';

export { appliquerVisuel, nombreDeVisuels, visuelDe } from './referentiel';
export type { DomaineVisuel, TableVisuels } from './referentiel';

const TABLE = 'visuels';
const CLE_CACHE = 'visuels@1';
const COLONNES = 'domaine,cle,image_url';

/** Ce que rend un rafraichissement : un resultat, jamais une exception. */
export interface VisuelsReport {
    readonly ok: boolean;
    /** Le nombre de visuels surcouches, quand la lecture a abouti. */
    readonly visuels?: number;
    /** Pourquoi la surcouche n'a pas ete appliquee, en clair. */
    readonly reason?: string;
}

function lireCache(brut: string | null): TableVisuels | null {
    if (brut === null) return null;
    try {
        const contenu = JSON.parse(brut);
        return contenu !== null && typeof contenu === 'object' ? contenu : null;
    } catch {
        // Un cache illisible se jette sans bruit : les visuels des sources reprennent la main, ce qui
        // est l'etat par defaut du module.
        return null;
    }
}

/**
 * Installe la derniere surcouche connue, sans reseau.
 *
 * Appelee au demarrage, avant le premier rendu. Sans cache, aucune regle n'est installee — ce qui est
 * deja le cas a l'import du module.
 */
export async function loadVisuels(): Promise<void> {
    try {
        const surcouche = lireCache(await AsyncStorage.getItem(CLE_CACHE));
        if (surcouche !== null) appliquerSurcouche(surcouche);
    } catch (error) {
        console.warn(`[visuels] cache illisible : ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Va chercher la surcouche publiee et l'applique.
 *
 * Declenchee au demarrage et au retour au premier plan, comme les Blueprints et les lieux — jamais
 * dans le chemin d'un rendu. Une base injoignable laisse la surcouche en place : la derniere lue du
 * cache, ou aucune.
 *
 * Une lecture qui aboutit **remplace** la surcouche entiere plutot que de la fusionner. C'est ce qui
 * fait qu'une ligne retiree rend son visuel a la source, et c'est la seule facon d'annuler une
 * correction sans avoir a publier une correction de la correction.
 */
export async function refreshVisuels(): Promise<VisuelsReport> {
    const supabase = getSupabase();
    if (supabase === null) {
        return rapporter({ ok: false, reason: 'base non configuree' });
    }

    try {
        const { data, error } = await supabase.from(TABLE).select(COLONNES);
        if (error) {
            return rapporter({ ok: false, reason: error.message });
        }

        const surcouche = projeterVisuels(data ?? []);
        appliquerSurcouche(surcouche);
        await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(surcouche));
        return rapporter({ ok: true, visuels: Object.keys(surcouche).length });
    } catch (erreur) {
        return rapporter({ ok: false, reason: erreur instanceof Error ? erreur.message : String(erreur) });
    }
}

/**
 * Journalise le rapport, sans le transformer.
 *
 * C'est le seul canal d'observation du mecanisme, et c'est assume : une surcouche de visuels est
 * **invisible par construction** — les ecrans affichent la meme chose qu'elle soit appliquee ou non,
 * ce qui est precisement la propriete recherchee. Sans cette ligne, verifier sur un appareil qu'une
 * correction est bien arrivee demanderait de savoir a quoi ressemblait la photo d'avant.
 */
function rapporter(report: VisuelsReport): VisuelsReport {
    if (!report.ok) {
        console.warn(`[visuels] surcouche non appliquee : ${report.reason ?? 'sans detail'}`);
    } else if (__DEV__) {
        console.log(`[visuels] surcouche appliquee : ${report.visuels} visuel(s)`);
    }
    return report;
}
