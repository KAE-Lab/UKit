/**
 * Le dechiffrement d'un jeton Play Integrity par Google (developer.android.com, « Make a standard API
 * request ») : un jeton d'acces tire du compte de service, puis `decodeIntegrityToken`.
 *
 * Le jeton d'acces est un JWT signe RS256 par la cle du compte de service, echange contre un jeton
 * OAuth (« JWT bearer », RFC 7523) : WebCrypto le signe, sans bibliotheque — c'est une signature que
 * Google verifie, et une erreur ici se voit au premier essai, refusee. Le transport est recu en
 * parametre, pour que `google.test.ts` le joue sans reseau ; aucun import, comme `regles.ts`.
 *
 * Le compte de service vit dans le secret `PLAY_INTEGRITY_COMPTE_DE_SERVICE` de la fonction : le
 * fichier JSON que Google Cloud rend, entier. Absent, Android reste au chemin non atteste.
 */

export interface CompteDeService {
    readonly client_email: string;
    readonly private_key: string;
    readonly token_uri: string;
}

export type Transport = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const PORTEE = 'https://www.googleapis.com/auth/playintegrity';
const JETON_OAUTH = 'https://oauth2.googleapis.com/token';

/** Le fichier du compte de service, ou `null` s'il manque ou ne porte pas ce qu'il faut. */
export function lireCompteDeService(json: string | undefined): CompteDeService | null {
    if (json === undefined || json.trim() === '') return null;
    try {
        const c = JSON.parse(json) as Record<string, unknown>;
        if (typeof c.client_email !== 'string' || typeof c.private_key !== 'string' || !c.private_key.includes('PRIVATE KEY')) return null;
        const tokenUri = typeof c.token_uri === 'string' && c.token_uri.startsWith('https://') ? c.token_uri : JETON_OAUTH;
        return { client_email: c.client_email, private_key: c.private_key, token_uri: tokenUri };
    } catch {
        return null;
    }
}

function base64Url(octets: Uint8Array): string {
    let binaire = '';
    for (const octet of octets) binaire += String.fromCharCode(octet);
    return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pkcs8(pem: string): Uint8Array<ArrayBuffer> {
    const corps = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
    const binaire = atob(corps);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return octets;
}

/** L'assertion signee que Google echange contre un jeton d'acces, valable une heure. */
export async function assertionDuCompte(compte: CompteDeService, maintenantMs: number): Promise<string> {
    const encodeur = new TextEncoder();
    const iat = Math.floor(maintenantMs / 1000);
    const entete = base64Url(encodeur.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const charge = base64Url(encodeur.encode(JSON.stringify({ iss: compte.client_email, scope: PORTEE, aud: compte.token_uri, iat, exp: iat + 3600 })));
    const cle = await crypto.subtle.importKey('pkcs8', pkcs8(compte.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cle, encodeur.encode(`${entete}.${charge}`)));
    return `${entete}.${charge}.${base64Url(signature)}`;
}

/** Le jeton d'acces en memoire, pour la vie de l'instance : un par heure, pas un par contribution. */
let enMemoire: { jeton: string; expire: number } | null = null;

export async function jetonDAcces(compte: CompteDeService, maintenantMs: number, transport: Transport): Promise<string> {
    if (enMemoire !== null && enMemoire.expire - 60_000 > maintenantMs) return enMemoire.jeton;
    const corps = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await assertionDuCompte(compte, maintenantMs),
    }).toString();
    const r = await transport(compte.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps });
    if (!r.ok) throw new Error(`jeton d acces refuse (${r.status})`);
    const reponse = await r.json() as { access_token?: unknown; expires_in?: unknown };
    if (typeof reponse.access_token !== 'string') throw new Error('jeton d acces illisible');
    const duree = typeof reponse.expires_in === 'number' ? reponse.expires_in : 3600;
    enMemoire = { jeton: reponse.access_token, expire: maintenantMs + duree * 1000 };
    return reponse.access_token;
}

/** Oublie le jeton d'acces en memoire : un 401 de Google en demande un autre. */
export function oublierLeJetonDAcces(): void {
    enMemoire = null;
}

/** Le verdict d'un jeton, tel que Google le rend ; `evaluerVerdict` (regles.ts) le juge. */
export async function dechiffrerLeJeton(paquet: string, jeton: string, acces: string, transport: Transport): Promise<unknown> {
    const r = await transport(`https://playintegrity.googleapis.com/v1/${encodeURIComponent(paquet)}:decodeIntegrityToken`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${acces}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrity_token: jeton }),
    });
    if (r.status === 401) oublierLeJetonDAcces();
    if (!r.ok) throw new Error(`decodeIntegrityToken ${r.status}`);
    return r.json();
}
