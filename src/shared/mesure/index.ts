/**
 * La mesure (jalon 7-D) : des compteurs anonymes, et la seconde ecriture de l'application vers la base.
 *
 * `compter` est synchrone et ne coute rien : une ligne de plus dans une file en memoire, ecrite au
 * plus une fois par seconde sous `mesures@1`. Rien ne part au demarrage, jamais : la file s'envoie au
 * passage en arriere-plan et a l'entretien — hors lancement —, par lots de deux cents, a la fonction
 * `compter` de la base (supabase/fonctions.sql), qui agrege et dit ce qu'elle a compte et rejete.
 *
 * Ce qui part est une ligne de `file.ts` : un evenement du vocabulaire, une cle validee, un jour ou
 * une heure, le campus, la version, la plateforme, le statut de testeur, un nombre. Aucun
 * identifiant, jamais (docs/mesure.md, PRIVACY.md point 4 quinquies). Rien n'est compte si
 * l'interrupteur est coupe, si la cle n'a pas la forme attendue, si la plateforme est inconnue ou la
 * version illisible — le contexte de ciblage le dit deja.
 *
 * Le module s'abonne : au retour au premier plan (une nouvelle session), au passage en arriere-plan
 * (l'envoi), aux echecs de run (`source.echec`, par le registre pur d'observateurs.ts — `runBlueprint`
 * ne connait pas la mesure, sinon le cycle d'import serait boucle) et a l'interrupteur (couper vide).
 * `impressions.ts` s'abonne ici a son tour et ne se re-exporte pas : l'index ne le connait pas.
 *
 * Voir docs/mesure.md et docs/phase-7/7-d-la-mesure.md.
 */

import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Le registre seul, et non la porte d'entree `../aetherius` : elle tire le client, le registre et la
// WebView, que ce module — charge avant le premier rendu — n'a aucune raison de mettre sur son chemin.
import { onEchecDeRun } from '../aetherius/observateurs';
import { contexteDeCiblage } from '../ciblage/contexte';
import Translator from '../i18n/Translator';
import { SettingsManager } from '../services/AppCore';
import { onPassageEnArrierePlan, onRetourAuPremierPlan } from '../services/premierPlan';
import { appeler, getSupabase } from '../supabase';
import {
    borner,
    fusionner,
    ligneDe,
    lireFile,
    lireReponse,
    lots,
    soustraire,
    type ContexteDeMesure,
    type LigneDeMesure,
} from './file';
import { chargerLeReglage, mesureActive, onReglageMesure } from './reglage';
import { impressionsNouvelles, nouvelleSession, type Session } from './session';
import { cleValide, ONGLETS, type Evenement } from './vocabulaire';

export { activerLaMesure, mesureActive, reinitialiserLaMesure, useMesureActive } from './reglage';
export type { LigneDeMesure } from './file';
export type { Evenement } from './vocabulaire';

const CLE_FILE = 'mesures@1';
/** Une ecriture au plus par seconde : Android peut tuer l'application sans passer par `background`. */
const DELAI_ECRITURE_MS = 1000;
/** Diffuse a chaque comptage, envoi ou vidage, pour le menu de developpement. */
export const EVENEMENT_MESURE = 'mesureChangee';

export type EtatEnvoi = 'envoye' | 'rien' | 'inactif' | 'sans-base' | 'echec';

export interface DernierEnvoi {
    readonly at: number;
    readonly etat: EtatEnvoi;
    readonly comptes?: number;
    readonly rejetes?: number;
    readonly raison?: string;
}

export interface EtatDeLaMesure {
    readonly active: boolean;
    readonly lignes: number;
    /** La somme des `n` de la file : ce qui attend de partir. */
    readonly total: number;
    readonly dernierEnvoi: DernierEnvoi | null;
}

let file: LigneDeMesure[] = [];
let session: Session = nouvelleSession();
let ecriture: ReturnType<typeof setTimeout> | null = null;
let envoiEnCours: Promise<EtatEnvoi> | null = null;
let dernierEnvoi: DernierEnvoi | null = null;
let armee = false;
const abonnesSession = new Set<() => void>();

function signaler(): void {
    DeviceEventEmitter.emit(EVENEMENT_MESURE);
}

