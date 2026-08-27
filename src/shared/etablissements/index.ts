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

import SecureStoreService from '../services/SecureStoreService';
import { getSupabase } from '../supabase';
import {
    ETABLISSEMENT_DEFAUT,
    appliquerCatalogue,
    getCodeEtablissementActif,
    projeterEtablissement,
    setCodeEtablissementActif,
    type Etablissement,
    type GroupeEdt,
} from './catalogue';
import {
    appliquerEdtsPersonnels,
    edtsPersonnels,
    fusionnerEdtsPersonnels,
    lireEdtsPersonnels,
} from './edtPersonnel';
import { appliquerLiensEdt, fusionnerLiens, liensEdt, lireLiens } from './lienEdt';
import { purgerDonneesEtablissement } from './purge';

export {
    ETABLISSEMENT_DEFAUT,
    crousRegionActive,
    etablissementRetire,
    formatSallesActif,
    getCodeEtablissementActif,
    getEtablissement,
    getEtablissementActif,
    nomCourtEtablissement,
    libelleEtablissement,
    listeEtablissements,
    portailPublie,
    serviceEtablissement,
    setCodeEtablissementActif,
} from './catalogue';
export type {
    CelcatResTypes,
    EdtAbonnement,
    EdtIcal,
    Etablissement,
    FormatSalles,
    GroupeEdt,
    PointBalayage,
} from './catalogue';
export { entreesCelcat, sallesDisponibles } from './celcat';
export type { EntreesCelcat } from './celcat';
export {
    groupeInconnu,
    groupesRequis,
    lienEdtAttendu,
    planningAbsent,
    planningDisponible,
    resoudreRessources,
    sourceEdt,
} from './edt';
export type { SourceEdt } from './edt';
export { edtPersonnelActif } from './edtPersonnel';
export type { EdtsPersonnels } from './edtPersonnel';
export { lienEdtActif } from './lienEdt';
export { purgerDonneesEtablissement, purgerTrousseau } from './purge';

const TABLE = 'etablissements';
/**
 * La cle du cache, **versionnee** — et c'est exactement a ca qu'elle sert.
 *
 * Ce cache ne garde pas des lignes de la base : il garde des `Etablissement` **deja projetes**. Un
 * jalon qui ajoute un champ a la projection ne remplit donc pas retroactivement les objets deja en
 * cache, et l'application lit `undefined` la ou elle attend une valeur ou `null`.
 *
 * Ce n'est pas theorique : mesure sur appareil le 2026-08-16, avec un cache ecrit avant le jalon 6-J.
 * `crousRegion` valait `undefined`, il est parti tel quel dans les entrees du run, et le moteur l'a
 * rendu `None` — l'application a demande `/regions/None/restaurants` et le CROUS a repondu 404. Le
 * meme cache aurait fait passer `edtAbonnement` a `undefined`, que le test `!== null` accepte, donc
 * fait croire a un abonnement la ou il n'y en a pas.
 *
 * **Passer la version invalide les caches anterieurs** : ils sont relus, juges inconnus, et la
 * surcouche repart du socle jusqu'au premier rafraichissement. C'est sans consequence — la lecture du
 * catalogue est deja hors du chemin de demarrage — et c'est le seul moyen sur.
 *
 * La regle qui suit, et qui vaut pour le prochain jalon : **ajouter un champ a `Etablissement`, c'est
 * incrementer cette version.** Les accesseurs normalisent en plus `undefined` vers `null`, ce qui est
 * la seconde ceinture.
 */
const CLE_CACHE = 'etablissements@2';
/**
 * Les colonnes lues, nommees une par une.
 *
 * **Toute colonne ajoutee au schema doit etre ajoutee ici**, sans quoi elle ne sera jamais lue et
 * l'application se comportera comme si l'etablissement ne la declarait pas — un service qui
 * disparait sans raison, ou un defaut qui se cherche du cote de la projection alors qu'il est dans la
 * requete. Le corollaire vaut aussi : la table doit porter la colonne **avant** qu'une version de
 * l'application qui la nomme n'arrive, sinon la lecture entiere echoue et le catalogue retombe sur le
 * socle (supabase/README.md, « ajouter avant de retirer »).
 */
const COLONNES =
    'code,nom,ville,logo_url,actif,portail_dossier,portail_messagerie,celcat_domaine,celcat_res_types,edt,salles,salles_libres,bibliotheques_points,services,libelles,crous_region,ordre';

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
    } catch {
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
 * Installe les liens d'abonnement du trousseau, sans reseau.
 *
 * Appelee au demarrage a cote de `loadEtablissements()`, et pour la meme raison : `sourceEdt()` est
 * synchrone et doit pouvoir repondre des le premier rendu. Un trousseau qui refuse de repondre laisse
 * la table vide — l'ecran dira « colle ton lien » au lieu d'afficher un planning, ce qui est genant
 * mais explicable, la ou une exception au demarrage ne le serait pas.
 */
export async function loadLiensEdt(): Promise<void> {
    appliquerLiensEdt(lireLiens(await SecureStoreService.getEdtLiens()));
}

/**
 * Enregistre — ou retire, avec `null` — le lien de l'etablissement selectionne.
 *
 * La memoire est posee **avant** l'ecriture : un ecran qui vient d'enregistrer doit voir son planning
 * tout de suite, et le trousseau n'est pas sur le chemin d'un rendu. Une ecriture qui echoue laisse
 * donc un lien valable pour la session en cours et perdu au redemarrage, ce qui est le moins mauvais
 * des deux comportements possibles.
 */
export async function enregistrerLienEdt(lien: string | null): Promise<void> {
    const table = fusionnerLiens(liensEdt(), getCodeEtablissementActif(), lien);
    appliquerLiensEdt(table);
    await SecureStoreService.saveEdtLiens(table);
}

/**
 * Installe les emplois du temps personnels du trousseau, sans reseau.
 *
 * A cote de `loadLiensEdt()` et pour la meme raison : `sourceEdt()` est synchrone et fusionne le
 * groupe personnel au referentiel des le premier rendu. Un trousseau muet laisse la table vide — le
 * groupe personnel disparait de la liste jusqu'au prochain demarrage, ce qui est genant mais
 * explicable, la ou une exception au demarrage ne le serait pas.
 */
export async function loadEdtsPersonnels(): Promise<void> {
    appliquerEdtsPersonnels(lireEdtsPersonnels(await SecureStoreService.getEdtsPersonnels()));
}

/**
 * Enregistre — ou retire, avec `null` — l'emploi du temps personnel de l'etablissement selectionne.
 *
 * La memoire est posee **avant** l'ecriture, comme pour les liens : l'ecran qui vient d'accepter la
 * proposition doit voir son planning tout de suite, et le trousseau n'est pas sur le chemin d'un
 * rendu. Une ecriture qui echoue laisse donc un groupe valable pour la session en cours et perdu au
 * redemarrage — le moins mauvais des deux comportements possibles.
 */
export async function enregistrerEdtPersonnel(groupe: GroupeEdt | null): Promise<void> {
    const table = fusionnerEdtsPersonnels(edtsPersonnels(), getCodeEtablissementActif(), groupe);
    appliquerEdtsPersonnels(table);
    await SecureStoreService.saveEdtsPersonnels(table);
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
