/**
 * Ce que la projection de la scolarite doit tenir.
 *
 * Trois defauts sont verrouilles ici, et aucun ne se voit a la relecture :
 *
 *   - la source **crie** l'identite (`CAMILLE MARTIN`, mesure le 2026-08-09) ; l'afficher telle
 *     quelle donnerait « Bonjour CAMILLE ! » sur le tableau de bord ;
 *   - le compteur de messages passe d'une chaine a un entier, et un libelle sans parenthese doit
 *     rester `0` — le confondre avec « on ne sait pas » afficherait « aucun message non lu » sur une
 *     lecture qui a echoue, ce qui est exactement l'erreur avalee que la Phase 6 supprime ;
 *   - la date de naissance descend **telle quelle**, parce que `GreetingBlock` la decoupe sur `/`.
 */

import { describe, expect, it } from 'vitest';

import { FAILURE_PRESENTATION, type UkitFailure } from '../../../shared/aetherius/failures';
import {
    cleDeMessage,
    cleDeTitre,
    estCodeDeServiceIndisponible,
    estServiceIndisponible,
    prenomDepuisIdentite,
    presenterEchec,
    projeterDossier,
    requalifierLenteur,
} from './ScolariteMapping';

describe('prenomDepuisIdentite', () => {
    it('prend le premier mot et refait la casse que la source a perdue', () => {
        expect(prenomDepuisIdentite('CAMILLE MARTIN')).toBe('Camille');
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
        expect(prenomDepuisIdentite('Camille Martin')).toBe('Camille');
    });

    it('rend une chaine vide plutot que d inventer', () => {
        expect(prenomDepuisIdentite(undefined)).toBe('');
        expect(prenomDepuisIdentite('')).toBe('');
        expect(prenomDepuisIdentite('   ')).toBe('');
        expect(prenomDepuisIdentite(42)).toBe('');
    });
});

