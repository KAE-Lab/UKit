/**
 * Ce que la fonction `communaute` juge seule, sans rien importer : la forme d'une demande, le defi,
 * l'empreinte d'une adresse, le verdict Play Integrity, et le statut HTTP d'un refus
 * (docs/phase-8/1-base-communautaire.md).
 *
 * Sans aucun import, comme les `regles.ts` des deux autres fonctions : Deno exige des extensions
 * explicites, le `tsconfig` de la racine les refuse, et le module est joue par le `npm test` de la
 * racine (`regles.test.ts`). WebCrypto, que Deno et Node partagent, fait le reste.
 */

export type Plateforme = 'ios' | 'android';

/** Les bornes d'une demande, a la frontiere : au-dela, elle n'est pas lue. */
export const LIMITES = {
    corps: 32_768,
    donnees: 2_048,
    /** Le texte signe d'un retour (lot 3) : son texte libre, son contexte. */
    retour: 12_288,
    attestation: 16_384,
    assertion: 2_048,
    jeton: 8_192,
} as const;

/** Un defi vaut cinq minutes, et trente secondes d'avance d'horloge sont tolerees. */
export const DUREE_DU_DEFI_MS = 5 * 60_000;
const AVANCE_TOLEREE_MS = 30_000;

/** La fraicheur d'un verdict Play Integrity, mesuree depuis sa demande sur l'appareil. */
export const FRAICHEUR_DU_VERDICT_MS = 5 * 60_000;

export type AppareilDemande =
    | { readonly nature: 'app_attest'; readonly cle: Uint8Array<ArrayBuffer> }
    | { readonly nature: 'secret'; readonly plateforme: Plateforme; readonly secret: Uint8Array<ArrayBuffer> };

export type Preuve = { readonly assertion: Uint8Array<ArrayBuffer> } | { readonly jeton: string };

export type Demande =
    | { readonly action: 'defi' }
    | { readonly action: 'enregistrer'; readonly cle: Uint8Array<ArrayBuffer>; readonly attestation: Uint8Array<ArrayBuffer>; readonly defi: string }
    | { readonly action: 'contribuer'; readonly donnees: string; readonly appareil: AppareilDemande; readonly preuve: Preuve | null }
    | { readonly action: 'deposer'; readonly donnees: string; readonly appareil: AppareilDemande; readonly preuve: Preuve | null }
    | { readonly action: 'purger' };

export interface Contribution {
    readonly sujet: string;
    readonly cible: string;
    readonly valeur: string;
    readonly fin: string | null;
}

/** Ce que l'appareil a signe ou fait attester : le texte exact, que la fonction relit ensuite. */
export interface Donnees {
    readonly defi: string;
    readonly cle: Uint8Array<ArrayBuffer>;
    readonly contribution: Contribution;
    readonly essai: boolean;
}

export type Lecture<T> = { readonly ok: true; readonly valeur: T } | { readonly ok: false; readonly raison: string };

const refus = (raison: string): { ok: false; raison: string } => ({ ok: false, raison });

// ---------------------------------------------------------------------------
// Les octets
// ---------------------------------------------------------------------------

/** Le base64 standard ou URL, avec ou sans remplissage ; `null` pour tout le reste. */
export function depuisBase64(texte: unknown): Uint8Array<ArrayBuffer> | null {
    if (typeof texte !== 'string' || texte === '' || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(texte)) return null;
    try {
        const binaire = atob(texte.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, ''));
        const octets = new Uint8Array(binaire.length);
        for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
        return octets;
    } catch {
        return null;
    }
}

