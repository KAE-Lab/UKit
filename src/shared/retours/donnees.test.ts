import { describe, expect, test } from 'vitest';

import {
    aAnnoncer, aNotifier, aRedeposer, clesALire, contexteDuVote, fusionnerLecture, lireEnvois, lireLigne, lireProbleme, marquer, nonLues, nouveauRetourConnu,
    peutProposer, serialiserRetour, type RetourConnu, type RetourEnAttente,
} from './donnees';

const ATTENTE: RetourEnAttente = {
    local: 'l1', creeLe: Date.parse('2026-11-25T10:00:00Z'), fichiers: [], cle: 'Y2xl',
    retour: { depot: '0b6f3c8e-2a41-4e57-9b8d-6f1e2c3d4a5b', nature: 'bug', texte: 'Le menu reste vide', campus: null, volontaire: false, contact: null, probleme: null, contexte: null, captures: 0, cle_reponse: 'ab'.repeat(32) },
};

function connu(local: string, cle: string | null, envoyeLe: number, extra: Partial<RetourConnu> = {}): RetourConnu {
    return { ...nouveauRetourConnu({ ...ATTENTE, local, cle, creeLe: envoyeLe }), etat: 'envoye', ...extra };
}

describe('le texte signe et la reponse d\'un depot', () => {
    test('le texte porte le defi, la cle et le retour, et rien d\'autre', () => {
        expect(JSON.parse(serialiserRetour('d', 'c', ATTENTE.retour))).toEqual({ defi: 'd', cle: 'c', retour: ATTENTE.retour });
    });

    test('seules les URL de capture bien formees se gardent', () => {
        const id = 'ab'.repeat(32);
        expect(lireEnvois({ envois: [{ chemin: `${id}/1.jpg`, jeton: 't' }, { chemin: '../autre/1.jpg', jeton: 't' }, { chemin: `${id}/9.jpg`, jeton: 't' }] }))
            .toEqual([{ chemin: `${id}/1.jpg`, jeton: 't' }]);
        expect(lireEnvois(null)).toEqual([]);
    });
});

describe('la lecture des reponses', () => {
    test('une ligne se lit defensivement', () => {
        expect(lireLigne({ etat: 'traite', reponses: [{ texte: 'Corrige', le: '2026-11-25T11:00:00Z' }, { texte: 3 }] }))
            .toEqual({ statut: 'traite', reponses: [{ texte: 'Corrige', le: Date.parse('2026-11-25T11:00:00Z') }] });
        expect(lireLigne(null)).toBeNull();
        expect(lireLigne({ etat: 'inconnu', reponses: [] })).toBeNull();
    });

    test('la lecture se fond dans les retours par cle ; une cle inconnue ne touche rien', () => {
        const a = connu('a', 'cleA', 1);
        const b = connu('b', 'cleB', 2, { statut: 'nouveau' });
        const lus = fusionnerLecture([a, b], ['cleA', 'cleB'], [{ etat: 'en_attente', reponses: [{ texte: 'Vu', le: '2026-11-25T11:00:00Z' }] }, null]);
        expect(lus[0]).toMatchObject({ statut: 'en_attente', reponses: [{ texte: 'Vu' }] });
        expect(lus[1]).toBe(b);
    });

    test('les cles a lire : deposees seulement, les plus recentes, vingt au plus', () => {
        const retours = [
            connu('sans', null, 5),
            { ...connu('boite', 'cleBoite', 6), etat: 'a-envoyer' as const },
            ...Array.from({ length: 25 }, (_, i) => connu(`r${i}`, `cle${i}`, 100 + i)),
        ];
        const cles = clesALire(retours);
        expect(cles).toHaveLength(20);
        expect(cles[0]).toBe('cle24');
        expect(cles).not.toContain('cleBoite');
    });

    test('ce qui reste a lire, a annoncer et a notifier', () => {
        const reponses = [{ texte: 'Un', le: 10 }, { texte: 'Deux', le: 20 }];
        const retours = [connu('a', 'cleA', 1, { reponses, vues: 10, annoncees: 10 }), connu('b', 'cleB', 2)];
        expect(nonLues(retours)).toBe(1);
        expect(aAnnoncer(retours)?.local).toBe('a');
        expect(aNotifier(retours)?.local).toBe('a');
        // Notifiee, elle s'annonce encore en tete a l'ouverture suivante, sans se renotifier.
        const notifiees = marquer(retours, 'notifiees', 'a');
        expect(aNotifier(notifiees)).toBeNull();
        expect(aAnnoncer(notifiees)?.local).toBe('a');
        const annonces = marquer(notifiees, 'annoncees');
        expect(aAnnoncer(annonces)).toBeNull();
        expect(nonLues(annonces)).toBe(1);
        expect(nonLues(marquer(annonces, 'vues', 'a'))).toBe(0);
    });

    test('une reponse retiree puis une autre publiee se signalent', () => {
        const vue = connu('a', 'cleA', 1, { reponses: [{ texte: 'Retiree', le: 10 }], vues: 10, annoncees: 10 });
        const remplacee = fusionnerLecture([vue], ['cleA'], [{ etat: 'traite', reponses: [{ texte: 'Nouvelle', le: '1970-01-01T00:00:00.030Z' }] }]);
        expect(nonLues(remplacee)).toBe(1);
        expect(aAnnoncer(remplacee)?.local).toBe('a');
    });
});

