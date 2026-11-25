/**
 * La verification App Attest cote serveur : l'attestation d'une cle a son enregistrement, puis
 * l'assertion de chaque contribution — les etapes de « Validating apps that connect to your server »
 * (developer.apple.com, DeviceCheck), chacune nommee par la raison de son refus.
 *
 * Le CBOR et les certificats passent par deux bibliotheques eprouvees, `cborg` et `@peculiar/x509` ;
 * ce module ne fait que les controles du protocole. Il tourne sous Deno — la fonction `communaute`
 * resout ces paquets par son `deno.json` — et sous Node, ou vitest les trouve en dependances de
 * developpement : aucun import relatif, aucune API propre a l'un des deux, WebCrypto pour le reste.
 * `deno-imports.test.ts` garde les versions des deux cotes egales.
 *
 * Le module de l'application (`@expo/app-integrity`) hache lui-meme le defi : l'appareil signe
 * `SHA-256(utf8(defi))`, et la verification refait ce hachage sur le texte recu.
 */

import 'reflect-metadata';
import { AsnEcSignatureFormatter, X509Certificate } from '@peculiar/x509';
import { decode } from 'cborg';

/**
 * La racine « Apple App Attestation Root CA », telle qu'Apple la publie
 * (https://www.apple.com/certificateauthority/Apple_App_Attestation_Root_CA.pem, relevee le
 * 2026-11-25, empreinte SHA-256 1C:B9:82:3B:A2:8B:A6:AD:2D:33:A0:06:94:1D:E2:AE:4F:51:3E:F1:D4:E8:31:B9:F7:E0:FA:7B:62:42:C9:32,
 * valable jusqu'en 2045). Epinglee : une chaine qui n'y remonte pas n'atteste rien.
 */
export const RACINE_APP_ATTEST = `-----BEGIN CERTIFICATE-----
MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYw
JAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwK
QXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNa
Fw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlv
biBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9y
bmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdh
NbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9au
Yen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/
MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYw
CgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn
53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijV
oyFraWVIyd/dganmrduC1bmTBGwD
-----END CERTIFICATE-----`;

/** L'extension de la feuille qui porte le nonce. */
const OID_NONCE = '1.2.840.113635.100.8.2';

/**
 * La forme exacte de cette extension : `SEQUENCE { [1] { OCTET STRING (32) } }`. Comparer l'en-tete
 * octet par octet plutot que d'analyser un ASN.1 quelconque : une seule forme est valable.
 */
const ENTETE_DU_NONCE = [0x30, 0x24, 0xa1, 0x22, 0x04, 0x20] as const;

/** L'AAGUID dit l'environnement d'App Attest ; le serveur accepte les deux (phase 8, securite). */
const AAGUIDS: ReadonlyArray<readonly [Environnement, string]> = [
    ['production', 'appattest\0\0\0\0\0\0\0'],
    ['developpement', 'appattestdevelop'],
];

/** Le CBOR d'un appareil est une entree non fiable : toutes les rigueurs de `cborg` sont demandees. */
const CBOR_STRICT = {
    strict: true,
    rejectDuplicateMapKeys: true,
    rejectInvalidUtf8: true,
    allowIndefinite: false,
    allowUndefined: false,
    allowNaN: false,
    allowInfinity: false,
} as const;

export type Environnement = 'production' | 'developpement';

/** Un refus, avec sa raison : l'application ne la montre pas, le journal de la fonction la garde. */
export class RefusAppAttest extends Error {
    constructor(readonly raison: string) {
        super(`App Attest refuse : ${raison}`);
        this.name = 'RefusAppAttest';
    }
}

export interface DonneesDAuthentification {
    readonly rpIdHash: Uint8Array;
    readonly drapeaux: number;
    readonly compteur: number;
    /** Presents a l'attestation seulement. */
    readonly aaguid: Uint8Array | null;
    readonly credentialId: Uint8Array | null;
}

function octets(valeur: unknown): Uint8Array<ArrayBuffer> | null {
    return valeur instanceof Uint8Array ? new Uint8Array(valeur) : null;
}

function egaux(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
    return difference === 0;
}

async function sha256(...parties: Uint8Array[]): Promise<Uint8Array<ArrayBuffer>> {
    const tout = new Uint8Array(parties.reduce((n, p) => n + p.length, 0));
    let rang = 0;
    for (const partie of parties) {
        tout.set(partie, rang);
        rang += partie.length;
    }
    return new Uint8Array(await crypto.subtle.digest('SHA-256', tout));
}

