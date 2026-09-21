/**
 * Le disjoncteur par hote : quand une source ne repond plus, les runs que **personne n'a demandes**
 * cessent de la marteler.
 *
 * Celcat est tombe le 2026-09-14, par le serveur de l'universite. L'application n'y etait pour rien,
 * mais son rythme nominal est lourd — un retour au premier plan relit le Planning, rejoue les widgets,
 * replanifie les rappels ; un cache expire redemande une liste — et une application qui interroge un
 * service public se doit de s'arreter quand il tombe (jalon 7-C).
 *
 * La regle : **trois** echecs `unavailable` consecutifs sur un hote l'ouvrent pour 30 s ; un echec
 * **apres** ce refroidissement — la sonde du circuit a demi ouvert — le rouvre au palier suivant,
 * 2 min puis 10 min, plafonne ; un succes le referme. Un echec **pendant** le refroidissement — un
 * geste, ou les dix-sept runs paralleles d'une fiche de batiment — rearme la fenetre sans monter :
 * sans cette nuance, une seule fiche qui echoue sauterait d'un coup au dernier palier (mesure en
 * preparant le protocole du 2026-09-21). Un echec d'une autre famille — `rejected`, `data` — ne
 * compte pas : ce n'est pas une panne de transport. Pendant l'ouverture, un run **automatique** rend
 * un echec `unavailable` ordinaire sans requete ; un geste de l'utilisateur — « Reessayer », un autre
 * jour — passe toujours (runBlueprint.ts).
 *
 * L'hote se deduit du run, dans cet ordre : `inputs.domaine` (les six Celcat), `inputs.lien` (un
 * abonnement iCalendar), `vars.domaine`, `vars.api` (Affluences), l'adresse **litterale** du premier
 * pas, et a defaut le nom du Blueprint. Seul l'hote est retenu, jamais l'adresse entiere : le lien
 * d'abonnement est un secret personnel.
 *
 * Module pur, etat en memoire de portee module : un redemarrage rearme, et c'est ecrit comme une
 * limite. Il couvre l'Act I ; un portail de l'Act II injoignable rend `blocked` ou `engine`, pas
 * `unavailable` (docs/qualite.md).
 */

import type { Blueprint } from '@aetherius/engine';

/** Qui a demande le run : un geste de l'utilisateur, ou l'application d'elle-meme. */
export type Origine = 'utilisateur' | 'automatique';

export const SEUIL_ECHECS = 3;
/** Les refroidissements, par palier : le dernier se repete tant que l'hote ne repond pas. */
export const REFROIDISSEMENTS_MS: readonly number[] = [30_000, 2 * 60_000, 10 * 60_000];

export interface EtatHote {
    readonly hote: string;
    /** Les echecs `unavailable` consecutifs depuis le dernier succes. */
    readonly echecs: number;
    /** L'index dans `REFROIDISSEMENTS_MS` ; -1 tant que l'hote n'a jamais ete ouvert. */
    readonly palier: number;
    /** Horloge reelle ; `null` = ferme. Une valeur passee = refroidissement ecoule, le prochain run part. */
    readonly ouvertJusqua: number | null;
}

export interface VerdictEchec {
    readonly etat: EtatHote;
    /** Vrai quand cet echec ouvre le circuit ou monte son palier : c'est le moment de le journaliser. */
    readonly ouverture: boolean;
}

const HOTE = /^https?:\/\/([^/?#]+)/i;

/** L'hote d'une adresse litterale, en minuscules et avec son port ; `null` pour tout le reste, gabarits compris. */
export function hoteDe(url: unknown): string | null {
    if (typeof url !== 'string' || url.includes('{{')) return null;
    const hote = HOTE.exec(url)?.[1];
    return hote === undefined || hote === '' ? null : hote.toLowerCase();
}

export function hoteDuRun(
    blueprint: Blueprint | null | undefined,
    inputs: Readonly<Record<string, unknown>> | undefined,
    nom: string,
): string {
    const candidats: readonly unknown[] = [inputs?.domaine, inputs?.lien, blueprint?.vars?.domaine, blueprint?.vars?.api];
    for (const candidat of candidats) {
        const hote = hoteDe(candidat);
        if (hote !== null) return hote;
    }
    for (const step of blueprint?.steps ?? []) {
        const hote = hoteDe(step.url);
        if (hote !== null) return hote;
    }
    return nom;
}

/** La transition d'un hote apres un echec `unavailable`, pure. */
export function apresEchec(etat: EtatHote | undefined, hote: string, maintenant: number): VerdictEchec {
    const echecs = (etat?.echecs ?? 0) + 1;
    // Deja ouvert : le compte a rebours repart de maintenant ; le palier ne monte que si le
    // refroidissement etait ecoule — c'est l'echec d'apres qui prouve que l'hote ne repond toujours pas.
    if (etat !== undefined && etat.ouvertJusqua !== null) {
        const ecoule = maintenant >= etat.ouvertJusqua;
        const palier = ecoule ? Math.min(etat.palier + 1, REFROIDISSEMENTS_MS.length - 1) : etat.palier;
        return { etat: { hote, echecs, palier, ouvertJusqua: maintenant + REFROIDISSEMENTS_MS[palier] }, ouverture: ecoule };
    }
    if (echecs >= SEUIL_ECHECS) {
        return { etat: { hote, echecs, palier: 0, ouvertJusqua: maintenant + REFROIDISSEMENTS_MS[0] }, ouverture: true };
    }
    return { etat: { hote, echecs, palier: -1, ouvertJusqua: null }, ouverture: false };
}

export function estOuvert(etat: EtatHote | undefined, maintenant: number): boolean {
    return etat !== undefined && etat.ouvertJusqua !== null && maintenant < etat.ouvertJusqua;
}

/** « 30 s », « 2 min », « 10 min » : pour les journaux et le menu de developpement. */
export function refroidissementLisible(palier: number): string {
    const ms = REFROIDISSEMENTS_MS[Math.min(Math.max(palier, 0), REFROIDISSEMENTS_MS.length - 1)];
    return ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60_000)} min`;
}

// -----------------------------------------------------------------------------------------------
// Le registre de l'application : un etat par hote, en memoire.
// -----------------------------------------------------------------------------------------------

const hotes = new Map<string, EtatHote>();

export function hoteOuvert(hote: string, maintenant: number): boolean {
    return estOuvert(hotes.get(hote), maintenant);
}

export function noterEchec(hote: string, maintenant: number): VerdictEchec {
    const verdict = apresEchec(hotes.get(hote), hote, maintenant);
    hotes.set(hote, verdict.etat);
    return verdict;
}

/** Efface l'hote ; rend vrai s'il etait ouvert — le succes qui referme merite une ligne de journal. */
export function noterSucces(hote: string): boolean {
    const etat = hotes.get(hote);
    hotes.delete(hote);
    return etat !== undefined && etat.ouvertJusqua !== null;
}

export function etatDesHotes(): readonly EtatHote[] {
    return [...hotes.values()];
}

/** Le geste « Rearmer » du menu de developpement — et ce qu'un redemarrage fait de lui-meme. */
export function rearmer(): void {
    hotes.clear();
}
