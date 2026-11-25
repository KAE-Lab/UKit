/**
 * Le client Google de Play Integrity, joue sans reseau : le transport est un faux qui enregistre ce
 * qu'il recoit. La cle du compte de service est tiree ici, jamais lue d'un fichier.
 *
 *     npm test
 */

import { beforeEach, describe, expect, test } from 'vitest';

import { assertionDuCompte, dechiffrerLeJeton, jetonDAcces, lireCompteDeService, oublierLeJetonDAcces, PORTEE, type Transport } from './google';

const MAINTENANT = Date.parse('2026-11-25T12:00:00Z');

async function compteDEssai() {
    const cles = await crypto.subtle.generateKey(
        { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true, ['sign', 'verify'],
    ) as CryptoKeyPair;
    const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', cles.privateKey)).toString('base64');
    const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----\n`;
    const json = JSON.stringify({ type: 'service_account', client_email: 'essai@projet.iam.gserviceaccount.com', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' });
    return { compte: lireCompteDeService(json), publique: cles.publicKey };
}

function fauxTransport(reponses: Array<{ status: number; corps: unknown }>) {
    const appels: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
    const transport: Transport = async (url, init) => {
        appels.push({ url, headers: init.headers, body: init.body });
        const r = reponses.shift() ?? { status: 500, corps: {} };
        return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.corps };
    };
    return { transport, appels };
}

const deBase64Url = (texte: string) => Buffer.from(texte.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

beforeEach(() => oublierLeJetonDAcces());

describe('le compte de service', () => {
    test('un fichier sans cle, illisible ou absent ne fait pas de compte', () => {
        expect(lireCompteDeService(undefined)).toBeNull();
        expect(lireCompteDeService('')).toBeNull();
        expect(lireCompteDeService('{pas du json')).toBeNull();
        expect(lireCompteDeService(JSON.stringify({ client_email: 'a@b' }))).toBeNull();
    });

    test('l assertion est un JWT RS256 a la portee de Play Integrity, signe par la cle du compte', async () => {
        const { compte, publique } = await compteDEssai();
        const jwt = await assertionDuCompte(compte!, MAINTENANT);
        const [entete, charge, signature] = jwt.split('.');
        expect(JSON.parse(deBase64Url(entete).toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
        expect(JSON.parse(deBase64Url(charge).toString())).toEqual({
            iss: 'essai@projet.iam.gserviceaccount.com', scope: PORTEE, aud: 'https://oauth2.googleapis.com/token',
            iat: MAINTENANT / 1000, exp: MAINTENANT / 1000 + 3600,
        });
        const valide = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publique, new Uint8Array(deBase64Url(signature)), new TextEncoder().encode(`${entete}.${charge}`));
        expect(valide).toBe(true);
    });
});

describe('le jeton d acces et le dechiffrement', () => {
    test('le jeton d acces se demande une fois, puis vit en memoire jusqu a une minute de son expiration', async () => {
        const { compte } = await compteDEssai();
        const { transport, appels } = fauxTransport([
            { status: 200, corps: { access_token: 'acces-1', expires_in: 3600 } },
            { status: 200, corps: { access_token: 'acces-2', expires_in: 3600 } },
        ]);
        expect(await jetonDAcces(compte!, MAINTENANT, transport)).toBe('acces-1');
        expect(await jetonDAcces(compte!, MAINTENANT + 30 * 60_000, transport)).toBe('acces-1');
        expect(appels).toHaveLength(1);
        expect(new URLSearchParams(appels[0].body).get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
        expect(await jetonDAcces(compte!, MAINTENANT + 59 * 60_000 + 1, transport)).toBe('acces-2');
    });

    test('un refus de Google leve, sans jeton en memoire', async () => {
        const { compte } = await compteDEssai();
        const { transport } = fauxTransport([{ status: 400, corps: { error: 'invalid_grant' } }]);
        await expect(jetonDAcces(compte!, MAINTENANT, transport)).rejects.toThrow('400');
    });

    test('le dechiffrement vise le paquet, porte le jeton d acces, et un 401 oublie ce dernier', async () => {
        const { compte } = await compteDEssai();
        const { transport, appels } = fauxTransport([
            { status: 200, corps: { tokenPayloadExternal: { requestDetails: {} } } },
            { status: 401, corps: {} },
            { status: 200, corps: { access_token: 'acces-neuf', expires_in: 3600 } },
        ]);
        expect(await dechiffrerLeJeton('com.bordeaux1.emplois', 'jeton.de.lappareil', 'acces-1', transport)).toEqual({ tokenPayloadExternal: { requestDetails: {} } });
        expect(appels[0].url).toBe('https://playintegrity.googleapis.com/v1/com.bordeaux1.emplois:decodeIntegrityToken');
        expect(appels[0].headers.Authorization).toBe('Bearer acces-1');
        expect(JSON.parse(appels[0].body)).toEqual({ integrity_token: 'jeton.de.lappareil' });
        await expect(dechiffrerLeJeton('com.bordeaux1.emplois', 'jeton', 'acces-1', transport)).rejects.toThrow('401');
        expect(await jetonDAcces(compte!, MAINTENANT, transport)).toBe('acces-neuf');
    });
});