describe('projeterDossier', () => {
    const LU_LE = '2026-08-25T20:00:00.000Z';

    it('projette les sorties du Blueprint sur les cles du trousseau', () => {
        expect(
            projeterDossier({
                numero_etudiant: '21000001',
                ine: '012345678AB',
                identite: 'CAMILLE MARTIN',
                email: 'camille.martin@etu.u-bordeaux.fr',
                naissance: '01/02/2003',
            }, LU_LE),
        ).toEqual({
            firstName: 'Camille',
            studentNumber: '21000001',
            ine: '012345678AB',
            emailAddress: 'camille.martin@etu.u-bordeaux.fr',
            dateOfBirth: '01/02/2003',
            formation: '',
            formationAnnee: '',
            formationDetail: '',
            luLe: LU_LE,
        });
    });

    it('laisse la date de naissance telle quelle : GreetingBlock la decoupe sur des barres obliques', () => {
        expect(projeterDossier({ naissance: '01/02/2003' }, LU_LE).dateOfBirth).toBe('01/02/2003');
    });

    it('ne remplit rien qu il n a pas recu', () => {
        expect(projeterDossier({}, LU_LE)).toEqual({
            firstName: '',
            studentNumber: '',
            ine: '',
            emailAddress: '',
            dateOfBirth: '',
            formation: '',
            formationAnnee: '',
            formationDetail: '',
            luLe: LU_LE,
        });
    });

    /*
     * Les deux portails ne rendent pas la meme FORME, et c'est deliberé : une lecture obligatoire
     * descend en `as: "text"`, une lecture bonus en `as: "list"` — qui ne leve jamais. La projection
     * est le seul endroit qui ramene les deux a une chaine.
     */
    it('accepte une sortie en liste comme une sortie en chaine', () => {
        expect(projeterDossier({ ine: ['080014278FC'] }, LU_LE).ine).toBe('080014278FC');
        expect(projeterDossier({ ine: '012345678AB' }, LU_LE).ine).toBe('012345678AB');
    });

    it('rend une chaine vide sur une liste vide, jamais undefined', () => {
        expect(projeterDossier({ ine: [], formation_libelle: [] }, LU_LE)).toMatchObject({
            ine: '',
            formation: '',
        });
    });

    /*
     * Mesure du 2026-08-25 : le tableau des inscriptions de Bordeaux colle une icone FontAwesome
     * dans la cellule de la ligne courante, et le texte de l'element l'emporte. Affichee telle
     * quelle, la formation se lirait « M1 Informatique??? ».
     */
    it('retire le glyphe d icone que la source colle au libelle de la ligne courante', () => {
        expect(projeterDossier({ formation_libelle: ['M1 Informatique\uf002'] }, LU_LE).formation)
            .toBe('M1 Informatique');
    });

    it('projette la formation des deux portails sous les memes cles', () => {
        const bordeaux = projeterDossier({
            formation_libelle: ['M1 Informatique\uf002'],
            formation_annee: ['2026/2027'],
            formation_detail: ['UF Informatique'],
        }, LU_LE);
        const inp = projeterDossier({
            formation_libelle: ['Année 2 - Ingénieur Télécommunications'],
            formation_annee: ['2026-2027'],
            formation_detail: ['Ingénieur spécialité Télécommunications'],
        }, LU_LE);

        expect(bordeaux.formation).toBe('M1 Informatique');
        expect(bordeaux.formationAnnee).toBe('2026/2027');
        expect(inp.formation).toBe('Année 2 - Ingénieur Télécommunications');
        expect(inp.formationAnnee).toBe('2026-2027');
    });

    describe('edtPersonnelIntrouvable', () => {
        it('se pose quand le portail declare la ressource et la rend vide', () => {
            expect(projeterDossier({ edt_ressource: [], edt_libelle: [] }, LU_LE).edtPersonnelIntrouvable).toBe(true);
        });

        it('se pose aussi sur une ressource illisible, que la proposition aurait ecartee', () => {
            expect(projeterDossier({ edt_ressource: ['Direct Planning Tree_abc'] }, LU_LE).edtPersonnelIntrouvable).toBe(true);
        });

        it('reste absent quand la ressource est lue', () => {
            const dossier = projeterDossier({ edt_ressource: ['Direct Planning Tree_4087'], edt_libelle: ['Promo'] }, LU_LE);
            expect(dossier).not.toHaveProperty('edtPersonnelIntrouvable');
        });

        it('reste absent quand le portail ne declare aucune ressource : il n a rien promis', () => {
            expect(projeterDossier({ numero_etudiant: '21000001' }, LU_LE)).not.toHaveProperty('edtPersonnelIntrouvable');
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
        // Le suffixe doit **terminer** le code : un mot au milieu ne dit rien de sa nature.
        expect(cleDeMessage(echec('blocked', 'X_INDISPONIBLE_Y'))).toBe('ERROR_BLOCKED');
    });

    it('presente comme un service injoignable tout code en _INDISPONIBLE que la table ne nomme pas', () => {
        // Le cas du soir de la 6.0 : MOODLE_INDISPONIBLE s'affichait « Connexion interrompue ».
        expect(cleDeMessage(echec('blocked', 'MOODLE_INDISPONIBLE'))).toBe('ERROR_PORTAL_SERVICE_UNAVAILABLE');
        expect(cleDeTitre(echec('blocked', 'MOODLE_INDISPONIBLE'))).toBe('ERROR_PORTAL_SERVICE_UNAVAILABLE_TITLE');
        // Le pluriel, que le Blueprint des documents emploie.
        expect(cleDeMessage(echec('blocked', 'DOCUMENTS_INDISPONIBLES'))).toBe('ERROR_PORTAL_SERVICE_UNAVAILABLE');
    });

    it('laisse la table gagner sur la regle pour les codes qu elle nomme precisement', () => {
        expect(cleDeMessage(echec('blocked', 'CAS_INDISPONIBLE'))).toBe('ERROR_CAS_UNAVAILABLE');
        expect(cleDeTitre(echec('blocked', 'MESSAGERIE_INDISPONIBLE'))).toBe('ERROR_MAILBOX_UNAVAILABLE_TITLE');
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
        // Par la regle, sans ligne dediee : le widget suivant n'aura rien a declarer.
        expect(presenterEchec(echec('blocked', 'MOODLE_INDISPONIBLE')).retryable).toBe(true);
        expect(presenterEchec(echec('blocked', 'DOCUMENTS_INDISPONIBLES')).retryable).toBe(true);
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

describe('estServiceIndisponible', () => {
    const echec = (kind: UkitFailure['kind'], code?: string): UkitFailure => ({
        kind,
        ...(code !== undefined ? { code } : {}),
        ...FAILURE_PRESENTATION[kind],
    });

    it('reconnait le suffixe, au singulier comme au pluriel, et lui seul', () => {
        expect(estCodeDeServiceIndisponible('MOODLE_INDISPONIBLE')).toBe(true);
        expect(estCodeDeServiceIndisponible('COORDONNEES_INDISPONIBLES')).toBe(true);
        expect(estCodeDeServiceIndisponible('X_INDISPONIBLE_Y')).toBe(false);
        expect(estCodeDeServiceIndisponible('LOGIN_FAILED')).toBe(false);
        expect(estCodeDeServiceIndisponible(undefined)).toBe(false);
    });

    it('couvre la famille du moteur autant que les codes de Blueprint', () => {
        expect(estServiceIndisponible(echec('unavailable'))).toBe(true);
        expect(estServiceIndisponible(echec('blocked', 'CAS_INDISPONIBLE'))).toBe(true);
        expect(estServiceIndisponible(echec('blocked', 'LOGIN_FAILED'))).toBe(false);
        expect(estServiceIndisponible(echec('data'))).toBe(false);
    });
});

describe('requalifierLenteur', () => {
    const engine: UkitFailure = { kind: 'engine', detail: 'wait_for : page pas prete', ...FAILURE_PRESENTATION.engine };

    it('dit un portail lent apres une navigation de plus de dix secondes, pas « le probleme vient de UKit »', () => {
        // Le constat du banc du 2026-11-06 : douze secondes sur « Un moment SVP… », puis `engine`.
        const lent = presenterEchec(requalifierLenteur(engine, 12_000));
        expect(lent.kind).toBe('unavailable');
        expect(lent.code).toBe('PORTAIL_LENT');
        expect(lent.messageKey).toBe('ERROR_PORTAL_SLOW');
        expect(lent.titleKey).toBe('ERROR_PORTAL_SLOW_TITLE');
        expect(lent.retryable).toBe(true);
        expect(lent.detail).toContain('12000 ms');
    });

    it('dit un portail lent quand la page ne s est pas chargee a temps, meme apres une navigation rapide', () => {
        // Le texte exact du moteur, releve au banc le 2026-11-10 : la redirection du CAS apres le clic.
        const pasPrete: UkitFailure = {
            kind: 'engine',
            detail: 'the page did not become ready within 2000 ms (no agent announced itself: the document may have failed to load)',
            ...FAILURE_PRESENTATION.engine,
        };
        const lent = presenterEchec(requalifierLenteur(pasPrete, 2_072));
        expect(lent.code).toBe('PORTAIL_LENT');
        expect(lent.retryable).toBe(true);
        expect(lent.detail).toContain('no agent announced itself');
    });

    it('laisse un engine apres une navigation rapide : c est alors bien un defaut', () => {
        expect(requalifierLenteur(engine, 3_000)).toBe(engine);
        expect(cleDeMessage(requalifierLenteur(engine, 0))).toBe('ERROR_INTERNAL');
    });

    it('ne touche ni un code nomme par le Blueprint, ni une autre famille', () => {
        const cas: UkitFailure = { ...engine, kind: 'blocked', code: 'CAS_INDISPONIBLE', ...FAILURE_PRESENTATION.blocked };
        expect(requalifierLenteur(cas, 30_000)).toBe(cas);
        const nomme: UkitFailure = { ...engine, code: 'AUTRE' };
        expect(requalifierLenteur(nomme, 30_000)).toBe(nomme);
    });
});
