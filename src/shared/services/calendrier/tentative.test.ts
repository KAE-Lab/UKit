/**
 * Ce que la trace de synchronisation doit tenir : une lecture qui ne leve jamais, et une echeance
 * qui ne se laisse pas pieger par une horloge qui recule.
 */

import { describe, expect, it } from 'vitest';

import { INTERVALLE_ENTRETIEN_MS, estDu, lireTentative } from './tentative';

describe('lireTentative', () => {
    it('relit une tentative ecrite', () => {
        expect(lireTentative(JSON.stringify({ at: 1000, ok: false, origine: 'tache' })))
            .toEqual({ at: 1000, ok: false, origine: 'tache' });
    });

    it('rend null sur tout ce qui n est pas une tentative, sans lever', () => {
        expect(lireTentative(null)).toBeNull();
        expect(lireTentative('')).toBeNull();
        expect(lireTentative('{')).toBeNull();
        expect(lireTentative('42')).toBeNull();
        expect(lireTentative(JSON.stringify({ at: 'hier', ok: true, origine: 'tache' }))).toBeNull();
        expect(lireTentative(JSON.stringify({ at: 1, ok: 'oui', origine: 'tache' }))).toBeNull();
        expect(lireTentative(JSON.stringify({ at: 1, ok: true, origine: 'ailleurs' }))).toBeNull();
    });
});

describe('estDu', () => {
    const T = 1_700_000_000_000;

    it('est du quand rien n a jamais ete joue', () => {
        expect(estDu(null, T)).toBe(true);
    });

    it('attend l intervalle, puis devient du', () => {
        expect(estDu(T, T + INTERVALLE_ENTRETIEN_MS - 1)).toBe(false);
        expect(estDu(T, T + INTERVALLE_ENTRETIEN_MS)).toBe(true);
    });

    it('est du quand l horloge a recule', () => {
        // Une date simulee dans le passe, ou un fuseau change : on rejoue plutot que d'attendre une
        // echeance qui ne viendra pas.
        expect(estDu(T, T - 1)).toBe(true);
    });
});
