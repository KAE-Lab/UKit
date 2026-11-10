import { describe, expect, it } from 'vitest';

import { estGroupeInactif } from './groupeInactif';

const cours = (start: string) => ({ date: { start } });

describe('estGroupeInactif', () => {
    it('un groupe sans aucun cours est inactif', () => {
        expect(estGroupeInactif([], '2026-11-10')).toBe(true);
    });

    it('un cours a moins de quatre semaines, avant ou apres, garde le groupe actif', () => {
        expect(estGroupeInactif([cours('2026-11-30T08:00:00.000Z')], '2026-11-10')).toBe(false);
        expect(estGroupeInactif([cours('2026-10-20T08:00:00.000Z')], '2026-11-10')).toBe(false);
    });

    it('deux semaines de vacances ne suffisent pas a le declarer inactif', () => {
        // Le dernier cours le 19 decembre, le suivant le 5 janvier : le 26 decembre reste « libre ».
        const noel = [cours('2026-12-19T09:00:00.000Z'), cours('2027-01-05T08:00:00.000Z')];
        expect(estGroupeInactif(noel, '2026-12-26')).toBe(false);
    });

    it('des cours a plus de quatre semaines seulement : inactif', () => {
        expect(estGroupeInactif([cours('2026-05-20T08:00:00.000Z'), cours('2027-02-01T08:00:00.000Z')], '2026-11-10')).toBe(true);
    });

    it('ignore une date illisible plutot que d en conclure un cours', () => {
        expect(estGroupeInactif([cours('Invalid date'), {}], '2026-11-10')).toBe(true);
    });

    it('compte les bornes a la journee locale', () => {
        // 28 jours avant le 10 novembre : le 13 octobre, a 00:30 a Paris (22:30 UTC la veille).
        expect(estGroupeInactif([cours('2026-10-12T22:30:00.000Z')], '2026-11-10')).toBe(false);
    });
});
