/**
 * Le formulaire de retour natif, porte d'entree (phase 8, lot 3 ; docs/phase-8/3-formulaire.md) : deposer
 * un retour, la boite d'envoi qui le garde hors ligne, la relecture des reponses par leur cle, et ce qui
 * les annonce.
 *
 * **L'ecriture** passe par la fonction `communaute`, comme une contribution : le meme envoi signe, la
 * meme attestation, les memes plafonds (`envoyerSigne`). **La lecture** des reponses passe par
 * `lire_mes_retours`, avec les cles tirees sur cet appareil : la base ne sait pas quel appareil lit, et
 * aucun identifiant public n'ouvre un retour. Un retour qui ne part pas — reseau absent, base injoignable
 * — reste dans la boite et repart au retour du reseau ; un refus est definitif.
 */

import NetInfo from '@react-native-community/netinfo';
import { CryptoDigestAlgorithm, digest, getRandomBytes, randomUUID } from 'expo-crypto';
import { AppState } from 'react-native';

import { envoyerSigne } from '../communaute';
import { versBase64 } from '../communaute/donnees';
import Translator from '../i18n/Translator';
import { notificationsNatives } from '../services/notificationsNatives';
import { describeSupabaseFailure, getSupabase, reportSupabaseFailure } from '../supabase';
import { appeler } from '../supabase/rpc';
import { garderLesCaptures, octetsDe, oublierLesCaptures } from './captures';
import {
    aAnnoncer, clesALire, fusionnerLecture, lireEnvois, marquer, nouveauRetourConnu, serialiserRetour,
    type NatureDeRetour, type RetourEnAttente,
} from './donnees';
import { brancherLeJournal } from './journalDeSession';
import { derniereLecture, ecrireBoite, lireBoite, lireConnus, modifierConnus, noterLecture } from './memoire';

export { EVENEMENT_RETOURS } from './memoire';

/** Les reponses se relisent au plus toutes les six heures, sauf a l'ouverture de « Mes retours ». */
export const INTERVALLE_DE_LECTURE_MS = 6 * 60 * 60_000;
const ESPACE_DES_CAPTURES = 'retours';

/** Ce que l'etudiant envoie, tel que le formulaire le tient. */
export interface SaisieDeRetour {
    readonly nature: NatureDeRetour;
    readonly texte: string;
    readonly campus: string | null;
    readonly volontaire: boolean;
    readonly contact: string | null;
    readonly probleme: string | null;
    readonly contexte: Readonly<Record<string, unknown>> | null;
    /** Les captures compressees, dans le cache. */
    readonly captures: readonly string[];
    /** « Recevoir la reponse ici » : une cle se tire sur l'appareil. */
    readonly reponseIci: boolean;
}

export type IssueDuDepot =
    | { readonly etat: 'envoye'; readonly capturesPerdues: number }
    | { readonly etat: 'en-attente' }
    | { readonly etat: 'refuse'; readonly raison: string };

function enHex(octets: Uint8Array): string {
    return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

/** Televerse les captures d'un depot accepte ; rend combien n'ont pas pu partir. */
async function televerser(attente: RetourEnAttente, corps: unknown): Promise<number> {
    const supabase = getSupabase();
    const envois = lireEnvois(corps);
    let perdues = attente.fichiers.length - envois.length;
    for (const [i, envoi] of envois.entries()) {
        const fichier = attente.fichiers[i];
        if (supabase === null || fichier === undefined) {
            perdues++;
            continue;
        }
        try {
            const { error } = await supabase.storage.from(ESPACE_DES_CAPTURES)
                .uploadToSignedUrl(envoi.chemin, envoi.jeton, await octetsDe(fichier), { contentType: 'image/jpeg' });
            if (error !== null) {
                console.warn(`[retours] capture non televersee : ${error.message}`);
                perdues++;
            }
        } catch (erreur) {
            console.warn(`[retours] capture non televersee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
            perdues++;
        }
    }
    return Math.max(0, perdues);
}

/** L'issue du dernier essai de chaque retour de la boite, pour celui qui l'a depose. */
const issues = new Map<string, IssueDuDepot>();

/** Un retour de la boite, depose ; la boite et « Mes retours » suivent son issue. */
async function deposer(attente: RetourEnAttente): Promise<IssueDuDepot> {
    const retour = { ...attente.retour, captures: attente.fichiers.length };
    const { resultat, corps } = await envoyerSigne('deposer', (defi, cle) => serialiserRetour(defi, cle, retour));
    if (resultat.etat === 'echec' || resultat.etat === 'sans-base' || resultat.etat === 'a-refaire') {
        issues.set(attente.local, { etat: 'en-attente' });
        return { etat: 'en-attente' };
    }
    const issue: IssueDuDepot = resultat.etat === 'refusee'
        ? { etat: 'refuse', raison: resultat.raison }
        : { etat: 'envoye', capturesPerdues: await televerser(attente, corps) };
    await ecrireBoite((await lireBoite()).filter((a) => a.local !== attente.local));
    await modifierConnus((liste) => liste.map((r) => (r.local === attente.local
        ? { ...r, etat: issue.etat === 'refuse' ? 'refuse' : 'envoye', statut: issue.etat === 'refuse' ? null : 'nouveau' }
        : r)));
    oublierLesCaptures(attente.local);
    issues.set(attente.local, issue);
    return issue;
}

let vidageEnCours: Promise<void> | null = null;

/**
 * Depose ce qui attend, dans l'ordre ; s'arrete au premier qui ne part pas — le reseau manque encore.
 * Un seul vidage a la fois : le retour du reseau et un envoi du formulaire ne deposent jamais deux fois.
 */
export function viderLaBoite(): Promise<void> {
    vidageEnCours ??= (async () => {
        for (const attente of await lireBoite()) {
            if ((await deposer(attente)).etat === 'en-attente') break;
        }
    })().catch((erreur: unknown) => {
        console.warn(`[retours] boite non videe : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }).finally(() => {
        vidageEnCours = null;
    });
    return vidageEnCours;
}

/**
 * Depose un retour : il entre d'abord dans la boite, captures recopiees dans le repertoire prive, puis
 * part s'il le peut. « En attente » veut dire qu'il partira au retour du reseau, sans rien demander.
 */
export async function deposerUnRetour(saisie: SaisieDeRetour): Promise<IssueDuDepot> {
    const local = randomUUID();
    let cle: string | null = null;
    let cleReponse: string | null = null;
    if (saisie.reponseIci) {
        const octets = new Uint8Array(getRandomBytes(32));
        cle = versBase64(octets);
        cleReponse = enHex(new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, octets)));
    }
    const attente: RetourEnAttente = {
        local,
        creeLe: Date.now(),
        cle,
        fichiers: garderLesCaptures(local, saisie.captures),
        retour: {
            nature: saisie.nature, texte: saisie.texte.trim(), campus: saisie.campus, volontaire: saisie.volontaire,
            contact: saisie.contact, probleme: saisie.probleme, contexte: saisie.contexte, captures: saisie.captures.length,
            cle_reponse: cleReponse,
        },
    };
    await ecrireBoite([...(await lireBoite()), attente]);
    await modifierConnus((liste) => [nouveauRetourConnu(attente), ...liste]);
    // Un vidage deja en cours a lu la boite avant ce retour : un second le prend.
    await viderLaBoite();
    if (!issues.has(local)) await viderLaBoite();
    const issue = issues.get(local) ?? { etat: 'en-attente' };
    issues.delete(local);
    return issue;
}

