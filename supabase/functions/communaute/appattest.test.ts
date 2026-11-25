/**
 * La verification App Attest, sur l'attestation et l'assertion d'un vrai iPhone (fixture enregistree,
 * environnement de developpement), puis sur une chaine fabriquee ici pour l'environnement de
 * production, qu'aucune fixture publique ne porte. Chaque refus est provoque par une seule alteration.
 *
 *     npm test
 */

import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as x509 from '@peculiar/x509';
import { decode, encode } from 'cborg';
import { describe, expect, test } from 'vitest';

import { lireDonneesDAuthentification, RefusAppAttest, verifierAssertion, verifierAttestation } from './appattest';

interface Fixture {
    readonly application: string;
    readonly attestation: { instant: string; cle: string; clientData: string; objet: string };
    readonly assertion: { instant: string; clientData: string; compteur: number; objet: string };
}

const FIXTURE = JSON.parse(readFileSync(join(__dirname, 'fixtures/app-attest-ios-14.3.json'), 'utf8')) as Fixture;
const b64 = (texte: string) => new Uint8Array(Buffer.from(texte, 'base64'));
const sha256 = async (octets: Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(octets)));

const ATTESTATION = {
    attestation: b64(FIXTURE.attestation.objet),
    clientData: b64(FIXTURE.attestation.clientData),
    cle: b64(FIXTURE.attestation.cle),
    applications: [FIXTURE.application],
    maintenant: new Date(FIXTURE.attestation.instant),
};

async function raison(promesse: Promise<unknown>): Promise<string> {
    try {
        await promesse;
    } catch (erreur) {
        if (erreur instanceof RefusAppAttest) return erreur.raison;
        throw erreur;
    }
    return 'accepte';
}

describe('l attestation d un vrai iPhone', () => {
    test('est acceptee, en developpement, et rend la cle dont l identifiant est l empreinte', async () => {
        const { clePublique, environnement } = await verifierAttestation(ATTESTATION);
        expect(environnement).toBe('developpement');
        expect(clePublique.length).toBe(65);
        expect(clePublique[0]).toBe(0x04);
        expect(await sha256(clePublique)).toEqual(ATTESTATION.cle);
    });

    test('une autre application la refuse', async () => {
        expect(await raison(verifierAttestation({ ...ATTESTATION, applications: ['6MURL8TA57.com.bordeaux.ukit'] }))).toBe('application');
    });

    test('un autre defi la refuse', async () => {
        expect(await raison(verifierAttestation({ ...ATTESTATION, clientData: new TextEncoder().encode('un autre defi') }))).toBe('nonce');
    });

    test('un autre identifiant de cle la refuse', async () => {
        const autre = new Uint8Array(ATTESTATION.cle);
        autre[0] ^= 1;
        expect(await raison(verifierAttestation({ ...ATTESTATION, cle: autre }))).toBe('cle');
    });

    test('hors de la validite de la feuille, la chaine ne tient plus', async () => {
        expect(await raison(verifierAttestation({ ...ATTESTATION, maintenant: new Date('2026-11-25T00:00:00Z') }))).toBe('chaine');
    });

    test('une autre racine que celle d Apple la refuse', async () => {
        const { certificat } = await autorite('CN=Fausse racine', 'P-384');
        expect(await raison(verifierAttestation({ ...ATTESTATION, racine: certificat.toString('pem') }))).toBe('chaine');
    });

    test('des donnees d authentification retouchees ne portent plus le nonce', async () => {
        const objet = decode(ATTESTATION.attestation) as Record<string, unknown>;
        const authData = new Uint8Array(objet.authData as Uint8Array);
        authData[40] ^= 1;
        expect(await raison(verifierAttestation({ ...ATTESTATION, attestation: encode({ ...objet, authData }) }))).toBe('nonce');
    });

    test('un autre format, ou un CBOR illisible, est refuse', async () => {
        const objet = decode(ATTESTATION.attestation) as Record<string, unknown>;
        expect(await raison(verifierAttestation({ ...ATTESTATION, attestation: encode({ ...objet, fmt: 'packed' }) }))).toBe('format');
        expect(await raison(verifierAttestation({ ...ATTESTATION, attestation: new Uint8Array([0xff, 0x00, 0x01]) }))).toBe('cbor_illisible');
        expect(await raison(verifierAttestation({ ...ATTESTATION, attestation: encode({ fmt: 'apple-appattest', attStmt: { x5c: [] }, authData: new Uint8Array(40) }) }))).toBe('forme');
    });
});

