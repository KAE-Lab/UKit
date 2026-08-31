/**
 * Ce que la sequence en deux temps doit tenir.
 *
 * Le risque est asymetrique, et c'est ce qui rend ce test utile : trop large, la regle ouvre un
 * clavier de code a quelqu'un qui vient d'appuyer sur Annuler — c'est-a-dire qu'elle reproduit le
 * defaut qu'elle existe pour corriger ; trop etroite, elle enferme dehors quelqu'un dont le visage
 * n'a pas ete reconnu. Aucun des deux ne se voit sur une capture d'ecran.
 */

import { describe, expect, it } from 'vitest';

import { ANNULATIONS, doitProposerLeCode, type ErreurBiometrie } from './decision';

/**
 * Les quatorze codes, recopies pour que le dernier cas puisse verifier qu'**aucun ne reste en zone
 * grise**.
 *
 * Ce n'est pas cette liste qui detecte une derive de la bibliotheque — c'est le compilateur, sur
 * l'affectation faite dans `index.ts` (voir decision.ts). Ici on verifie autre chose, et qui compte
 * autant : que la frontiere passe exactement entre les trois interruptions et tout le reste.
 */
const TOUTES: readonly ErreurBiometrie[] = [
    'not_enrolled',
    'user_cancel',
    'app_cancel',
    'not_available',
    'lockout',
    'no_space',
    'timeout',
    'unable_to_process',
    'unknown',
    'system_cancel',
    'user_fallback',
    'invalid_context',
    'passcode_not_set',
    'authentication_failed',
    // Emis par la couche native iOS, et **absent** du type publie par la bibliotheque : mesure sur
    // iPhone le 2026-08-22. C'est la limite du garde de compilation, et la raison pour laquelle une
    // sonde vaut mieux qu'une declaration.
    'missing_usage_description',
];

describe('doitProposerLeCode', () => {
    it('n enchaine pas sur le code quand la personne a annule', () => {
        // La sonde du lot. Un remede qui ouvre une seconde fenetre apres un refus reproduit
        // exactement le defaut qu'il corrige, dans l'autre sens.
        expect(doitProposerLeCode('user_cancel')).toBe(false);
    });

    it('n enchaine pas quand le systeme ou l application a interrompu', () => {
        expect(doitProposerLeCode('app_cancel')).toBe(false);
        expect(doitProposerLeCode('system_cancel')).toBe(false);
    });

    it('propose le code quand la personne le demande explicitement', () => {
        expect(doitProposerLeCode('user_fallback')).toBe(true);
    });

    it('propose le code quand la biometrie a echoue ou n a pas pu se prononcer', () => {
        for (const erreur of ['authentication_failed', 'lockout', 'timeout', 'unable_to_process'] as const) {
            expect(doitProposerLeCode(erreur), erreur).toBe(true);
        }
    });

    it('propose le code quand Face ID n est pas declare par le conteneur', () => {
        // Mesure sur iPhone sous Expo Go : la biometrie ne peut pas aboutir dans ce conteneur, mais
        // le code, lui, reste la seule porte valide — la refuser enfermerait dehors.
        expect(doitProposerLeCode('missing_usage_description')).toBe(true);
    });

    it('propose le code quand il n y a rien d enrole, ou Face ID refuse a l application', () => {
        // `not_available` est le code que porte une cle NSFaceIDUsageDescription absente du conteneur
        // qui execute — Expo Go a le sien, distinct de celui de l'application.
        for (const erreur of ['not_enrolled', 'passcode_not_set', 'not_available'] as const) {
            expect(doitProposerLeCode(erreur), erreur).toBe(true);
        }
    });

    it('ne propose rien sans erreur : un succes n a pas de second temps', () => {
        expect(doitProposerLeCode(undefined)).toBe(false);
    });

    it('range chaque code connu d un cote ou de l autre, sans zone grise', () => {
        const bloquants = TOUTES.filter((erreur) => !doitProposerLeCode(erreur));
        expect(bloquants).toEqual([...ANNULATIONS]);
        expect(TOUTES.filter(doitProposerLeCode)).toHaveLength(TOUTES.length - ANNULATIONS.length);
    });
});
