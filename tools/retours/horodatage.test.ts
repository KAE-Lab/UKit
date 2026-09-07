/**
 * Les deux ecritures d'un meme instant par Google, et l'heure d'ete lue dans le calendrier plutot
 * que supposee. Aucun test ne depend du fuseau du harnais : tout nomme le sien.
 */

import { describe, expect, it } from 'vitest';

import { decalageMinutes, versUtc } from './horodatage.mjs';

describe('versUtc', () => {
    it('lit la forme de l exportateur, avec son decalage', () => {
        expect(versUtc('2026/09/01 8:46:43 AM GMT+3')).toBe('2026-09-01T05:46:43.000Z');
        expect(versUtc('2026/09/03 11:25:46 PM GMT+3')).toBe('2026-09-03T20:25:46.000Z');
    });

    it('lit la forme de la feuille, en heure de Paris, ete comme hiver', () => {
        expect(versUtc('9/1/2026 7:46:43')).toBe('2026-09-01T05:46:43.000Z');
        expect(versUtc('12/15/2026 8:00:00')).toBe('2026-12-15T07:00:00.000Z');
    });

    it('rend le meme instant pour les deux formes', () => {
        expect(versUtc('9/1/2026 7:46:43')).toBe(versUtc('2026/09/01 8:46:43 AM GMT+3'));
        expect(versUtc('12/15/2026 8:00:00')).toBe(versUtc('2026/12/15 10:00:00 AM GMT+3'));
    });

    it('sait que 12 AM est minuit et 12 PM midi', () => {
        expect(versUtc('2026/09/01 12:05:00 AM GMT+0')).toBe('2026-09-01T00:05:00.000Z');
        expect(versUtc('2026/09/01 12:05:00 PM GMT+0')).toBe('2026-09-01T12:05:00.000Z');
    });

    it('accepte un decalage negatif ou a la demi-heure', () => {
        expect(versUtc('2026/09/01 8:00:00 AM GMT-5')).toBe('2026-09-01T13:00:00.000Z');
        expect(versUtc('2026/09/01 8:00:00 AM GMT+5:30')).toBe('2026-09-01T02:30:00.000Z');
    });

    it('respecte le fuseau de la feuille quand il est donne', () => {
        expect(versUtc('9/1/2026 7:46:43', 'UTC')).toBe('2026-09-01T07:46:43.000Z');
    });

    it('laisse passer un ISO 8601', () => {
        expect(versUtc('2026-09-01T05:46:43Z')).toBe('2026-09-01T05:46:43.000Z');
    });

    it('rend une valeur au bord du changement d heure', () => {
        expect(versUtc('10/25/2026 2:30:00')).not.toBeNull();
        expect(versUtc('3/29/2026 2:30:00')).not.toBeNull();
    });

    it('rend null sur ce qu il ne reconnait pas', () => {
        expect(versUtc('')).toBeNull();
        expect(versUtc('hier')).toBeNull();
        expect(versUtc('13/40/2026 8:00:00')).toBeNull();
        expect(versUtc('2026/09/01 13:00:00 AM GMT+3')).toBeNull();
    });
});

describe('decalageMinutes', () => {
    it('lit l heure d ete et l heure d hiver de Paris', () => {
        expect(decalageMinutes(Date.UTC(2026, 6, 1), 'Europe/Paris')).toBe(120);
        expect(decalageMinutes(Date.UTC(2026, 0, 1), 'Europe/Paris')).toBe(60);
        expect(decalageMinutes(Date.UTC(2026, 0, 1), 'UTC')).toBe(0);
        expect(decalageMinutes(Date.UTC(2026, 0, 1), 'Asia/Kolkata')).toBe(330);
    });
});
