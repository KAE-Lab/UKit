/**
 * La regle de presentation : quoi montrer, une chose a la fois, et dans quel ordre.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import type { ContexteDeCiblage } from '../ciblage/ciblage';
import { choisirPresentation, messagesVisibles, RIEN_A_MONTRER } from './presentation';
import { projeterMessage, type MessageDeService } from './projection';

const MAINTENANT = new Date('2026-09-03T10:00:00Z');
const CONTEXTE: ContexteDeCiblage = { testeur: false, etablissement: 'bordeaux', version: '6.1.0' };

function message(patch: Record<string, unknown>): MessageDeService {
    const projete = projeterMessage({
        cle: 'm', niveau: 'info', titre: 'Titre', corps: null, actif: true,
        publie_le: '2026-09-01T08:00:00+00:00', expire_le: null,
        ...patch,
    });
    if (projete === null) throw new Error('fixture invalide');
    return projete;
}

const INFO = message({ cle: 'info', niveau: 'info', publie_le: '2026-09-02T08:00:00+00:00' });
const AVERTISSEMENT = message({ cle: 'avert', niveau: 'avertissement' });
const INCIDENT = message({ cle: 'incident', niveau: 'incident' });

test('rien a montrer sans message', () => {
    expect(choisirPresentation([], new Set(), CONTEXTE, MAINTENANT)).toEqual(RIEN_A_MONTRER);
});

test('une information non vue est un bandeau, puis plus rien', () => {
    expect(choisirPresentation([INFO], new Set(), CONTEXTE, MAINTENANT)).toEqual({ modale: null, bandeau: INFO, rappel: null });
    expect(choisirPresentation([INFO], new Set(['info']), CONTEXTE, MAINTENANT)).toEqual(RIEN_A_MONTRER);
});

test('un avertissement non vu est une modale, puis plus rien', () => {
    expect(choisirPresentation([AVERTISSEMENT], new Set(), CONTEXTE, MAINTENANT)).toEqual({ modale: AVERTISSEMENT, bandeau: null, rappel: null });
    expect(choisirPresentation([AVERTISSEMENT], new Set(['avert']), CONTEXTE, MAINTENANT)).toEqual(RIEN_A_MONTRER);
});

test('un incident est une modale une fois, puis un rappel tant qu il dure', () => {
    expect(choisirPresentation([INCIDENT], new Set(), CONTEXTE, MAINTENANT)).toEqual({ modale: INCIDENT, bandeau: null, rappel: null });
    expect(choisirPresentation([INCIDENT], new Set(['incident']), CONTEXTE, MAINTENANT)).toEqual({ modale: null, bandeau: null, rappel: INCIDENT });
    const termine = message({ cle: 'incident', niveau: 'incident', actif: false });
    expect(choisirPresentation([termine], new Set(['incident']), CONTEXTE, MAINTENANT)).toEqual(RIEN_A_MONTRER);
});

test('l incident passe avant l avertissement, qui passe avant le bandeau ; le rappel coexiste', () => {
    const tous = [INFO, AVERTISSEMENT, INCIDENT];
    expect(choisirPresentation(tous, new Set(), CONTEXTE, MAINTENANT)).toEqual({ modale: INCIDENT, bandeau: null, rappel: null });
    expect(choisirPresentation(tous, new Set(['incident']), CONTEXTE, MAINTENANT)).toEqual({ modale: AVERTISSEMENT, bandeau: null, rappel: INCIDENT });
    expect(choisirPresentation(tous, new Set(['incident', 'avert']), CONTEXTE, MAINTENANT)).toEqual({ modale: null, bandeau: INFO, rappel: INCIDENT });
    expect(choisirPresentation(tous, new Set(['incident', 'avert', 'info']), CONTEXTE, MAINTENANT)).toEqual({ modale: null, bandeau: null, rappel: INCIDENT });
});

test('entre deux informations, la plus recente d abord', () => {
    const ancienne = message({ cle: 'ancienne', publie_le: '2026-08-01T08:00:00+00:00' });
    expect(messagesVisibles([ancienne, INFO], CONTEXTE, MAINTENANT).map((m) => m.cle)).toEqual(['info', 'ancienne']);
});

test('le ciblage et la peremption s appliquent avant tout', () => {
    const testeurs = message({ cle: 't', niveau: 'incident', audience: 'testeurs' });
    const inp = message({ cle: 'inp', niveau: 'incident', etablissements: ['bordeaux-inp'] });
    const expire = message({ cle: 'e', niveau: 'incident', expire_le: '2026-09-01T00:00:00Z' });
    expect(choisirPresentation([testeurs, inp, expire], new Set(), CONTEXTE, MAINTENANT)).toEqual(RIEN_A_MONTRER);
    expect(choisirPresentation([testeurs], new Set(), { ...CONTEXTE, testeur: true }, MAINTENANT).modale).toBe(testeurs);
    expect(choisirPresentation([inp], new Set(), { ...CONTEXTE, etablissement: 'bordeaux-inp' }, MAINTENANT).modale).toBe(inp);
});