export function versBase64Url(octets: Uint8Array): string {
    let binaire = '';
    for (const octet of octets) binaire += String.fromCharCode(octet);
    return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function versHex(octets: Uint8Array): string {
    return Array.from(octets, (octet) => octet.toString(16).padStart(2, '0')).join('');
}

/** Un `bytea` tel que PostgREST le rend, `\\x` puis l'hexadecimal ; `null` pour tout le reste. */
export function depuisHexPostgres(texte: unknown): Uint8Array<ArrayBuffer> | null {
    if (typeof texte !== 'string' || !/^\\x([0-9a-f]{2})*$/i.test(texte)) return null;
    const hex = texte.slice(2);
    const octets = new Uint8Array(hex.length / 2);
    for (let i = 0; i < octets.length; i++) octets[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
    return octets;
}

/** Une comparaison qui ne s'arrete pas au premier octet different : un defi ne se devine pas par le temps. */
export function egaux(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
    return difference === 0;
}

const texte = new TextEncoder();

export function utf8(chaine: string): Uint8Array<ArrayBuffer> {
    return new Uint8Array(texte.encode(chaine));
}

export async function sha256(octets: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', octets));
}

export async function hmac(cle: Uint8Array<ArrayBuffer>, donnees: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    const k = await crypto.subtle.importKey('raw', cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, donnees));
}

// ---------------------------------------------------------------------------
// Les cles de la fonction, le defi, l'empreinte d'une adresse
// ---------------------------------------------------------------------------

export interface ClesDeLaFonction {
    readonly defi: Uint8Array<ArrayBuffer>;
    readonly ip: Uint8Array<ArrayBuffer>;
    readonly vote: Uint8Array<ArrayBuffer>;
}

/**
 * Trois cles tirees d'un seul secret de la fonction (`COMMUNAUTE_SECRET`, au moins 32 octets en
 * base64), une par usage : celle qui signe les defis ne sert jamais a une empreinte ni a un vote.
 * `null` sans secret lisible — la fonction refuse alors d'ecrire.
 */
export async function clesDeLaFonction(secret: string | undefined): Promise<ClesDeLaFonction | null> {
    const graine = depuisBase64(secret);
    if (graine === null || graine.length < 32) return null;
    return {
        defi: await hmac(graine, utf8('ukit.communaute.defi')),
        ip: await hmac(graine, utf8('ukit.communaute.ip')),
        vote: await hmac(graine, utf8('ukit.communaute.vote')),
    };
}

/**
 * Un defi sans etat : l'instant, seize octets de hasard, et les seize premiers octets de leur HMAC.
 * Il ne s'ecrit nulle part ; sa fraicheur borne le rejeu, que le compteur App Attest et la protection
 * de Play Integrity ferment ensuite.
 */
export async function nouveauDefi(cle: Uint8Array<ArrayBuffer>, maintenantMs: number, alea: Uint8Array): Promise<string> {
    const corps = new Uint8Array(24);
    new DataView(corps.buffer).setBigUint64(0, BigInt(Math.floor(maintenantMs)));
    corps.set(alea.slice(0, 16), 8);
    const sceau = (await hmac(cle, corps)).slice(0, 16);
    const defi = new Uint8Array(40);
    defi.set(corps, 0);
    defi.set(sceau, 24);
    return versBase64Url(defi);
}

export type EtatDuDefi = 'valide' | 'illisible' | 'falsifie' | 'perime';

export async function lireDefi(cle: Uint8Array<ArrayBuffer>, defi: unknown, maintenantMs: number): Promise<EtatDuDefi> {
    const octets = depuisBase64(defi);
    if (octets === null || octets.length !== 40) return 'illisible';
    const corps = octets.slice(0, 24);
    if (!egaux((await hmac(cle, corps)).slice(0, 16), octets.slice(24))) return 'falsifie';
    const instant = Number(new DataView(corps.buffer).getBigUint64(0));
    if (instant > maintenantMs + AVANCE_TOLEREE_MS || maintenantMs - instant > DUREE_DU_DEFI_MS) return 'perime';
    return 'valide';
}

/** Le jour de Paris d'un instant, `AAAA-MM-JJ` : celui des plafonds et des empreintes. */
export function jourDeParis(instant: Date): string {
    return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/**
 * L'adresse du client, telle que la plateforme la pose en tete de `x-forwarded-for` ; une valeur qui
 * n'a pas la forme d'une adresse vaut `inconnue`, et toutes les demandes sans adresse partagent alors
 * un seul compteur — le plafond se resserre plutot que de s'ouvrir.
 */
export function adresseDuClient(entetes: { get(nom: string): string | null }): string {
    const premiere = (entetes.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? '';
    return /^[0-9A-Fa-f:.]{2,45}$/.test(premiere) ? premiere : 'inconnue';
}

/**
 * L'empreinte d'une adresse pour un jour, sous la cle de ce jour (un HMAC du jour par la cle des
 * adresses) : la base ne voit qu'elle, et deux jours ne se relient pas.
 */
export async function empreinteDAdresse(cle: Uint8Array<ArrayBuffer>, adresse: string, jour: string): Promise<Uint8Array<ArrayBuffer>> {
    return hmac(await hmac(cle, utf8(jour)), utf8(adresse));
}

/**
 * Ce qui tient lieu d'appareil dans un vote : un HMAC de sa cle, du sujet et de la cible. Il refuse un
 * second bulletin sur la meme cible, et ne relie ni deux votes ni un vote a un appareil.
 */
export async function jetonDeVote(cle: Uint8Array<ArrayBuffer>, appareil: Uint8Array, sujet: string, cible: string): Promise<Uint8Array<ArrayBuffer>> {
    const suffixe = utf8(`|${sujet}|${cible}`);
    const message = new Uint8Array(appareil.length + suffixe.length);
    message.set(appareil, 0);
    message.set(suffixe, appareil.length);
    return hmac(cle, message);
}

/** Le `requestHash` d'une demande Play Integrity : l'empreinte du texte exact des donnees. */
export async function empreinteDeDemande(donnees: string): Promise<string> {
    return versBase64Url(await sha256(utf8(donnees)));
}

// ---------------------------------------------------------------------------
// La forme d'une demande
// ---------------------------------------------------------------------------

function objet(valeur: unknown): Record<string, unknown> | null {
    return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur) ? valeur as Record<string, unknown> : null;
}

function octetsBornes(valeur: unknown, longueur: number | { max: number }): Uint8Array<ArrayBuffer> | null {
    if (typeof valeur !== 'string' || valeur.length > (typeof longueur === 'number' ? longueur * 2 : longueur.max * 2)) return null;
    const octets = depuisBase64(valeur);
    if (octets === null) return null;
    if (typeof longueur === 'number' ? octets.length !== longueur : octets.length > longueur.max) return null;
    return octets;
}

function lireAppareil(valeur: unknown): AppareilDemande | null {
    const a = objet(valeur);
    if (a === null) return null;
    if (a.nature === 'app_attest') {
        const cle = octetsBornes(a.cle, 32);
        return cle === null ? null : { nature: 'app_attest', cle };
    }
    if (a.nature === 'secret' && (a.plateforme === 'ios' || a.plateforme === 'android')) {
        const secret = octetsBornes(a.secret, 32);
        return secret === null ? null : { nature: 'secret', plateforme: a.plateforme, secret };
    }
    return null;
}

function lirePreuve(valeur: unknown): Lecture<Preuve | null> {
    if (valeur === undefined || valeur === null) return { ok: true, valeur: null };
    const p = objet(valeur);
    if (p === null) return refus('preuve');
    if (typeof p.assertion === 'string') {
        const assertion = octetsBornes(p.assertion, { max: LIMITES.assertion });
        return assertion === null ? refus('preuve') : { ok: true, valeur: { assertion } };
    }
    if (typeof p.jeton === 'string' && p.jeton.length > 0 && p.jeton.length <= LIMITES.jeton && /^[A-Za-z0-9._-]+$/.test(p.jeton)) {
        return { ok: true, valeur: { jeton: p.jeton } };
    }
    return refus('preuve');
}

function lireEnregistrement(d: Record<string, unknown>): Lecture<Demande> {
    const cle = octetsBornes(d.cle, 32);
    const attestation = octetsBornes(d.attestation, { max: LIMITES.attestation });
    if (cle === null || attestation === null || typeof d.defi !== 'string' || d.defi.length > 64) return refus('forme');
    return { ok: true, valeur: { action: 'enregistrer', cle, attestation, defi: d.defi } };
}

/** Une contribution ou un retour : le texte signe, l'appareil, sa preuve ; seule la borne du texte change. */
function lireUnEnvoi(d: Record<string, unknown>, action: 'contribuer' | 'deposer'): Lecture<Demande> {
    const appareil = lireAppareil(d.appareil);
    const borne = action === 'deposer' ? LIMITES.retour : LIMITES.donnees;
    if (typeof d.donnees !== 'string' || d.donnees.length > borne || appareil === null) return refus('forme');
    const preuve = lirePreuve(d.preuve);
    if (preuve.ok === false) return preuve;
    // Une cle App Attest prouve par une assertion, et seulement elle ; un secret, par un jeton ou rien.
    const assertion = preuve.valeur !== null && 'assertion' in preuve.valeur;
    if ((appareil.nature === 'app_attest') !== assertion) return refus('preuve');
    return { ok: true, valeur: { action, donnees: d.donnees, appareil, preuve: preuve.valeur } };
}

/** Le corps d'une demande, deja lu en JSON. Aucune valeur n'en sort sans avoir ete bornee. */
export function lireDemande(corps: unknown): Lecture<Demande> {
    const d = objet(corps);
    if (d === null) return refus('forme');
    if (d.action === 'defi') return { ok: true, valeur: { action: 'defi' } };
    if (d.action === 'enregistrer') return lireEnregistrement(d);
    if (d.action === 'contribuer' || d.action === 'deposer') return lireUnEnvoi(d, d.action);
    // La purge des captures (lot 3), que la tache horaire de la base declenche : elle n'efface que ce
    // que la base designe, et ne prend aucun parametre.
    if (d.action === 'purger') return { ok: true, valeur: { action: 'purger' } };
    return refus('action');
}

const SUJET = /^[a-z]+(\.[a-z_]+)+$/;
const CIBLE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

function lireContribution(valeur: unknown): Contribution | null {
    const c = objet(valeur);
    if (c === null) return null;
    const { sujet, cible, valeur: v, fin } = c;
    if (typeof sujet !== 'string' || !SUJET.test(sujet) || sujet.length > 48) return null;
    if (typeof cible !== 'string' || !CIBLE.test(cible)) return null;
    if (typeof v !== 'string' || v.length < 1 || v.length > 120) return null;
    if (fin !== undefined && fin !== null && !(typeof fin === 'string' && JOUR.test(fin))) return null;
    return { sujet, cible, valeur: v, fin: typeof fin === 'string' ? fin : null };
}

/**
 * Les donnees signees, relues apres la preuve. La forme seule : le vocabulaire, la valeur et la fin se
 * jugent dans la base, qui porte les sujets.
 */
export function lireDonnees(texteSigne: string): Lecture<Donnees> {
    let brut: unknown;
    try {
        brut = JSON.parse(texteSigne);
    } catch {
        return refus('donnees');
    }
    const d = objet(brut);
    if (d === null || typeof d.defi !== 'string' || typeof d.essai !== 'boolean') return refus('donnees');
    const cle = octetsBornes(d.cle, 32);
    const contribution = lireContribution(d.contribution);
    if (cle === null || contribution === null) return refus('donnees');
    return { ok: true, valeur: { defi: d.defi, cle, contribution, essai: d.essai } };
}

// ---------------------------------------------------------------------------
// Le verdict Play Integrity
// ---------------------------------------------------------------------------

export interface VerdictAttendu {
    readonly paquet: string;
    readonly requestHash: string;
    readonly maintenantMs: number;
}

/**
 * La reponse de `decodeIntegrityToken` jugee contre la demande (developer.android.com, « Integrity
 * verdicts ») : d'abord que le verdict est celui de cette demande — le paquet, l'empreinte, la
 * fraicheur —, puis l'application reconnue par Google Play et l'appareil integre. Un jeton dechiffre
 * deux fois rend des verdicts vides : la protection contre le rejeu de Google tombe ici en « non
 * atteste ».
 */
export function evaluerVerdict(reponse: unknown, attendu: VerdictAttendu): { readonly atteste: boolean; readonly raison: string } {
    const charge = objet(objet(reponse)?.tokenPayloadExternal);
    const demande = objet(charge?.requestDetails);
    if (charge === null || demande === null) return { atteste: false, raison: 'verdict_illisible' };
    const ecart = ecartDeDemande(demande, attendu);
    if (ecart !== null) return { atteste: false, raison: ecart };
    const application = objet(charge.appIntegrity);
    if (application?.appRecognitionVerdict !== 'PLAY_RECOGNIZED' || application.packageName !== attendu.paquet) {
        return { atteste: false, raison: 'application' };
    }
    const etiquettes = objet(charge.deviceIntegrity)?.deviceRecognitionVerdict;
    if (!Array.isArray(etiquettes) || !etiquettes.includes('MEETS_DEVICE_INTEGRITY')) return { atteste: false, raison: 'appareil' };
    return { atteste: true, raison: 'atteste' };
}

/** Ce qui fait d'un verdict celui d'une autre demande : le paquet, l'empreinte, l'instant. */
function ecartDeDemande(demande: Record<string, unknown>, attendu: VerdictAttendu): string | null {
    if (demande.requestPackageName !== attendu.paquet) return 'paquet';
    if (demande.requestHash !== attendu.requestHash) return 'empreinte';
    const instant = Number(demande.timestampMillis);
    const age = attendu.maintenantMs - instant;
    if (!Number.isFinite(instant) || age > FRAICHEUR_DU_VERDICT_MS || -age > AVANCE_TOLEREE_MS) return 'perime';
    return null;
}

// ---------------------------------------------------------------------------
// Les reponses
// ---------------------------------------------------------------------------

/**
 * Le statut HTTP d'un refus : 429 pour un plafond — l'application attend et ne rejoue pas tout de
 * suite —, 409 pour un etat a refaire (une cle a reenregistrer, un vote deja donne), 403 pour un
 * appareil bloque, 401 pour une preuve fausse, 422 pour une contribution que le vocabulaire refuse,
 * 400 pour une demande mal formee.
 */
const A_REFAIRE = new Set(['appareil_inconnu', 'compteur_rejoue', 'deja_vote', 'cle_differente']);
const PREUVES_FAUSSES = new Set(['defi', 'attestation', 'assertion', 'cle']);
const HORS_VOCABULAIRE = new Set(['sujet_inconnu', 'valeur_invalide', 'cible_invalide', 'fin_invalide', 'retour_invalide']);

export function statutDuRefus(raison: string): number {
    if (raison.startsWith('plafond_')) return 429;
    if (A_REFAIRE.has(raison)) return 409;
    if (raison === 'appareil_bloque') return 403;
    if (PREUVES_FAUSSES.has(raison)) return 401;
    if (HORS_VOCABULAIRE.has(raison)) return 422;
    return 400;
}
