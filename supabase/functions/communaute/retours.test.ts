/**
 * Les regles d'un retour natif dans la fonction `communaute` : ce qui se lit du texte signe, ce qui se
 * refuse, le masquage du texte libre, et l'enveloppe d'un depot dans `lireDemande`.
 *
 *     npm test
 */

import { describe, expect, test } from 'vitest';

import { lireDemande, statutDuRefus, versBase64Url } from './regles';
import { BORNES, cheminDeCapture, lireContexte, lireDonneesDeRetour, masquer } from './retours';

const CLE = versBase64Url(new Uint8Array(32).fill(1));
const EMPREINTE = 'ab'.repeat(32);

const DEPOT = '0b6f3c8e-2a41-4e57-9b8d-6f1e2c3d4a5b';

function signe(retour: Record<string, unknown>): string {
    return JSON.stringify({ defi: 'defi', cle: CLE, retour: { depot: DEPOT, ...retour } });
}

describe('le texte signe d\'un retour', () => {
    test('un bug complet se lit, son contexte borne', () => {
        const lu = lireDonneesDeRetour(signe({
            nature: 'bug', texte: '  Le menu reste vide  ', captures: 2, cle_reponse: EMPREINTE,
            contexte: {
                version: '7.0.0', appareil: 'Pixel 7', systeme: 'Android 15', onglet: 'Campus', reseau: 'wifi',
                parcours: ['CampusTab', 'CrousMenu'], echecs: [{ hote: 'api.croustillant.menu', famille: 'network', minutes: 3 }],
                erreur: { hote: 'api.croustillant.menu', famille: 'network' },
            },
        }));
        expect(lu.ok).toBe(true);
        if (lu.ok === false) return;
        expect(lu.valeur.retour).toMatchObject({ depot: DEPOT, nature: 'bug', texte: 'Le menu reste vide', captures: 2, cleReponse: EMPREINTE, campus: null, contact: null });
        expect(lu.valeur.retour.contexte?.parcours).toEqual(['CampusTab', 'CrousMenu']);
    });

    test('la demande de campus du volontaire porte son adresse ; sans volontariat, aucune', () => {
        const volontaire = lireDonneesDeRetour(signe({ nature: 'campus', campus: 'IUT de Périgueux', texte: '', volontaire: true, contact: 'a@exemple.fr' }));
        expect(volontaire.ok === true && volontaire.valeur.retour.contact).toBe('a@exemple.fr');
        expect(lireDonneesDeRetour(signe({ nature: 'campus', campus: 'Agen', contact: 'a@exemple.fr' })).ok).toBe(false);
        expect(lireDonneesDeRetour(signe({ nature: 'campus', campus: 'Agen', volontaire: true })).ok).toBe(false);
        expect(lireDonneesDeRetour(signe({ nature: 'campus', campus: 'Agen', volontaire: true, contact: 'pas une adresse' })).ok).toBe(false);
    });

    test('chaque champ hors de sa forme refuse le retour, sans le nettoyer', () => {
        const refuses: Record<string, unknown>[] = [
            { nature: 'autre', texte: 'Nature hors liste' },
            { nature: 'bug', texte: 'ab' },
            { nature: 'bug', texte: 'x'.repeat(BORNES.texte + 1) },
            { nature: 'campus', texte: 'Sans campus' },
            { nature: 'bug', texte: 'Un campus sur un bug', campus: 'Agen' },
            { nature: 'bug', texte: 'Volontaire sur un bug', volontaire: true, contact: 'a@b.fr' },
            { nature: 'bug', texte: 'Quatre captures', captures: 4 },
            { nature: 'bug', texte: 'Captures decimales', captures: 1.5 },
            { nature: 'bug', texte: 'Cle courte', cle_reponse: 'abcd' },
            { nature: 'bug', texte: 'Probleme faux', probleme: '../retours' },
            { nature: 'bug', texte: 'Volontaire texte', volontaire: 'oui' },
            { nature: 'bug', texte: 'Sans depot', depot: undefined },
            { nature: 'bug', texte: 'Depot faux', depot: 'un-depot' },
        ];
        for (const retour of refuses) expect(lireDonneesDeRetour(signe(retour))).toEqual({ ok: false, raison: 'retour_invalide' });
        expect(lireDonneesDeRetour('{pas du json')).toEqual({ ok: false, raison: 'donnees' });
        expect(lireDonneesDeRetour(JSON.stringify({ defi: 'x', retour: { nature: 'bug', texte: 'abc' } }))).toEqual({ ok: false, raison: 'donnees' });
    });
});