describe('l assertion d un vrai iPhone', () => {
    async function assertion() {
        const { clePublique } = await verifierAttestation(ATTESTATION);
        return {
            assertion: b64(FIXTURE.assertion.objet),
            clientData: b64(FIXTURE.assertion.clientData),
            clePublique,
            applications: [FIXTURE.application],
            compteurConnu: 0,
        };
    }

    test('est acceptee et rend son compteur', async () => {
        expect(await verifierAssertion(await assertion())).toEqual({ compteur: FIXTURE.assertion.compteur });
    });

    test('un compteur qui ne monte pas la refuse', async () => {
        expect(await raison(verifierAssertion({ ...(await assertion()), compteurConnu: FIXTURE.assertion.compteur }))).toBe('compteur');
    });

    test('un autre texte signe, ou une autre cle, la refuse', async () => {
        expect(await raison(verifierAssertion({ ...(await assertion()), clientData: new TextEncoder().encode('autre') }))).toBe('signature');
        const autre = new Uint8Array((await assertion()).clePublique);
        autre[64] ^= 1;
        expect(await raison(verifierAssertion({ ...(await assertion()), clePublique: autre }))).toBe('signature');
    });

    test('une autre application la refuse', async () => {
        expect(await raison(verifierAssertion({ ...(await assertion()), applications: ['EQUIPE.com.bordeaux.ukit'] }))).toBe('application');
    });
});

// -----------------------------------------------------------------------------
// L'environnement de production, sur une chaine fabriquee : la racine, l'intermediaire, la feuille et
// son nonce, comme Apple les compose.
// -----------------------------------------------------------------------------

const ALGO = (courbe: 'P-256' | 'P-384') => ({ name: 'ECDSA', namedCurve: courbe, hash: courbe === 'P-256' ? 'SHA-256' : 'SHA-384' });

async function autorite(nom: string, courbe: 'P-256' | 'P-384') {
    const cles = await crypto.subtle.generateKey(ALGO(courbe), true, ['sign', 'verify']) as CryptoKeyPair;
    const certificat = await x509.X509CertificateGenerator.createSelfSigned({
        serialNumber: '01', name: nom, keys: cles, signingAlgorithm: ALGO(courbe),
        notBefore: new Date('2026-01-01T00:00:00Z'), notAfter: new Date('2027-01-01T00:00:00Z'),
        extensions: [new x509.BasicConstraintsExtension(true, undefined, true)],
    });
    return { cles, certificat };
}

async function attestationFabriquee(application: string, aaguid: string, clientData: Uint8Array) {
    const racine = await autorite('CN=Racine d essai', 'P-384');
    const inter = await autorite('CN=Intermediaire d essai', 'P-384');
    const intermediaire = await x509.X509CertificateGenerator.create({
        serialNumber: '02', subject: 'CN=Intermediaire d essai', issuer: racine.certificat.subject,
        publicKey: inter.cles.publicKey, signingKey: racine.cles.privateKey, signingAlgorithm: ALGO('P-384'),
        notBefore: new Date('2026-01-01T00:00:00Z'), notAfter: new Date('2027-01-01T00:00:00Z'),
        extensions: [new x509.BasicConstraintsExtension(true, 0, true)],
    });
    const cleDeLApp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const point = new Uint8Array(await crypto.subtle.exportKey('raw', cleDeLApp.publicKey));
    const cle = await sha256(point);

    const authData = new Uint8Array(32 + 1 + 4 + 16 + 2 + 32);
    authData.set(await sha256(new TextEncoder().encode(application)), 0);
    authData[32] = 0x40;
    authData.set(new TextEncoder().encode(aaguid), 37);
    authData[54] = 32;
    authData.set(cle, 55);

    const tout = new Uint8Array(authData.length + 32);
    tout.set(authData, 0);
    tout.set(await sha256(clientData), authData.length);
    const nonce = await sha256(tout);
    const valeur = new Uint8Array([0x30, 0x24, 0xa1, 0x22, 0x04, 0x20, ...nonce]);

    const feuille = await x509.X509CertificateGenerator.create({
        serialNumber: '03', subject: 'CN=feuille', issuer: intermediaire.subject,
        publicKey: cleDeLApp.publicKey, signingKey: inter.cles.privateKey, signingAlgorithm: ALGO('P-384'),
        notBefore: new Date('2026-01-01T00:00:00Z'), notAfter: new Date('2027-01-01T00:00:00Z'),
        extensions: [new x509.Extension('1.2.840.113635.100.8.2', false, valeur)],
    });
    const attestation = encode({
        fmt: 'apple-appattest',
        attStmt: { x5c: [new Uint8Array(feuille.rawData), new Uint8Array(intermediaire.rawData)], receipt: new Uint8Array(0) },
        authData,
    });
    return { attestation, cle, point, racine: racine.certificat.toString('pem') };
}

