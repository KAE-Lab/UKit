/**
 * L'evenement d'une annonce : la forme lue des colonnes, les refus de la console, le passe.
 *
 *     npm test
 */

import { describe, expect, test } from 'vitest';

import { estPasse, lireEvenement, refusDeLEvenement } from './evenement';

const DEBUT = '2026-12-03T18:00:00+01:00';
const FIN = '2026-12-03T20:00:00+01:00';

describe('l’evenement d’une annonce', () => {
    test('un evenement complet se lit, le lieu nettoye, les instants en millisecondes', () => {
        expect(lireEvenement('evenement', DEBUT, FIN, ' Amphi A22 ')).toEqual({
            debut: Date.parse('2026-12-03T17:00:00Z'),
            fin: Date.parse('2026-12-03T19:00:00Z'),
            lieu: 'Amphi A22',
        });
    });

    test('une soiree qui passe minuit, et vingt-quatre heures pile, se lisent', () => {
        expect(lireEvenement('evenement', '2026-12-03T22:00:00+01:00', '2026-12-04T03:00:00+01:00', 'Le Rocher')).not.toBeNull();
        expect(lireEvenement('evenement', '2026-12-03T08:00:00Z', '2026-12-04T08:00:00Z', 'Le Rocher')).not.toBeNull();
    });

    test('le lieu se compte en caracteres, comme la base : cent vingt emojis passent', () => {
        expect(lireEvenement('evenement', DEBUT, FIN, '🎉'.repeat(120))).not.toBeNull();
        expect(lireEvenement('evenement', DEBUT, FIN, '🎉'.repeat(121))).toBeNull();
    });

    test('hors du type evenement, rien : l’evenement survit a un changement de type, la carte ne le montre pas', () => {
        expect(lireEvenement('info', DEBUT, FIN, 'Amphi A22')).toBeNull();
        expect(lireEvenement(undefined, DEBUT, FIN, 'Amphi A22')).toBeNull();
    });

    test('hors de la forme de la base, rien', () => {
        const refuses: [unknown, unknown, unknown][] = [
            [null, null, null],
            [DEBUT, null, 'Amphi'],
            [DEBUT, FIN, ''],
            [DEBUT, DEBUT, 'Amphi'],
            [FIN, DEBUT, 'Amphi'],
            [DEBUT, '2026-12-04T18:00:01+01:00', 'Amphi'],
            [DEBUT, FIN, ' A '],
            [DEBUT, FIN, 'x'.repeat(121)],
            ['demain', FIN, 'Amphi'],
        ];
        for (const [d, f, l] of refuses) expect(lireEvenement('evenement', d, f, l)).toBeNull();
    });
});

describe('les refus de la console', () => {
    test('les trois vides : pas d’evenement, recevable', () => {
        expect(refusDeLEvenement('', '', '')).toBeNull();
        expect(refusDeLEvenement(null, undefined, '  ')).toBeNull();
    });

    test('chaque refus dit sa raison', () => {
        expect(refusDeLEvenement(DEBUT, '', '')).toMatch(/début, une fin et un lieu/);
        expect(refusDeLEvenement(FIN, DEBUT, 'Amphi')).toMatch(/après son début/);
        expect(refusDeLEvenement(DEBUT, '2026-12-05T18:00:00+01:00', 'Amphi')).toMatch(/vingt-quatre heures/);
        expect(refusDeLEvenement(DEBUT, FIN, 'A')).toMatch(/2 à 120/);
    });
});

test('un evenement fini est passe, un evenement en cours ne l’est pas', () => {
    const e = lireEvenement('evenement', DEBUT, FIN, 'Amphi A22');
    if (e === null) throw new Error('evenement attendu');
    expect(estPasse(e, e.fin)).toBe(true);
    expect(estPasse(e, e.fin - 1)).toBe(false);
});
