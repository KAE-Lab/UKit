/**
 * La couture de plateforme du referentiel des lieux : le cache local et la lecture de la base.
 *
 * Deux regles, calquees sur le registre des Blueprints et tentantes a violer de la meme facon :
 *
 *   - les accesseurs **ne touchent jamais au reseau**. Un rendu n'attend pas une base pour placer un
 *     marqueur sur une carte ;
 *   - `refreshBuildings()` **ne leve jamais**. Elle rend un rapport. Un point de publication en panne
 *     ne doit pas devenir une application en panne.
 *
 * Le cache existe pour une raison precise : au second lancement hors ligne, la derniere surcouche
 * connue vaut mieux que le socle seul — un horaire corrige la veille ne doit pas redevenir faux
 * parce que l'avion est en mode avion.
 *
 * Voir docs/donnees-et-persistance.md et docs/backend.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '../supabase';
import { appliquerSurcouche, projeterBatiment, type BuildingRef } from './referentiel';

export { allBuildingRefs, getBuildingRef } from './referentiel';
export type { BuildingRef, BuildingSchedule } from './referentiel';

const TABLE = 'batiments';
const CLE_CACHE = 'batiments@1';
const COLONNES = 'code,nom,campus,latitude,longitude,acces_libre,horaires,image_url';

/** Ce que rend un rafraichissement : un resultat, jamais une exception. */
export interface BuildingsReport {
    readonly ok: boolean;
    /** Le nombre de lieux surcouches, quand la lecture a abouti. */
    readonly lieux?: number;
    /** Pourquoi la surcouche n'a pas ete appliquee, en clair. */
    readonly reason?: string;
}

function lireCache(brut: string | null): Record<string, BuildingRef> | null {
    if (brut === null) return null;
    try {
        const contenu = JSON.parse(brut);
        return contenu !== null && typeof contenu === 'object' ? contenu : null;
    } catch (error) {
        // Un cache illisible se jette sans bruit : le socle embarque reprend la main, ce que
        // l'application sait deja faire.
        return null;
    }
}

/**
 * Installe la derniere surcouche connue, sans reseau.
 *
 * Appelee au demarrage, avant le premier rendu. Sans cache, la table reste le socle embarque — ce qui
 * est deja le cas a l'import du module.
 */
export async function loadBuildings(): Promise<void> {
    try {
        const surcouche = lireCache(await AsyncStorage.getItem(CLE_CACHE));
        if (surcouche !== null) appliquerSurcouche(surcouche);
    } catch (error) {
        console.warn(`[batiments] cache illisible : ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Va chercher la surcouche publiee et l'applique.
 *
 * Declenchee au demarrage et au retour au premier plan, comme la livraison des Blueprints — jamais
 * dans le chemin d'un rendu. Une base injoignable laisse la table en place : le socle, ou la derniere
 * surcouche lue du cache.
 */
export async function refreshBuildings(): Promise<BuildingsReport> {
    const supabase = getSupabase();
    if (supabase === null) {
        return rapporter({ ok: false, reason: 'base non configuree' });
    }

    try {
        const { data, error } = await supabase.from(TABLE).select(COLONNES);
        if (error) {
            return rapporter({ ok: false, reason: error.message });
        }

        const surcouche: Record<string, BuildingRef> = {};
        for (const row of data ?? []) {
            if (typeof row.code === 'string' && row.code !== '') surcouche[row.code] = projeterBatiment(row);
        }

        appliquerSurcouche(surcouche);
        await AsyncStorage.setItem(CLE_CACHE, JSON.stringify(surcouche));
        return rapporter({ ok: true, lieux: Object.keys(surcouche).length });
    } catch (erreur) {
        return rapporter({ ok: false, reason: erreur instanceof Error ? erreur.message : String(erreur) });
    }
}

/**
 * Journalise le rapport, sans le transformer.
 *
 * Meme raison que pour la livraison des Blueprints : le rapport est un **resultat**, pas une panne,
 * mais une surcouche qui n'aboutit jamais doit rester observable sans ouvrir un panneau de
 * diagnostic. C'est aussi la seule facon de verifier ce mecanisme sur un appareil — les quatre ecrans
 * qui lisent le referentiel affichent la meme chose que la surcouche soit appliquee ou non, ce qui
 * est precisement la propriete recherchee et ce qui la rend invisible.
 */
function rapporter(report: BuildingsReport): BuildingsReport {
    if (!report.ok) {
        console.warn(`[batiments] surcouche non appliquee : ${report.reason ?? 'sans detail'}`);
    } else if (__DEV__) {
        console.log(`[batiments] surcouche appliquee : ${report.lieux} lieu(x)`);
    }
    return report;
}