describe('une chaine fabriquee', () => {
    const maintenant = new Date('2026-11-25T12:00:00Z');
    const clientData = new TextEncoder().encode('defi-de-production');

    test('l AAGUID de production donne l environnement de production', async () => {
        const f = await attestationFabriquee('EQUIPE.com.bordeaux.ukit', 'appattest\0\0\0\0\0\0\0', clientData);
        const r = await verifierAttestation({ attestation: f.attestation, clientData, cle: f.cle, applications: ['EQUIPE.com.bordeaux.ukit'], maintenant, racine: f.racine });
        expect(r.environnement).toBe('production');
        expect(r.clePublique).toEqual(f.point);
    });

    test('la cle de l application du store et celle du build de developpement sont deux applications', async () => {
        const f = await attestationFabriquee('EQUIPE.com.bordeaux.ukit.dev', 'appattestdevelop', clientData);
        const applications = ['EQUIPE.com.bordeaux.ukit', 'EQUIPE.com.bordeaux.ukit.dev'];
        expect((await verifierAttestation({ attestation: f.attestation, clientData, cle: f.cle, applications, maintenant, racine: f.racine })).environnement).toBe('developpement');
        expect(await raison(verifierAttestation({ attestation: f.attestation, clientData, cle: f.cle, applications: applications.slice(0, 1), maintenant, racine: f.racine }))).toBe('application');
    });

    test('un AAGUID inconnu est refuse', async () => {
        const f = await attestationFabriquee('EQUIPE.com.bordeaux.ukit', 'autrechose000000', clientData);
        expect(await raison(verifierAttestation({ attestation: f.attestation, clientData, cle: f.cle, applications: ['EQUIPE.com.bordeaux.ukit'], maintenant, racine: f.racine }))).toBe('environnement');
    });

    test('sans la racine fabriquee, la chaine remonte a celle d Apple et ne tient pas', async () => {
        const f = await attestationFabriquee('EQUIPE.com.bordeaux.ukit', 'appattest\0\0\0\0\0\0\0', clientData);
        expect(await raison(verifierAttestation({ attestation: f.attestation, clientData, cle: f.cle, applications: ['EQUIPE.com.bordeaux.ukit'], maintenant }))).toBe('chaine');
    });
});

describe('les donnees d authentification', () => {
    test('une assertion s arrete au compteur, meme drapeau AT leve, comme l iPhone l envoie', () => {
        const donnees = new Uint8Array(37);
        donnees[32] = 0x40;
        donnees[36] = 7;
        expect(lireDonneesDAuthentification(donnees, false)).toMatchObject({ compteur: 7, aaguid: null, credentialId: null });
    });

    test('trop courtes, elles sont refusees au lieu d etre lues de travers', () => {
        expect(() => lireDonneesDAuthentification(new Uint8Array(36), false)).toThrow(RefusAppAttest);
        expect(() => lireDonneesDAuthentification(new Uint8Array(37), true)).toThrow(RefusAppAttest);
        const tronquees = new Uint8Array(60);
        tronquees[32] = 0x40;
        tronquees[54] = 32;
        expect(() => lireDonneesDAuthentification(tronquees, true)).toThrow(RefusAppAttest);
    });
});