/** Une notification locale pour une reponse arrivee hors de l'application, si les notifications sont accordees. */
async function notifier(texte: string): Promise<boolean> {
    const natives = await notificationsNatives();
    if (natives === null || (await natives.getPermissionsAsync()).status !== 'granted') return false;
    await natives.scheduleNotificationAsync({
        content: { title: Translator.get('REPONSE_NOTIFICATION_TITRE'), body: texte.length > 140 ? `${texte.slice(0, 139)}…` : texte, data: { retours: true } },
        trigger: null,
    });
    return true;
}

/**
 * Relit l'etat et les reponses des retours qui en ont une cle. Au plus toutes les six heures, sauf
 * `force` (l'ouverture de « Mes retours »). Une reponse arrivee pendant que l'application est en
 * arriere-plan se notifie ; au premier plan, l'hote l'annonce lui-meme (RetoursHote). Ne leve jamais.
 */
let lectureEnCours: Promise<void> | null = null;

export function relireLesReponses(force = false): Promise<void> {
    // L'entretien et l'hote relisent tous deux au retour au premier plan : un seul aller-retour. Une
    // lecture forcee qui arrive pendant une autre attend la fin de celle-ci, puis passe.
    if (lectureEnCours !== null) return force ? lectureEnCours.then(() => relireLesReponses(true)) : lectureEnCours;
    lectureEnCours = relire(force).finally(() => {
        lectureEnCours = null;
    });
    return lectureEnCours;
}

async function relire(force: boolean): Promise<void> {
    try {
        const supabase = getSupabase();
        const connus = await lireConnus();
        const cles = clesALire(connus);
        if (supabase === null || cles.length === 0) return;
        if (!force && Date.now() - (await derniereLecture()) < INTERVALLE_DE_LECTURE_MS) return;
        const { data, error } = await appeler(supabase, 'lire_mes_retours', { p_cles: cles });
        if (error !== null) {
            reportSupabaseFailure('lire_mes_retours', describeSupabaseFailure(error));
            return;
        }
        await noterLecture(Date.now());
        const lus = await modifierConnus((liste) => fusionnerLecture(liste, cles, Array.isArray(data) ? data : []));
        const nouvelle = aAnnoncer(lus);
        if (nouvelle === null || AppState.currentState === 'active') return;
        const derniere = nouvelle.reponses[nouvelle.reponses.length - 1];
        if (derniere !== undefined && await notifier(derniere.texte)) {
            await modifierConnus((liste) => marquer(liste, 'annoncees', nouvelle.local));
        }
    } catch (erreur) {
        console.warn(`[retours] reponses non relues : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

let branche = false;

/** Le journal de la session, et la boite qui repart au retour du reseau. Une fois, au lancement. */
export function brancherLesRetours(): void {
    if (branche) return;
    branche = true;
    brancherLeJournal();
    NetInfo.addEventListener((etat) => {
        if (etat.isConnected === true) void lireBoite().then((boite) => (boite.length > 0 ? viderLaBoite() : undefined));
    });
}
