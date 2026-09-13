/** Ce que le lien vers les plans doit tenir : la forme d'avant sur des coordonnees, une adresse encodee. */

import { describe, expect, it } from 'vitest';

import { lienVersLePlan } from './lienVersLePlan';

describe('lienVersLePlan', () => {
    it('garde la forme historique sur des coordonnees', () => {
        expect(lienVersLePlan({ lat: 44.8, lng: -0.6 })).toBe('https://www.google.com/maps/search/?api=1&query=44.8,-0.6');
    });

    it('encode une adresse, accents et virgules compris, et la debarrasse de ses espaces', () => {
        expect(lienVersLePlan({ adresse: ' 12 rue Sainte-Catherine, Bordeaux ' }))
            .toBe('https://www.google.com/maps/search/?api=1&query=12%20rue%20Sainte-Catherine%2C%20Bordeaux');
        expect(lienVersLePlan({ adresse: 'Chez Émile' })).toBe('https://www.google.com/maps/search/?api=1&query=Chez%20%C3%89mile');
    });
});
