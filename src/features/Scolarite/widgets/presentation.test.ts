/**
 * Six etats, et trois d'entre eux se ressemblent assez pour etre confondus a la relecture :
 * « on ne sait pas encore », « on a lu et il n'y a rien », « il n'y a rien a lire ici ». Chacun
 * appelle une phrase differente a l'ecran, et se tromper de phrase, c'est mentir a l'utilisateur.
 */

import { describe, expect, it } from 'vitest';

import { echecDeTuile, etatDeLaRangee } from './presentation';
import { FAILURE_PRESENTATION, type UkitFailure } from '../../../shared/aetherius/failures';

const valeur = (nombre: number | null, detail: string | null = null) => ({
    nombre, detail, luLe: '2026-08-28T10:00:00.000Z',
});

const echec = (silent = false): UkitFailure => ({
    kind: 'unavailable',
    titleKey: 'ERROR_MAILBOX_UNAVAILABLE_TITLE',
    messageKey: 'ERROR_MAILBOX_UNAVAILABLE',
    detail: 'sonde',
    retryable: true,
    ...(silent ? { silent: true } : {}),
}) as UkitFailure;

const entrees = (extra: Partial<Parameters<typeof etatDeLaRangee>[0]> = {}) => ({
    valeur: undefined, echec: null, enCours: false, aUneSource: true, aUnePorte: true, ...extra,
});

describe('etatDeLaRangee', () => {
    it('montre l echec quand il a quelque chose a dire', () => {
        expect(etatDeLaRangee(entrees({ echec: echec() })).nature).toBe('echec');
    });

    it('ignore un echec silencieux : un run annule n a rien a raconter', () => {
        expect(etatDeLaRangee(entrees({ echec: echec(true) })).nature).toBe('attente');
    });

    it('montre le compte des qu il y en a un, zero compris', () => {
        expect(etatDeLaRangee(entrees({ valeur: valeur(0) })).nature).toBe('compte');
        expect(etatDeLaRangee(entrees({ valeur: valeur(3) })).nombre).toBe(3);
    });

    it('garde un echec affiche pendant sa relance, et pose l indicateur a cote', () => {
        const etat = etatDeLaRangee(entrees({ echec: echec(), enCours: true }));
        expect(etat.nature).toBe('echec');
        expect(etat.chargement).toBe(true);
    });

    it('garde la valeur affichee pendant une relecture, et pose l indicateur a cote', () => {
        const etat = etatDeLaRangee(entrees({ valeur: valeur(3), enCours: true }));
        expect(etat.nature).toBe('compte');
        expect(etat.nombre).toBe(3);
        expect(etat.chargement).toBe(true);
    });

    it('attend quand une source existe et qu on ne sait encore rien', () => {
        expect(etatDeLaRangee(entrees()).nature).toBe('attente');
    });

    it('redevient une porte quand la lecture a fini sans rien d exploitable', () => {
        expect(etatDeLaRangee(entrees({ valeur: valeur(null) })).nature).toBe('inconnu');
    });

    it('annonce « bientot » sans source mais avec une porte', () => {
        expect(etatDeLaRangee(entrees({ aUneSource: false })).nature).toBe('bientot');
    });

    it('constate l absence quand il n y a ni source ni porte', () => {
        expect(etatDeLaRangee(entrees({ aUneSource: false, aUnePorte: false })).nature).toBe('absent');
    });

    it('ne confond pas « bientot » et « absent » : ils appellent deux phrases opposees', () => {
        const bientot = etatDeLaRangee(entrees({ aUneSource: false, aUnePorte: true }));
        const absent = etatDeLaRangee(entrees({ aUneSource: false, aUnePorte: false }));
        expect(bientot.nature).not.toBe(absent.nature);
    });

    it('porte le detail de la source jusqu a la rangee', () => {
        expect(etatDeLaRangee(entrees({ valeur: valeur(2, 'Devoir de calcul') })).detail)
            .toBe('Devoir de calcul');
    });
});

describe('echecDeTuile', () => {
    const defaillance = (kind: UkitFailure['kind'], code?: string): UkitFailure => ({
        kind,
        ...(code !== undefined ? { code } : {}),
        ...FAILURE_PRESENTATION[kind],
    });

    it('mene un refus d identifiants droit a la ressaisie, sans rien a relancer', () => {
        const decision = echecDeTuile(defaillance('blocked', 'LOGIN_FAILED'));
        expect(decision.famille).toBe('ressaisie');
        expect(decision.ouvre).toBe('ressaisie');
        expect(decision.relancable).toBe(false);
        expect(decision.libelleKey).toBe('WIDGET_FAILURE_REENTER');
    });

    it('dit « indisponible » pour un service momentanement absent, par le code ou par la famille', () => {
        expect(echecDeTuile(defaillance('blocked', 'MOODLE_INDISPONIBLE')).famille).toBe('indisponible');
        expect(echecDeTuile(defaillance('unavailable')).famille).toBe('indisponible');
        expect(echecDeTuile(defaillance('blocked', 'MOODLE_INDISPONIBLE')).relancable).toBe(true);
    });

    it('dit « erreur » pour tout le reste, et ouvre la feuille', () => {
        for (const kind of ['rejected', 'data', 'config'] as const) {
            const decision = echecDeTuile(defaillance(kind));
            expect(decision.famille).toBe('erreur');
            expect(decision.ouvre).toBe('feuille');
            expect(decision.relancable).toBe(true);
        }
    });

    it('ne propose pas de relancer un probleme de notre cote', () => {
        const decision = echecDeTuile(defaillance('engine'));
        expect(decision.famille).toBe('erreur');
        expect(decision.relancable).toBe(false);
    });
});
