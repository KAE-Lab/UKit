/**
 * La couture de plateforme du catalogue des etablissements : le cache local, la lecture de la base,
 * et ce qu'un changement d'etablissement efface.
 *
 * Deux regles, calquees sur le referentiel des lieux et sur le registre des Blueprints, et tentantes
 * a violer de la meme facon :
 *
 *   - les accesseurs **ne touchent jamais au reseau**. Un ecran de choix n'attend pas une base pour
 *     proposer l'etablissement historique ;
 *   - `refreshEtablissements()` **ne leve jamais**. Elle rend un rapport. Un point de publication en
 *     panne ne doit pas devenir une application en panne.
 *
 * Le cache existe pour une raison precise : au second lancement hors ligne, la derniere surcouche
 * connue vaut mieux que le socle seul — un etudiant qui a choisi le second etablissement doit le
 * retrouver dans l'avion.
 *
 * Voir docs/features/settings.md, docs/backend.md et docs/phase-6/6-g-etablissements.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSupabase } from '../supabase';
import {
    ETABLISSEMENT_DEFAUT,
    appliquerCatalogue,
    getCodeEtablissementActif,
    projeterEtablissement,
    setCodeEtablissementActif,
    type Etablissement,
} from './catalogue';
import { purgerDonneesEtablissement } from './purge';

export {
    ETABLISSEMENT_DEFAUT,
    etablissementRetire,
    getCodeEtablissementActif,
    getEtablissement,
    getEtablissementActif,
    libelleEtablissement,
    listeEtablissements,
    serviceEtablissement,
    setCodeEtablissementActif,
} from './catalogue';
export type { CelcatResTypes, Etablissement, PointBalayage } from './catalogue';
export { entreesCelcat, planningAbsent, planningDisponible } from './celcat';
export type { EntreesCelcat } from './celcat';
export { purgerDonneesEtablissement } from './purge';

const TABLE = 'etablissements';
const CLE_CACHE = 'etablissements@1';
const COLONNES =
    'code,nom,ville,logo_url,actif,portail_dossier,portail_messagerie,celcat_domaine,celcat_res_types,bibliotheques_points,services,libelles,ordre';

/** Ce que rend un rafraichissement : un resultat, jamais une exception. */
export interface EtablissementsReport {
    readonly ok: boolean;
    /** Le nombre d'etablissements publies, quand la lecture a abouti. */
    readonly etablissements?: number;
    /**
     * Le catalogue a-t-il **change** depuis la derniere lecture ?
     *
     * Le rapport le dit parce que personne d'autre ne peut le savoir sans relire le cache, et parce
     * qu'un ecran deja monte doit se redessiner **seulement** quand il y a une raison. Sans cette
     * distinction, chaque retour au premier plan repeindrait toute l'application ; sans le drapeau du
     * tout, un etablissement retire de la base ne se voyait qu'au premier geste qui provoquait un
     * rendu — constate sur appareil au jalon 6-G, sur l'avertissement de retrait.
     */
    readonly change?: boolean;
    /** L'etablissement selectionne n'est plus publie : il est reporte depuis le cache, et signale. */
    readonly retire?: boolean;
    /** Pourquoi la surcouche n'a pas ete appliquee, en clair. */
    readonly reason?: string;
}

