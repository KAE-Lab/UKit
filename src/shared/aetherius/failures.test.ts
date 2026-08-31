/**
 * Le modele d'erreur : ce que chaque famille dit a un ecran.
 *
 * Jouable hors appareil parce que `failures.ts` importe `describeFailure` du moteur neutre
 * plateforme, jamais du paquet React Native qui le re-exporte. C'est la contrainte qui a decide de
 * cet import, et la casser rendra ce fichier injouable : ce sera le signal.
 *
 *     npm test
 */

import {
    DependencyError,
    ExtractionError,
    NetworkError,
    RunCancelledError,
    StatusAssertionError,
    StepTimeoutError,
    TemplateError,
} from '@aetherius/engine';
import { expect, test } from 'vitest';

import {
    FAILURE_PRESENTATION,
    describeUkitFailure,
    ukitFailure,
    type UkitFailureKind,
} from './failures';

const FAMILLES: readonly UkitFailureKind[] = [
    'blueprint',
    'unavailable',
    'rejected',
    'blocked',
    'data',
    'config',
    'cancelled',
    'unsupported',
    'engine',
];

test('chaque famille du moteur a une presentation', () => {
    for (const famille of FAMILLES) {
        const presentation = FAILURE_PRESENTATION[famille];
        expect(presentation, `famille sans presentation : ${famille}`).toBeTruthy();
        expect(presentation.messageKey).not.toBe('');
        // Le titre est aussi obligatoire que le message depuis que l'etat plein ecran en porte un :
        // une famille sans titre rendrait un bloc sans premiere ligne, et le compilateur ne le voit
        // pas — `titleKey` est une chaine, une chaine vide compile.
        expect(presentation.titleKey, `famille sans titre : ${famille}`).not.toBe('');
    }
    // Une famille ajoutee par le moteur casserait la compilation du Record, pas ce test : la garde
    // reelle est le typage. Ce test verifie qu'aucune entree n'a ete videe.
    expect(Object.keys(FAILURE_PRESENTATION)).toHaveLength(FAMILLES.length);
});

test('une source injoignable est la seule famille reessayable', () => {
    const failure = describeUkitFailure(new NetworkError('connexion perdue'));
    expect(failure.kind).toBe('unavailable');
    expect(failure.retryable).toBe(true);
    expect(failure.messageKey).toBe('ERROR_SERVICE_UNAVAILABLE');

    const reessayables = FAMILLES.filter((famille) => FAILURE_PRESENTATION[famille].retryable);
    expect(reessayables).toEqual(['unavailable']);
});

test('un statut ou un assert inattendu range en rejected, non reessayable', () => {
    const failure = describeUkitFailure(new StatusAssertionError('Expected HTTP 200, got 404'));
    expect(failure.kind).toBe('rejected');
    // Le moteur marque cette famille reessayable ; la table de UKit tranche l'inverse. L'ecart est
    // documente dans failures.ts, et ce test est ce qui empeche de le « corriger » par megarde.
    expect(failure.retryable).toBe(false);
});

test('une extraction sans correspondance est un Blueprint a corriger', () => {
    const failure = describeUkitFailure(new ExtractionError('Cannot parse JSON response body'));
    expect(failure.kind).toBe('data');
    expect(failure.messageKey).toBe('ERROR_CONTENT_NOT_FOUND');
});

test('un secret absent demande a l utilisateur, il ne signale pas une panne', () => {
    const absent = new TemplateError("Undefined variable in expression: 'secrets.portail_user'");
    const failure = describeUkitFailure(absent);
    expect(failure.kind).toBe('config');
    expect(failure.messageKey).toBe('ERROR_MISSING_CREDENTIALS');
});

test('un echec nomme par le Blueprint porte son code', () => {
    const failure = describeUkitFailure(new StepTimeoutError('login refuse', 'LOGIN_FAILED'));
    expect(failure.kind).toBe('blocked');
    expect(failure.code).toBe('LOGIN_FAILED');
});

test('une attente qui expire sans nom parle de la page, pas d un blocage', () => {
    const failure = describeUkitFailure(new StepTimeoutError('selecteur introuvable'));
    expect(failure.kind).toBe('data');
    expect(failure.code).toBeUndefined();
});

test('un run annule ne montre rien', () => {
    const failure = describeUkitFailure(new RunCancelledError('run cancelled'));
    expect(failure.kind).toBe('cancelled');
    expect(failure.silent).toBe(true);
});

test('une piece de plateforme absente est unsupported', () => {
    const failure = describeUkitFailure(new DependencyError('aucune WebView montee'));
    expect(failure.kind).toBe('unsupported');
});

test('les deux canaux du moteur donnent la meme famille', () => {
    const cause = new NetworkError('connexion perdue');
    const parException = describeUkitFailure(cause);
    const parResult = describeUkitFailure({
        run_id: 'abc',
        blueprint_name: 'ukit.campus.annonces',
        status: 'failed',
        outputs: {},
        step_results: [],
        error: cause.message,
        cause,
        started_at: '2026-08-07T00:00:00Z',
        finished_at: '2026-08-07T00:00:01Z',
    });

    expect(parResult.kind).toBe(parException.kind);
    expect(parResult.retryable).toBe(parException.retryable);
});

test('un sujet qui n est pas un echec est signale plutot que tu', () => {
    const failure = describeUkitFailure({
        run_id: 'abc',
        blueprint_name: 'ukit.campus.annonces',
        status: 'success',
        outputs: { annonces: [] },
        step_results: [],
        started_at: '2026-08-07T00:00:00Z',
        finished_at: '2026-08-07T00:00:01Z',
    });

    expect(failure.kind).toBe('engine');
    expect(failure.silent).toBe(false);
});

test('le detail du moteur est porte, jamais perdu', () => {
    const failure = describeUkitFailure(new NetworkError('getaddrinfo ENOTFOUND cdn.jsdelivr.net'));
    expect(failure.detail).toMatch(/ENOTFOUND/);
});

test('un echec fabrique par un service prend sa presentation dans la table', () => {
    // Un run peut reussir et rendre autre chose que ce que le service attendait. Le constructeur
    // existe pour que ce cas ne recopie pas la table au point d'appel.
    const failure = ukitFailure('blueprint', "la sortie 'annonces' n'est pas une liste");

    expect(failure.kind).toBe('blueprint');
    expect(failure.detail).toMatch(/annonces/);
    expect(failure.messageKey).toBe(FAILURE_PRESENTATION.blueprint.messageKey);
    expect(failure.retryable).toBe(false);
});