function decoder(cbor: Uint8Array): Record<string, unknown> {
    let objet: unknown;
    try {
        objet = decode(cbor, CBOR_STRICT);
    } catch {
        throw new RefusAppAttest('cbor_illisible');
    }
    if (typeof objet !== 'object' || objet === null || Array.isArray(objet)) throw new RefusAppAttest('forme');
    return objet as Record<string, unknown>;
}

/**
 * Les donnees d'authentification, au format de WebAuthn : l'empreinte de l'application (32 octets),
 * les drapeaux (1), le compteur (4, gros-boutiste), puis, a l'attestation, l'AAGUID (16), la longueur
 * de l'identifiant de la cle (2) et l'identifiant.
 *
 * C'est la nature du message qui decide de la suite, pas le drapeau AT : l'iPhone le leve aussi dans
 * ses assertions, qui s'arretent pourtant au compteur (37 octets, mesure sur la fixture iOS 14.3).
 */
export function lireDonneesDAuthentification(donnees: Uint8Array, attestation: boolean): DonneesDAuthentification {
    if (donnees.length < 37) throw new RefusAppAttest('donnees_courtes');
    const vue = new DataView(donnees.buffer, donnees.byteOffset, donnees.byteLength);
    const drapeaux = donnees[32];
    const base = { rpIdHash: donnees.slice(0, 32), drapeaux, compteur: vue.getUint32(33) };
    if (!attestation) return { ...base, aaguid: null, credentialId: null };
    if ((drapeaux & 0x40) === 0 || donnees.length < 55) throw new RefusAppAttest('donnees_courtes');
    const longueur = vue.getUint16(53);
    if (donnees.length < 55 + longueur) throw new RefusAppAttest('donnees_courtes');
    return { ...base, aaguid: donnees.slice(37, 53), credentialId: donnees.slice(55, 55 + longueur) };
}

/** L'empreinte `rpIdHash` d'une des applications acceptees, `<equipe>.<bundle>`. */
async function estUneDesApplications(rpIdHash: Uint8Array, applications: readonly string[]): Promise<boolean> {
    for (const application of applications) {
        if (egaux(rpIdHash, await sha256(new TextEncoder().encode(application)))) return true;
    }
    return false;
}

function environnementDe(aaguid: Uint8Array | null): Environnement | null {
    if (aaguid === null) return null;
    const lu = String.fromCharCode(...aaguid);
    return AAGUIDS.find(([, attendu]) => attendu === lu)?.[0] ?? null;
}

export interface Attestation {
    /** L'objet rendu par `attestKeyAsync`, decode du base64. */
    readonly attestation: Uint8Array;
    /** Le defi, tel que l'appareil l'a fait attester. */
    readonly clientData: Uint8Array;
    /** L'identifiant de la cle annonce par l'appareil : 32 octets. */
    readonly cle: Uint8Array;
    readonly applications: readonly string[];
    readonly maintenant: Date;
    /** Une autre racine, pour les essais seulement. */
    readonly racine?: string;
}

/** La chaine de l'attestation : la feuille signee par l'intermediaire, lui par la racine epinglee. */
async function feuilleDeLaChaine(chaine: readonly Uint8Array[], racinePem: string, maintenant: Date): Promise<X509Certificate> {
    let feuille: X509Certificate;
    let intermediaire: X509Certificate;
    let racine: X509Certificate;
    try {
        feuille = new X509Certificate(new Uint8Array(chaine[0]));
        intermediaire = new X509Certificate(new Uint8Array(chaine[1]));
        racine = new X509Certificate(racinePem);
    } catch {
        throw new RefusAppAttest('certificat_illisible');
    }
    // Chacun dans sa periode de validite, a l'instant de la verification.
    const valide = await intermediaire.verify({ publicKey: racine, date: maintenant })
        && await feuille.verify({ publicKey: intermediaire, date: maintenant });
    if (!valide) throw new RefusAppAttest('chaine');
    return feuille;
}