function lireCache(brut: string | null): Record<string, Etablissement> | null {
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
 * Appelee au demarrage, **avant** le premier rendu et avant `SettingsManager.loadSettings()` : c'est
 * ce dernier qui pose le code selectionne, et il doit pouvoir le resoudre tout de suite.
 */
export async function loadEtablissements(): Promise<void> {
    try {
        const surcouche = lireCache(await AsyncStorage.getItem(CLE_CACHE));
        if (surcouche !== null) appliquerCatalogue(surcouche);
    } catch (error) {
        console.warn(`[etablissements] cache illisible : ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Va chercher le catalogue publie et l'applique.
 *
 * Declenchee au demarrage et au retour au premier plan, comme la livraison des Blueprints et le
 * referentiel des lieux — jamais dans le chemin d'un run ni d'un rendu. Une base injoignable laisse
 * la table en place : le socle, ou la derniere surcouche lue du cache.
 *
 * La politique de lecture ne rend que les lignes `actif` (supabase/policies.sql) : un etablissement
 * retire disparait donc de la liste sans une ligne de code ici.
 */
export async function refreshEtablissements(): Promise<EtablissementsReport> {
    const supabase = getSupabase();
    if (supabase === null) {
        return rapporter({ ok: false, reason: 'base non configuree' });
    }

    try {
        const { data, error } = await supabase.from(TABLE).select(COLONNES);
        if (error) {
            return rapporter({ ok: false, reason: error.message });
        }

        const surcouche: Record<string, Etablissement> = {};
        for (const row of data ?? []) {
            if (typeof row.code === 'string' && row.code !== '') {
                surcouche[row.code] = projeterEtablissement(row);
            }
        }

        // La comparaison porte sur le texte du cache et non sur la table en memoire : c'est le seul
        // etat qui survit a un redemarrage, donc le seul qui dise « ce que l'appareil savait deja ».
        const connu = await AsyncStorage.getItem(CLE_CACHE);
        const publies = Object.keys(surcouche).length;
        const retire = reporterActifRetire(surcouche, lireCache(connu));

        const serialise = JSON.stringify(surcouche);
        appliquerCatalogue(surcouche, retire);
        await AsyncStorage.setItem(CLE_CACHE, serialise);
        return rapporter({ ok: true, etablissements: publies, change: connu !== serialise, retire });
    } catch (erreur) {
        return rapporter({ ok: false, reason: erreur instanceof Error ? erreur.message : String(erreur) });
    }
}

/**
 * Reporte l'etablissement selectionne quand la base ne le publie plus, et dit si c'est arrive.
 *
 * **Mute la surcouche**, volontairement : c'est elle qu'on met en cache, et l'entree doit survivre a
 * un redemarrage — sans quoi l'application retomberait sur le socle au lancement suivant, sans un mot.
 *
 * Le cas ne se pose que pour l'etablissement **actif**. Les autres disparaissent purement et
 * simplement, et c'est ce qu'on veut : le catalogue est la liste de ce qu'on propose, pas un musee.
 */
function reporterActifRetire(
    surcouche: Record<string, Etablissement>,
    precedent: Record<string, Etablissement> | null,
): boolean {
    const code = getCodeEtablissementActif();
    if (code === ETABLISSEMENT_DEFAUT || surcouche[code] !== undefined) return false;

    const connu = precedent?.[code];
    if (connu === undefined) return false;

    surcouche[code] = connu;
    return true;
}

/**
 * Journalise le rapport, sans le transformer.
 *
 * Meme raison que pour la livraison des Blueprints : le rapport est un **resultat**, pas une panne,
 * mais une surcouche qui n'aboutit jamais doit rester observable sans ouvrir un panneau de
 * diagnostic.
 */
function rapporter(report: EtablissementsReport): EtablissementsReport {
    if (!report.ok) {
        console.warn(`[etablissements] catalogue non applique : ${report.reason ?? 'sans detail'}`);
    } else if (__DEV__) {
        console.log(`[etablissements] catalogue applique : ${report.etablissements} etablissement(s)`);
    }
    return report;
}

/** Le code actif a-t-il change ? Un changement pour le meme code ne doit rien effacer. */
export function estDejaActif(code: string): boolean {
    return getCodeEtablissementActif() === code;
}

/**
 * Bascule vers un autre etablissement : purge d'abord, selection ensuite.
 *
 * Dans cet ordre, et pas l'inverse : une purge jouee apres la selection courrait contre les ecrans
 * qui se rechargent deja sur le nouvel etablissement, et l'un d'eux reecrirait ce qu'on efface.
 *
 * La persistance du code et la notification des ecrans restent a `SettingsManager` : ce module tient
 * la donnee, pas les reglages.
 */
export async function changerEtablissement(code: string): Promise<void> {
    if (estDejaActif(code)) return;

    await purgerDonneesEtablissement();
    setCodeEtablissementActif(code);
}
