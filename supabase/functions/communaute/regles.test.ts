/**
 * Les regles de la fonction `communaute` : la frontiere (ce qui se lit d'une demande et ce qui se
 * refuse), le defi, l'empreinte d'une adresse, le verdict Play Integrity sur la reponse de la
 * documentation, et le statut d'un refus.
 *
 *     npm test
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
    adresseDuClient, clesDeLaFonction, depuisBase64, depuisHexPostgres, DUREE_DU_DEFI_MS, egaux, empreinteDAdresse, empreinteDeDemande,
    evaluerVerdict, jetonDeVote, jourDeParis, lireDefi, lireDemande, lireDonnees, nouveauDefi, sha256, statutDuRefus, utf8, versBase64Url,
} from './regles';

const MAINTENANT = Date.parse('2026-11-25T12:00:00Z');
const SECRET = Buffer.alloc(32, 7).toString('base64');
const CLE = versBase64Url(new Uint8Array(32).fill(1));
const SECRET_APPAREIL = versBase64Url(new Uint8Array(32).fill(2));
const entetes = (valeurs: Record<string, string>) => ({ get: (nom: string) => valeurs[nom] ?? null });

describe('les octets', () => {
    test('le base64 standard et le base64 URL se lisent pareil, le reste non', () => {
        const octets = new Uint8Array([251, 255, 191, 0, 1]);
        expect(depuisBase64(versBase64Url(octets))).toEqual(octets);
        expect(depuisBase64(Buffer.from(octets).toString('base64'))).toEqual(octets);
        for (const faux of [undefined, 42, '', 'pas du base64 !', '====']) expect(depuisBase64(faux)).toBeNull();
    });

    test('un bytea de PostgREST se relit, une autre forme non', () => {
        expect(depuisHexPostgres('\\x04ff00')).toEqual(new Uint8Array([4, 255, 0]));
        expect(depuisHexPostgres('\\x')).toEqual(new Uint8Array(0));
        for (const faux of ['04ff', '\\x0', '\\xzz', null]) expect(depuisHexPostgres(faux)).toBeNull();
    });

    test('egaux compare la longueur puis chaque octet', () => {
        expect(egaux(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
        expect(egaux(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
        expect(egaux(new Uint8Array([1]), new Uint8Array([1, 0]))).toBe(false);
    });
});

describe('les cles de la fonction et le defi', () => {
    test('sans secret lisible et assez long, pas de cles : la fonction refuse d ecrire', async () => {
        expect(await clesDeLaFonction(undefined)).toBeNull();
        expect(await clesDeLaFonction(Buffer.alloc(16).toString('base64'))).toBeNull();
        const cles = await clesDeLaFonction(SECRET);
        expect(cles).not.toBeNull();
        expect(egaux(cles!.defi, cles!.ip)).toBe(false);
        expect(egaux(cles!.ip, cles!.vote)).toBe(false);
    });

    test('un defi vaut cinq minutes, pas une de plus, et ne se forge pas', async () => {
        const { defi: cle } = (await clesDeLaFonction(SECRET))!;
        const defi = await nouveauDefi(cle, MAINTENANT, new Uint8Array(16).fill(9));
        expect(defi).toMatch(/^[A-Za-z0-9_-]{54}$/);
        expect(await lireDefi(cle, defi, MAINTENANT + DUREE_DU_DEFI_MS)).toBe('valide');
        expect(await lireDefi(cle, defi, MAINTENANT + DUREE_DU_DEFI_MS + 1)).toBe('perime');
        expect(await lireDefi(cle, defi, MAINTENANT - 60_000)).toBe('perime');
        const autre = (await clesDeLaFonction(Buffer.alloc(32, 8).toString('base64')))!.defi;
        expect(await lireDefi(autre, defi, MAINTENANT)).toBe('falsifie');
        const retouche = depuisBase64(defi)!;
        retouche[3] ^= 1;
        expect(await lireDefi(cle, versBase64Url(retouche), MAINTENANT)).toBe('falsifie');
        expect(await lireDefi(cle, 'court', MAINTENANT)).toBe('illisible');
        expect(await lireDefi(cle, 42, MAINTENANT)).toBe('illisible');
    });
});

describe('l adresse et son empreinte', () => {
    test('le jour est celui de Paris', () => {
        expect(jourDeParis(new Date('2026-11-24T23:30:00Z'))).toBe('2026-11-25');
        expect(jourDeParis(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
        expect(jourDeParis(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
    });

    test('l adresse est la premiere de x-forwarded-for, et une forme fausse vaut inconnue', () => {
        expect(adresseDuClient(entetes({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
        expect(adresseDuClient(entetes({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
        expect(adresseDuClient(entetes({ 'x-forwarded-for': '<script>' }))).toBe('inconnue');
        expect(adresseDuClient(entetes({}))).toBe('inconnue');
    });

    test('l empreinte d une adresse change avec le jour, et ne la contient pas', async () => {
        const { ip } = (await clesDeLaFonction(SECRET))!;
        const lundi = await empreinteDAdresse(ip, '203.0.113.7', '2026-11-23');
        expect(await empreinteDAdresse(ip, '203.0.113.7', '2026-11-23')).toEqual(lundi);
        expect(egaux(await empreinteDAdresse(ip, '203.0.113.7', '2026-11-24'), lundi)).toBe(false);
        expect(lundi.length).toBe(32);
    });

    test('le jeton de vote est le meme pour un appareil et une cible, et ne relie pas deux cibles', async () => {
        const { vote } = (await clesDeLaFonction(SECRET))!;
        const appareil = new Uint8Array(32).fill(3);
        const un = await jetonDeVote(vote, appareil, 'annonce.sondage', 'a1');
        expect(await jetonDeVote(vote, appareil, 'annonce.sondage', 'a1')).toEqual(un);
        expect(egaux(await jetonDeVote(vote, appareil, 'annonce.sondage', 'a2'), un)).toBe(false);
        expect(egaux(await jetonDeVote(vote, new Uint8Array(32).fill(4), 'annonce.sondage', 'a1'), un)).toBe(false);
        const { vote: autre } = (await clesDeLaFonction(Buffer.alloc(32, 8).toString('base64')))!;
        expect(egaux(await jetonDeVote(autre, appareil, 'annonce.sondage', 'a1'), un)).toBe(false);
    });

    test('le requestHash est le SHA-256 du texte exact, en base64 URL', async () => {
        expect(await empreinteDeDemande('{"a":1}')).toBe(versBase64Url(await sha256(utf8('{"a":1}'))));
        expect(await empreinteDeDemande('{"a":1}')).not.toBe(await empreinteDeDemande('{"a": 1}'));
    });
});

describe('la frontiere : la demande', () => {
    test('les trois actions se lisent, toute autre est refusee', () => {
        expect(lireDemande({ action: 'defi' })).toEqual({ ok: true, valeur: { action: 'defi' } });
        expect(lireDemande({ action: 'enregistrer', cle: CLE, attestation: 'o2Nm', defi: 'x' }).ok).toBe(true);
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: { nature: 'secret', plateforme: 'android', secret: SECRET_APPAREIL } }).ok).toBe(true);
        expect(lireDemande({ action: 'supprimer' })).toEqual({ ok: false, raison: 'action' });
        expect(lireDemande(null)).toEqual({ ok: false, raison: 'forme' });
        expect(lireDemande([])).toEqual({ ok: false, raison: 'forme' });
    });

    test('une cle ou un secret qui n a pas trente-deux octets est refuse', () => {
        const court = versBase64Url(new Uint8Array(31));
        expect(lireDemande({ action: 'enregistrer', cle: court, attestation: 'o2Nm', defi: 'x' }).ok).toBe(false);
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: { nature: 'secret', plateforme: 'android', secret: court } }).ok).toBe(false);
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: { nature: 'secret', plateforme: 'web', secret: SECRET_APPAREIL } }).ok).toBe(false);
    });

    test('une cle App Attest exige une assertion, un secret n en porte jamais', () => {
        const attest = { nature: 'app_attest', cle: CLE };
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: attest })).toEqual({ ok: false, raison: 'preuve' });
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: attest, preuve: { jeton: 'abc' } })).toEqual({ ok: false, raison: 'preuve' });
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: attest, preuve: { assertion: 'omlz' } }).ok).toBe(true);
        const secret = { nature: 'secret', plateforme: 'android', secret: SECRET_APPAREIL };
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: secret, preuve: { assertion: 'omlz' } })).toEqual({ ok: false, raison: 'preuve' });
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: secret, preuve: { jeton: 'eyJh.b-c_d' } }).ok).toBe(true);
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: secret, preuve: { jeton: 'pas un jeton' } }).ok).toBe(false);
    });

    test('ce qui depasse les bornes n est pas lu', () => {
        const secret = { nature: 'secret', plateforme: 'android', secret: SECRET_APPAREIL };
        expect(lireDemande({ action: 'contribuer', donnees: 'x'.repeat(2049), appareil: secret }).ok).toBe(false);
        expect(lireDemande({ action: 'contribuer', donnees: '{}', appareil: secret, preuve: { jeton: 'a'.repeat(8193) } }).ok).toBe(false);
        expect(lireDemande({ action: 'enregistrer', cle: CLE, attestation: 'A'.repeat(40_000), defi: 'x' }).ok).toBe(false);
    });
});

describe('la frontiere : les donnees signees', () => {
    const donnees = (contribution: Record<string, unknown>, reste: Record<string, unknown> = {}) =>
        JSON.stringify({ defi: 'd', cle: CLE, contribution, essai: false, ...reste });

    test('une contribution bien formee se lit, sa fin comprise', () => {
        const lue = lireDonnees(donnees({ sujet: 'restaurant.ferme', cible: 'bordeaux/A28', valeur: 'ferme', fin: '2026-12-01' }));
        expect(lue.ok && lue.valeur.contribution).toEqual({ sujet: 'restaurant.ferme', cible: 'bordeaux/A28', valeur: 'ferme', fin: '2026-12-01' });
        const sansFin = lireDonnees(donnees({ sujet: 'restaurant.ferme', cible: '21', valeur: 'ferme' }));
        expect(sansFin.ok && sansFin.valeur.contribution.fin).toBeNull();
    });

    test('un sujet, une cible, une valeur ou une fin hors forme est refuse', () => {
        const base = { sujet: 'restaurant.ferme', cible: '21', valeur: 'ferme' };
        for (const faux of [
            { ...base, sujet: 'Restaurant' }, { ...base, sujet: 'x'.repeat(49) + '.a' }, { ...base, cible: '../etc' },
            { ...base, cible: '' }, { ...base, valeur: '' }, { ...base, valeur: 'x'.repeat(121) }, { ...base, fin: 'demain' },
        ]) {
            expect(lireDonnees(donnees(faux))).toEqual({ ok: false, raison: 'donnees' });
        }
        expect(lireDonnees('pas du json')).toEqual({ ok: false, raison: 'donnees' });
        expect(lireDonnees(donnees(base, { essai: 'oui' }))).toEqual({ ok: false, raison: 'donnees' });
        expect(lireDonnees(donnees(base, { cle: 'court' }))).toEqual({ ok: false, raison: 'donnees' });
    });
});

describe('le verdict Play Integrity', () => {
    type Bloc = Record<string, unknown>;
    interface Charge { requestDetails: Bloc; appIntegrity: Bloc; deviceIntegrity: Bloc }
    const FIXTURE = JSON.parse(readFileSync(join(__dirname, 'fixtures/play-integrity-verdict.json'), 'utf8')) as { reponse: { tokenPayloadExternal: Charge } };
    const attendu = { paquet: 'com.bordeaux1.emplois', requestHash: 'empreinte-de-la-demande', maintenantMs: MAINTENANT };
    function verdict(retouche: (charge: Charge) => void = () => {}) {
        const reponse = structuredClone(FIXTURE.reponse);
        reponse.tokenPayloadExternal.requestDetails.requestHash = attendu.requestHash;
        reponse.tokenPayloadExternal.requestDetails.timestampMillis = String(MAINTENANT - 2_000);
        retouche(reponse.tokenPayloadExternal);
        return evaluerVerdict(reponse, attendu);
    }

    test('l application du store sur un appareil integre est attestee', () => {
        expect(verdict()).toEqual({ atteste: true, raison: 'atteste' });
    });

    test('un verdict qui n est pas celui de cette demande n atteste rien', () => {
        expect(verdict((c) => { c.requestDetails.requestPackageName = 'com.bordeaux1.emplois.dev'; }).raison).toBe('paquet');
        expect(verdict((c) => { c.requestDetails.requestHash = 'autre'; }).raison).toBe('empreinte');
        expect(verdict((c) => { c.requestDetails.timestampMillis = String(MAINTENANT - 6 * 60_000); }).raison).toBe('perime');
        expect(verdict((c) => { c.requestDetails.timestampMillis = String(MAINTENANT + 60_000); }).raison).toBe('perime');
        expect(verdict((c) => { c.requestDetails.timestampMillis = 'jamais'; }).raison).toBe('perime');
    });

    test('une application reconditionnee, un emulateur ou un jeton rejoue n atteste rien', () => {
        expect(verdict((c) => { c.appIntegrity.appRecognitionVerdict = 'UNRECOGNIZED_VERSION'; }).raison).toBe('application');
        expect(verdict((c) => { c.deviceIntegrity = {}; }).raison).toBe('appareil');
        // Un jeton dechiffre deux fois : verdicts vides et UNEVALUATED (protection de Google).
        expect(verdict((c) => { c.appIntegrity.appRecognitionVerdict = 'UNEVALUATED'; c.deviceIntegrity = {}; }).atteste).toBe(false);
        expect(verdict((c) => { c.deviceIntegrity.deviceRecognitionVerdict = ['MEETS_BASIC_INTEGRITY']; }).raison).toBe('appareil');
        expect(evaluerVerdict({}, attendu)).toEqual({ atteste: false, raison: 'verdict_illisible' });
    });
});

test('le statut d un refus dit a l application quoi faire', () => {
    expect(statutDuRefus('plafond_ip')).toBe(429);
    expect(statutDuRefus('plafond_appareil')).toBe(429);
    expect(statutDuRefus('appareil_inconnu')).toBe(409);
    expect(statutDuRefus('compteur_rejoue')).toBe(409);
    expect(statutDuRefus('appareil_bloque')).toBe(403);
    expect(statutDuRefus('assertion')).toBe(401);
    expect(statutDuRefus('sujet_inconnu')).toBe(422);
    expect(statutDuRefus('forme')).toBe(400);
});