/** Le nonce, SHA-256(authData || SHA-256(clientData)), tel que l'extension de la feuille le porte. */
async function verifierLeNonce(feuille: X509Certificate, authData: Uint8Array, clientData: Uint8Array): Promise<void> {
    const nonce = await sha256(authData, await sha256(clientData));
    const extension = feuille.getExtension(OID_NONCE);
    const valeur = extension === null ? null : new Uint8Array(extension.value);
    const conforme = valeur !== null && valeur.length === ENTETE_DU_NONCE.length + 32
        && ENTETE_DU_NONCE.every((attendu, rang) => valeur[rang] === attendu)
        && egaux(valeur.slice(ENTETE_DU_NONCE.length), nonce);
    if (!conforme) throw new RefusAppAttest('nonce');
}

/**
 * Une cle attestee par Apple : sa chaine, son nonce, son identifiant, l'application, un compteur a
 * zero. Rend son point public non compresse, de quoi verifier ses assertions, et son environnement.
 */
export async function verifierAttestation(a: Attestation): Promise<{ clePublique: Uint8Array<ArrayBuffer>; environnement: Environnement }> {
    const objet = decoder(a.attestation);
    const declaration = objet.attStmt as Record<string, unknown> | undefined;
    const chaine = Array.isArray(declaration?.x5c) ? declaration.x5c : [];
    const authData = octets(objet.authData);
    if (objet.fmt !== 'apple-appattest') throw new RefusAppAttest('format');
    if (chaine.length < 2 || !chaine.every((c) => c instanceof Uint8Array) || authData === null) throw new RefusAppAttest('forme');

    // 1. La chaine, puis 2. le nonce.
    const feuille = await feuilleDeLaChaine(chaine as Uint8Array[], a.racine ?? RACINE_APP_ATTEST, a.maintenant);
    await verifierLeNonce(feuille, authData, a.clientData);

    // 3. La cle de la feuille : son point non compresse, dont l'empreinte est l'identifiant annonce.
    const clePublique = new Uint8Array(await crypto.subtle.exportKey('raw', await feuille.publicKey.export()));
    if (clePublique.length !== 65 || !egaux(await sha256(clePublique), a.cle)) throw new RefusAppAttest('cle');

    // 4. Les donnees d'authentification : l'application, un compteur a zero, l'environnement, la cle.
    const donnees = lireDonneesDAuthentification(authData, true);
    if (!(await estUneDesApplications(donnees.rpIdHash, a.applications))) throw new RefusAppAttest('application');
    if (donnees.compteur !== 0) throw new RefusAppAttest('compteur');
    const environnement = environnementDe(donnees.aaguid);
    if (environnement === null) throw new RefusAppAttest('environnement');
    if (donnees.credentialId === null || !egaux(donnees.credentialId, a.cle)) throw new RefusAppAttest('identifiant');
    return { clePublique, environnement };
}

export interface Assertion {
    /** L'objet rendu par `generateAssertionAsync`, decode du base64. */
    readonly assertion: Uint8Array;
    /** Le texte exact que l'appareil a signe. */
    readonly clientData: Uint8Array;
    /** Le point public enregistre a l'attestation. */
    readonly clePublique: Uint8Array;
    readonly applications: readonly string[];
    /** Le dernier compteur accepte pour cette cle : une assertion doit le depasser. */
    readonly compteurConnu: number;
}

/**
 * Une contribution signee par une cle attestee : la signature ECDSA sur le nonce, l'application, un
 * compteur qui monte. Rend le nouveau compteur, que la base n'accepte que s'il depasse le sien — le
 * controle d'ici ne tient pas a lui seul contre deux demandes simultanees.
 */
export async function verifierAssertion(a: Assertion): Promise<{ compteur: number }> {
    const objet = decoder(a.assertion);
    const signature = octets(objet.signature);
    const authenticatorData = octets(objet.authenticatorData);
    if (signature === null || authenticatorData === null) throw new RefusAppAttest('forme');

    const nonce = await sha256(authenticatorData, await sha256(a.clientData));
    let valide = false;
    try {
        const cle = await crypto.subtle.importKey('raw', new Uint8Array(a.clePublique), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        const brute = new AsnEcSignatureFormatter().toWebSignature({ name: 'ECDSA', namedCurve: 'P-256' } as Algorithm, signature);
        valide = brute !== null && await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cle, brute, nonce);
    } catch {
        valide = false;
    }
    if (!valide) throw new RefusAppAttest('signature');

    const donnees = lireDonneesDAuthentification(authenticatorData, false);
    if (!(await estUneDesApplications(donnees.rpIdHash, a.applications))) throw new RefusAppAttest('application');
    if (donnees.compteur <= a.compteurConnu) throw new RefusAppAttest('compteur');
    return { compteur: donnees.compteur };
}
