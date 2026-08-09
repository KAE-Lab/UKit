/**
 * Ce que la projection de la scolarite doit tenir.
 *
 * Trois defauts sont verrouilles ici, et aucun ne se voit a la relecture :
 *
 *   - la source **crie** l'identite (`KYLIAN MALARTRE`, mesure le 2026-08-09) ; l'afficher telle
 *     quelle donnerait « Bonjour KYLIAN ! » sur le tableau de bord ;
 *   - le compteur de messages passe d'une chaine a un entier, et un libelle sans parenthese doit
 *     rester `0` — le confondre avec « on ne sait pas » afficherait « aucun message non lu » sur une
 *     lecture qui a echoue, ce qui est exactement l'erreur avalee que la Phase 6 supprime ;
 *   - la date de naissance descend **telle quelle**, parce que `GreetingBlock` la decoupe sur `/`.
 */

import { describe, expect, it } from 'vitest';

import { FAILURE_PRESENTATION, type UkitFailure } from '../../../shared/aetherius/failures';
import {
    cleDeMessage,
    prenomDepuisIdentite,
    presenterEchec,
    projeterDossier,
    projeterMessagerie,
} from './ScolariteMapping';

describe('prenomDepuisIdentite', () => {
    it('prend le premier mot et refait la casse que la source a perdue', () => {
        expect(prenomDepuisIdentite('KYLIAN MALARTRE')).toBe('Kylian');
    });

    it('capitalise segment par segment un prenom compose', () => {
        expect(prenomDepuisIdentite('JEAN-PIERRE DUPONT')).toBe('Jean-Pierre');
        expect(prenomDepuisIdentite("D'ARTAGNAN DE BATZ")).toBe("D'Artagnan");
    });

    it('garde les accents', () => {
        expect(prenomDepuisIdentite('ELODIE MARTIN')).toBe('Elodie');
        expect(prenomDepuisIdentite('ÉLODIE MARTIN')).toBe('Élodie');
    });

    it('accepte une identite deja correctement casee', () => {
        expect(prenomDepuisIdentite('Kylian Malartre')).toBe('Kylian');
    });

    it('rend une chaine vide plutot que d inventer', () => {
        expect(prenomDepuisIdentite(undefined)).toBe('');
        expect(prenomDepuisIdentite('')).toBe('');
        expect(prenomDepuisIdentite('   ')).toBe('');
        expect(prenomDepuisIdentite(42)).toBe('');
    });
});

describe('projeterDossier', () => {
    it('projette les sorties du Blueprint sur les cles du trousseau', () => {
        expect(
            projeterDossier({
                numero_etudiant: '22301734',
                ine: '090640171CE',
                identite: 'KYLIAN MALARTRE',
                email: 'kylian.malartre@etu.u-bordeaux.fr',
                naissance: '07/11/2005',
            }),
        ).toEqual({
            firstName: 'Kylian',
            studentNumber: '22301734',
            ine: '090640171CE',
            emailAddress: 'kylian.malartre@etu.u-bordeaux.fr',
            dateOfBirth: '07/11/2005',
        });
    });

    it('laisse la date de naissance telle quelle : GreetingBlock la decoupe sur des barres obliques', () => {
        expect(projeterDossier({ naissance: '07/11/2005' }).dateOfBirth).toBe('07/11/2005');
    });

    it('ne remplit rien qu il n a pas recu', () => {
        expect(projeterDossier({})).toEqual({
            firstName: '',
            studentNumber: '',
            ine: '',
            emailAddress: '',
            dateOfBirth: '',
        });
    });
});

describe('projeterMessagerie', () => {
    it('rend l entier lu dans le libelle', () => {
        expect(projeterMessagerie({ boite_de_reception: 'Réception (789)', non_lus: 789 })).toEqual({
            unreadCount: 789,
        });
    });

    it('rend zero quand la boite existe sans parenthese, comme avant la migration', () => {
        expect(projeterMessagerie({ boite_de_reception: 'Réception', non_lus: null })).toEqual({
            unreadCount: 0,
        });
    });

    it('rend zero, et non null, sur un compteur a zero explicite', () => {
        expect(projeterMessagerie({ boite_de_reception: 'Réception (0)', non_lus: 0 })).toEqual({
            unreadCount: 0,
        });
    });

    it('distingue « on ne sait pas » de « zero » quand la boite manque', () => {
        expect(projeterMessagerie({})).toEqual({ unreadCount: null });
        expect(projeterMessagerie({ boite_de_reception: '', non_lus: null })).toEqual({
            unreadCount: null,
        });
    });
});

describe('cleDeMessage', () => {
    const echec = (kind: UkitFailure['kind'], code?: string): UkitFailure => ({
        kind,
        ...(code !== undefined ? { code } : {}),
        ...FAILURE_PRESENTATION[kind],
    });

    it('donne son propre message a chaque echec nomme par le Blueprint', () => {
        expect(cleDeMessage(echec('blocked', 'LOGIN_FAILED'))).toBe('LOGIN_FAILED');
        expect(cleDeMessage(echec('blocked', 'CAS_INDISPONIBLE'))).toBe('ERROR_CAS_UNAVAILABLE');
        expect(cleDeMessage(echec('blocked', 'MESSAGERIE_INDISPONIBLE'))).toBe(
            'ERROR_MAILBOX_UNAVAILABLE',
        );
    });

    it('retombe sur la famille pour un code qu une version publiee inventerait', () => {
        expect(cleDeMessage(echec('blocked', 'CODE_DU_FUTUR'))).toBe('ERROR_BLOCKED');
    });

    it('laisse les familles sans code a la table du moteur', () => {
        expect(cleDeMessage(echec('unavailable'))).toBe('ERROR_SERVICE_UNAVAILABLE');
        expect(cleDeMessage(echec('rejected'))).toBe('ERROR_UNEXPECTED_RESPONSE');
        expect(cleDeMessage(echec('data'))).toBe('ERROR_CONTENT_NOT_FOUND');
        expect(cleDeMessage(echec('config'))).toBe('ERROR_MISSING_CREDENTIALS');
    });
});

describe('presenterEchec', () => {
    const echec = (kind: UkitFailure['kind'], code?: string): UkitFailure => ({
        kind,
        ...(code !== undefined ? { code } : {}),
        ...FAILURE_PRESENTATION[kind],
    });

    it('rend reessayable un service momentanement absent, que sa famille dit bloque', () => {
        expect(presenterEchec(echec('blocked', 'CAS_INDISPONIBLE')).retryable).toBe(true);
        expect(presenterEchec(echec('blocked', 'MESSAGERIE_INDISPONIBLE')).retryable).toBe(true);
    });

    it('laisse un refus d identifiants non reessayable', () => {
        // Rejouer le meme mot de passe donnera le meme refus : un bouton qui ne repare rien est
        // pire qu'aucun bouton.
        expect(presenterEchec(echec('blocked', 'LOGIN_FAILED')).retryable).toBe(false);
    });

    it('ne retire jamais une reessayabilite que le moteur a accordee', () => {
        expect(presenterEchec(echec('unavailable')).retryable).toBe(true);
    });

    it('laisse les familles non reessayables telles quelles', () => {
        expect(presenterEchec(echec('rejected')).retryable).toBe(false);
        expect(presenterEchec(echec('data')).retryable).toBe(false);
    });

    it('porte le message du code en meme temps que la decision', () => {
        expect(presenterEchec(echec('blocked', 'MESSAGERIE_INDISPONIBLE')).messageKey).toBe(
            'ERROR_MAILBOX_UNAVAILABLE',
        );
    });
});