function message(erreur: unknown): string {
    return erreur instanceof Error ? erreur.message : String(erreur);
}

/** Le contexte de ciblage, ou `null` quand il ne permet pas de compter : plateforme inconnue, version illisible. */
function contexte(): ContexteDeMesure | null {
    const c = contexteDeCiblage();
    if (c.plateforme === 'inconnue' || c.version === null) return null;
    return { campus: c.etablissement, version: c.version, plateforme: c.plateforme, testeur: c.testeur };
}

async function ecrire(): Promise<void> {
    try {
        await AsyncStorage.setItem(CLE_FILE, JSON.stringify(file));
    } catch (erreur) {
        console.warn(`[mesure] file non enregistree : ${message(erreur)}`);
    }
}

function planifierLEcriture(): void {
    if (ecriture !== null) return;
    ecriture = setTimeout(() => {
        ecriture = null;
        void ecrire();
    }, DELAI_ECRITURE_MS);
}

/** Compte un geste. Synchrone, sans reseau ; l'ecriture sur le disque est differee. */
export function compter(evenement: Evenement, cle = ''): void {
    if (!mesureActive()) return;
    if (!cleValide(evenement, cle)) {
        if (__DEV__) console.warn(`[mesure] ${evenement} : cle refusee (${cle})`);
        return;
    }
    const c = contexte();
    if (c === null) return;
    // L'horloge reelle, et non l'heure simulable : une mesure est une trace, pas une decision
    // (shared/services/Temps.ts), et la base rejette de toute facon un jour hors de sa fenetre.
    file = borner(fusionner(file, ligneDe(evenement, cle, c, new Date())));
    // Une ligne par geste dans Metro, comme `[push]` et `[entretien]` : c'est ce qui rend le protocole
    // sur appareil lisible sans attendre un envoi.
    if (__DEV__) console.info(`[mesure] ${evenement}${cle === '' ? '' : ` ${cle}`}`);
    planifierLEcriture();
    signaler();
}

/** L'onglet affiche, par le nom de sa route ; une route qui n'est pas un onglet ne compte pas. */
export function compterOnglet(route: string): void {
    const cle = ONGLETS[route];
    if (cle !== undefined) compter('onglet.vu', cle);
}

/** Les cartes d'annonce visibles ; chacune ne compte qu'une fois par session. */
export function compterImpressions(ids: readonly string[]): void {
    for (const id of impressionsNouvelles(session, ids)) compter('annonce.impression', id);
}

/** S'abonne au debut de chaque session ; rend le desabonnement. Les impressions s'en servent pour recompter. */
export function onNouvelleSession(abonne: () => void): () => void {
    abonnesSession.add(abonne);
    return () => {
        abonnesSession.delete(abonne);
    };
}

/** Une session : une ouverture ou un vrai retour au premier plan, et l'etat des quatre reglages, une fois. */
function ouvrirUneSession(): void {
    session = nouvelleSession();
    compter('session');
    compter('reglage.theme', SettingsManager.getTheme());
    compter('reglage.langue', Translator.getLanguage());
    compter('reglage.synchro', SettingsManager.getCalendarSyncEnabled() ? 'on' : 'off');
    compter('reglage.notifications', SettingsManager.getCourseNotificationsEnabled() ? 'rappels:on' : 'rappels:off');
    compter('reglage.notifications', SettingsManager.getMessagesEnNotification() ? 'messages:on' : 'messages:off');
    for (const abonne of [...abonnesSession]) abonne();
}

/**
 * Relit l'interrupteur puis la file. Ce qui a ete compte avant la relecture — la session du lancement,
 * l'onglet du premier focus — rejoint ce qui attendait sur le disque ; si l'interrupteur relu dit
 * « coupe », l'abonne du reglage a deja tout jete, et il n'y a rien a relire.
 */
async function charger(): Promise<void> {
    await chargerLeReglage();
    if (!mesureActive()) return;
    let persistee: LigneDeMesure[] = [];
    try {
        persistee = lireFile(await AsyncStorage.getItem(CLE_FILE));
    } catch (erreur) {
        console.warn(`[mesure] file illisible : ${message(erreur)}`);
    }
    let fusionnee = persistee;
    for (const ligne of file) fusionnee = fusionner(fusionnee, ligne);
    file = borner(fusionnee);
    planifierLEcriture();
    signaler();
}

