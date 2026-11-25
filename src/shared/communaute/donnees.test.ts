/**
 * Les donnees de la communaute : la lecture defensive d'un signalement, le texte signe, le cache du
 * jour et sa fusion, le jour de Paris, et la reponse de la fonction rangee en resultat.
 */

import { describe, expect, test } from 'vitest';

import { base64Url, cacheVide, depuis, depuisBase64, versBase64, ecrireCache, fusionner, jourDeParis, lireCache, lireResultat, lireSignalement, RECOUVREMENT_MS, serialiserDonnees, type Signalement } from './donnees';

const LIGNE = {
    id: '6f1c2d6e-0000-4000-8000-000000000001', sujet: 'restaurant.ferme', cible: '21', valeur: 'ferme', fin: null, poids: 1,
    statut: 'active', cree_le: '2026-11-25T11:00:00+00:00', expire_le: '2026-11-25T23:00:00+00:00', maj_le: '2026-11-25T11:00:00.123+00:00',
};

function signalement(id: string, majLe: number, autres: Partial<Signalement> = {}): Signalement {
    return { ...(lireSignalement(LIGNE) as Signalement), id, majLe, ...autres };
}

describe('un signalement lu', () => {
    test('une ligne de la base devient un signalement, ses instants en millisecondes', () => {
        expect(lireSignalement(LIGNE)).toEqual({
            id: LIGNE.id, sujet: 'restaurant.ferme', cible: '21', valeur: 'ferme', fin: null, poids: 1, statut: 'active',
            creeLe: Date.parse('2026-11-25T11:00:00Z'), expireLe: Date.parse('2026-11-25T23:00:00Z'), majLe: Date.parse('2026-11-25T11:00:00.123Z'),
        });
    });

    test('une ligne fausse est ecartee au lieu de casser la lecture', () => {
        for (const faux of [null, 'ligne', { ...LIGNE, poids: 3 }, { ...LIGNE, statut: 'supprimee' }, { ...LIGNE, cree_le: 'hier' }, { ...LIGNE, id: 4 }]) {
            expect(lireSignalement(faux)).toBeNull();
        }
    });
});

test('le texte signe porte le defi, la cle, la contribution et l essai, la fin nulle par defaut', () => {
    const texte = serialiserDonnees('defi', 'cle', { sujet: 'restaurant.ferme', cible: '21', valeur: 'ferme' }, false);
    expect(JSON.parse(texte)).toEqual({ defi: 'defi', cle: 'cle', contribution: { sujet: 'restaurant.ferme', cible: '21', valeur: 'ferme', fin: null }, essai: false });
});

test('les octets vont et viennent en base64, et le requestHash prend la forme URL', () => {
    const octets = new Uint8Array([251, 255, 191, 0, 62, 63]);
    expect(depuisBase64(versBase64(octets))).toEqual(octets);
    expect(depuisBase64('pas du base64 !')).toBeNull();
    expect(base64Url('+/+/ab==')).toBe('-_-_ab');
});

describe('le cache du jour', () => {
    test('il se relit tel qu il a ete ecrit, et repart de zero un autre jour ou illisible', () => {
        const cache = fusionner(cacheVide('2026-11-25'), [lireSignalement(LIGNE) as Signalement]);
        expect(lireCache(ecrireCache(cache), '2026-11-25')).toEqual(cache);
        expect(lireCache(ecrireCache(cache), '2026-11-26')).toEqual(cacheVide('2026-11-26'));
        expect(lireCache('{illisible', '2026-11-25')).toEqual(cacheVide('2026-11-25'));
        expect(lireCache(null, '2026-11-25')).toEqual(cacheVide('2026-11-25'));
    });

    test('la fusion garde la version la plus recente de chaque signalement et avance le curseur', () => {
        const a = signalement('a', 1_000);
        const b = signalement('b', 2_000);
        const aRemplace = signalement('a', 3_000, { statut: 'remplacee' });
        const apres = fusionner(fusionner(cacheVide('j'), [a, b]), [aRemplace, signalement('b', 1_500, { valeur: 'perime' })]);
        expect(apres.curseur).toBe(3_000);
        expect(apres.signalements.find((s) => s.id === 'a')?.statut).toBe('remplacee');
        expect(apres.signalements.find((s) => s.id === 'b')?.valeur).toBe('ferme');
        expect(apres.signalements).toHaveLength(2);
    });

    test('la lecture suivante reprend au curseur, moins le recouvrement', () => {
        expect(depuis(cacheVide('j'))).toBeNull();
        const cache = fusionner(cacheVide('j'), [signalement('a', Date.parse('2026-11-25T11:00:00Z'))]);
        expect(depuis(cache)).toBe(new Date(Date.parse('2026-11-25T11:00:00Z') - RECOUVREMENT_MS).toISOString());
    });

    test('le jour est celui de Paris, comme la lecture publique de la base', () => {
        expect(jourDeParis(new Date('2026-11-24T23:30:00Z'))).toBe('2026-11-25');
        expect(jourDeParis(new Date('2026-11-25T22:59:00Z'))).toBe('2026-11-25');
    });
});

describe('le resultat d une contribution', () => {
    test('une acceptation, un essai', () => {
        expect(lireResultat(200, { statut: 'acceptee', id: 'x', poids: 1, atteste: true })).toEqual({ etat: 'acceptee', id: 'x', poids: 1, atteste: true });
        expect(lireResultat(200, { statut: 'essai', poids: 0, atteste: false })).toEqual({ etat: 'essai', poids: 0, atteste: false });
    });

    test('un refus definitif, une cle a refaire, un echec a rejouer', () => {
        expect(lireResultat(429, { statut: 'refusee', raison: 'plafond_appareil' })).toEqual({ etat: 'refusee', raison: 'plafond_appareil' });
        expect(lireResultat(422, { statut: 'refusee', raison: 'sujet_inconnu' })).toEqual({ etat: 'refusee', raison: 'sujet_inconnu' });
        expect(lireResultat(409, { statut: 'refusee', raison: 'appareil_inconnu' })).toEqual({ etat: 'a-refaire', raison: 'appareil_inconnu' });
        expect(lireResultat(409, { statut: 'refusee', raison: 'compteur_rejoue' })).toEqual({ etat: 'a-refaire', raison: 'compteur_rejoue' });
        expect(lireResultat(401, { statut: 'refusee', raison: 'assertion' })).toEqual({ etat: 'a-refaire', raison: 'assertion' });
        expect(lireResultat(401, { statut: 'refusee', raison: 'defi' })).toEqual({ etat: 'echec', raison: 'defi' });
        expect(lireResultat(503, { statut: 'indisponible', raison: 'base' })).toEqual({ etat: 'echec', raison: 'base' });
        expect(lireResultat(0, null)).toEqual({ etat: 'echec', raison: 'http_0' });
    });

    test('une reponse inattendue n est jamais une acceptation', () => {
        expect(lireResultat(200, { statut: 'autre' })).toEqual({ etat: 'echec', raison: 'reponse_inattendue' });
        expect(lireResultat(200, 'texte')).toEqual({ etat: 'echec', raison: 'reponse_inattendue' });
        expect(lireResultat(200, { statut: 'acceptee', poids: 7 })).toMatchObject({ etat: 'acceptee', poids: 0, atteste: false });
    });
});