describe('le contexte joint', () => {
    test('absent, il vaut null ; une cle inconnue ou une valeur hors forme le refusent', () => {
        expect(lireContexte(undefined)).toBeNull();
        expect(lireContexte({ langue: 'fr', theme: 'sombre' })).toEqual({ langue: 'fr', theme: 'sombre' });
        expect(lireContexte({ erreur: { famille: 'unavailable' } })).toEqual({ erreur: { famille: 'unavailable' } });
        for (const faux of [
            { position: '44.8,-0.6' },
            { parcours: ['Group?name=TD1'] },
            { parcours: Array.from({ length: BORNES.parcours + 1 }, () => 'CampusTab') },
            { echecs: [{ hote: 'https://edt.u-bordeaux.fr/ical?cle=secret', famille: 'network' }] },
            { echecs: [{ hote: 'edt.u-bordeaux.fr', famille: 'Network Error' }] },
            { erreur: { hote: 'edt.u-bordeaux.fr' } },
            { erreur: { hote: 'https://edt.u-bordeaux.fr/', famille: 'unavailable' } },
            { appareil: 'x'.repeat(BORNES.champ + 1) },
            { version: 7 },
            [],
        ]) expect(lireContexte(faux)).toBeUndefined();
    });
});

describe('le masquage du texte libre', () => {
    test('une adresse et un numero se retirent ; une version et un identifiant de store restent', () => {
        expect(masquer('Ecrivez a prenom.nom@etu.u-bordeaux.fr ou au 06 12 34 56 78')).toBe('Ecrivez a [adresse retirée] ou au [numéro retiré]');
        expect(masquer('Depuis la 7.0.0, id1394708917')).toBe('Depuis la 7.0.0, id1394708917');
        // Un texte deja a la borne qui grossit au masque reste a la borne, au lieu d'etre refuse.
        expect(masquer(`${'x'.repeat(1990)} 0612345678`)).toHaveLength(2000);
        // Coupe par points de code : un emoji a la borne reste entier ou part entier.
        const coupe = masquer(`0612345678 ${'x'.repeat(1983)}😀😀`);
        expect(Array.from(coupe)).toHaveLength(2000);
        expect(coupe.endsWith('\ud83d')).toBe(false);
    });
});

describe('l\'enveloppe d\'un depot', () => {
    const appareil = { nature: 'secret', plateforme: 'android', secret: versBase64Url(new Uint8Array(32).fill(2)) };

    test('un depot porte un texte plus long qu\'une contribution, borne lui aussi', () => {
        const long = 'x'.repeat(5_000);
        expect(lireDemande({ action: 'deposer', donnees: long, appareil }).ok).toBe(true);
        expect(lireDemande({ action: 'contribuer', donnees: long, appareil })).toEqual({ ok: false, raison: 'forme' });
        expect(lireDemande({ action: 'deposer', donnees: 'x'.repeat(12_289), appareil })).toEqual({ ok: false, raison: 'forme' });
    });

    test('la purge ne prend rien, et un retour hors forme se refuse en 422', () => {
        expect(lireDemande({ action: 'purger', ids: ['x'] })).toEqual({ ok: true, valeur: { action: 'purger' } });
        expect(statutDuRefus('retour_invalide')).toBe(422);
    });

    test('une capture se range sous le dossier de son retour', () => {
        expect(cheminDeCapture(EMPREINTE, 2)).toBe(`${EMPREINTE}/2.jpg`);
    });
});