describe('le contexte d\'un « moi aussi »', () => {
    test('la forme du sujet, sans barre ni caractere de controle', () => {
        expect(contexteDuVote('android', 'Pixel 7', 'Android 15', '7.0.0')).toBe('android|Pixel 7|Android 15|7.0.0');
        expect(contexteDuVote('ios', 'iPhone|15', 'iOS 18.5', '7.0.0')).toBe('ios|iPhone 15|iOS 18.5|7.0.0');
        expect(contexteDuVote('android', null, 'Android 15', '7.0.0')).toBeNull();
        expect(contexteDuVote('web', 'Pixel', 'Android', '7.0.0')).toBeNull();
    });
});

describe('la proposition apres une capture', () => {
    test('une fois par jour, jamais apres « ne plus proposer »', () => {
        expect(peutProposer({ jour: null, jamais: false }, '2026-11-25')).toBe(true);
        expect(peutProposer({ jour: '2026-11-25', jamais: false }, '2026-11-25')).toBe(false);
        expect(peutProposer({ jour: '2026-11-24', jamais: false }, '2026-11-25')).toBe(true);
        expect(peutProposer({ jour: null, jamais: true }, '2026-11-25')).toBe(false);
    });
});

describe('les problemes connus', () => {
    const maintenant = Date.parse('2026-11-25T12:00:00Z');
    const ligne = { id: 'p1', titre: 'Le menu reste vide', detail: ' ', statut: 'publie', plateformes: null, version_corrigee: null, maj_le: '2026-11-20T00:00:00Z' };

    test('un probleme publie se lit, son detail vide tombe', () => {
        expect(lireProbleme(ligne, 'android', maintenant)).toEqual({ id: 'p1', titre: 'Le menu reste vide', detail: null, statut: 'publie', versionCorrigee: null });
    });

    test('une autre plateforme, un brouillon, un corrige d\'il y a plus d\'un mois ne se montrent pas', () => {
        expect(lireProbleme({ ...ligne, plateformes: ['ios'] }, 'android', maintenant)).toBeNull();
        expect(lireProbleme({ ...ligne, statut: 'brouillon' }, 'android', maintenant)).toBeNull();
        expect(lireProbleme({ ...ligne, statut: 'corrige', maj_le: '2026-10-01T00:00:00Z' }, 'android', maintenant)).toBeNull();
        expect(lireProbleme({ ...ligne, statut: 'corrige', version_corrigee: '7.0.1' }, 'android', maintenant)?.versionCorrigee).toBe('7.0.1');
    });
});

describe('la boite d\'envoi', () => {
    test('un retour differe par un plafond attend le lendemain', () => {
        const boite = [{ ...ATTENTE, local: 'a', differe: '2026-11-25' }, { ...ATTENTE, local: 'b' }];
        expect(aRedeposer(boite, '2026-11-25').map((a) => a.local)).toEqual(['b']);
        expect(aRedeposer(boite, '2026-11-26').map((a) => a.local)).toEqual(['a', 'b']);
    });
});