function noter(etat: EtatEnvoi, detail: Omit<DernierEnvoi, 'at' | 'etat'> = {}): EtatEnvoi {
    dernierEnvoi = { at: Date.now(), etat, ...detail };
    if (__DEV__) {
        const complement = etat === 'envoye'
            ? ` (${detail.comptes} comptes, ${detail.rejetes} rejetes)`
            : detail.raison === undefined ? '' : ` : ${detail.raison}`;
        console.info(`[mesure] envoi ${etat}${complement}`);
    }
    signaler();
    return etat;
}

async function envoyer(): Promise<EtatEnvoi> {
    if (!mesureActive()) return noter('inactif');
    if (file.length === 0) return noter('rien');
    const supabase = getSupabase();
    if (supabase === null) return noter('sans-base');

    let comptes = 0;
    let rejetes = 0;
    for (const lot of lots(file)) {
        const { data, error } = await appeler(supabase, 'compter', { p_lots: lot });
        if (error) throw new Error(error.message);
        const reponse = lireReponse(data);
        if (reponse === null) throw new Error('reponse illisible');
        // Le lot est accepte, lignes rejetees comprises : une ligne que la base refuse ne se represente
        // pas, sinon elle reviendrait pour toujours. Ce qui a ete compte pendant l'envoi reste.
        file = soustraire(file, lot);
        // Ecrite tout de suite, pas dans la seconde : l'envoi part au passage en arriere-plan, et une
        // fermeture depuis les applications recentes dans cette seconde relisait l'ancienne file au
        // lancement suivant — trois lignes deja acceptees repartaient (Galaxy A8, 2026-09-22).
        await ecrire();
        comptes += reponse.comptes;
        rejetes += reponse.rejetes;
    }
    return noter('envoye', { comptes, rejetes });
}

/**
 * Envoie la file, ou rejoint l'envoi qui court. Ne leve jamais : l'issue se lit dans le dernier envoi.
 *
 * Une reponse perdue apres un lot accepte compte deux fois — la base ne porte pas d'idempotence, par
 * choix de simplicite, et la file n'est soustraite qu'a la reponse. Limite ecrite (docs/mesure.md).
 */
export function envoyerLesMesures(): Promise<EtatEnvoi> {
    if (envoiEnCours !== null) return envoiEnCours;
    envoiEnCours = envoyer()
        .catch((erreur: unknown): EtatEnvoi => noter('echec', { raison: message(erreur) }))
        .finally(() => {
            envoiEnCours = null;
        });
    return envoiEnCours;
}

/** Vide la file, en memoire et sur le disque : le geste de l'interrupteur qu'on coupe, et du menu de developpement. */
export async function viderLaFile(): Promise<void> {
    file = [];
    if (ecriture !== null) {
        clearTimeout(ecriture);
        ecriture = null;
    }
    signaler();
    try {
        await AsyncStorage.removeItem(CLE_FILE);
    } catch (erreur) {
        console.warn(`[mesure] file non videe : ${message(erreur)}`);
    }
}

/** L'etat courant, pour le menu de developpement. */
export function etatDeLaMesure(): EtatDeLaMesure {
    return {
        active: mesureActive(),
        lignes: file.length,
        total: file.reduce((somme, ligne) => somme + ligne.n, 0),
        dernierEnvoi,
    };
}

/**
 * Le branchement, une fois, apres l'entretien (App.tsx) et sans attendre : la session du lancement
 * se compte tout de suite, en memoire ; le disque se relit ensuite. Jamais de reseau ici.
 */
export function armerLaMesure(): void {
    if (armee) return;
    armee = true;
    onReglageMesure((actif) => {
        if (!actif) void viderLaFile();
        signaler();
    });
    ouvrirUneSession();
    void charger();
    onRetourAuPremierPlan(ouvrirUneSession);
    onPassageEnArrierePlan(() => {
        void envoyerLesMesures();
    });
    onEchecDeRun((echec) => compter('source.echec', `${echec.hote}:${echec.famille}`));
}
