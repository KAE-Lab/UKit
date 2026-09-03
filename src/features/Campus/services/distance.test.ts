import { describe, expect, it } from 'vitest';

import { getDistanceInKm } from './distance';

const BORDEAUX_CENTRE = { lat: 44.8377, lon: -0.5791 };
const CAMPUS_TALENCE = { lat: 44.7963, lon: -0.6277 };

describe('getDistanceInKm', () => {
    it('vaut zero entre un point et lui-meme', () => {
        expect(getDistanceInKm(BORDEAUX_CENTRE.lat, BORDEAUX_CENTRE.lon, BORDEAUX_CENTRE.lat, BORDEAUX_CENTRE.lon)).toBe(0);
    });

    it('mesure les six kilometres entre le centre de Bordeaux et le campus de Talence', () => {
        const d = getDistanceInKm(BORDEAUX_CENTRE.lat, BORDEAUX_CENTRE.lon, CAMPUS_TALENCE.lat, CAMPUS_TALENCE.lon);
        expect(d).toBeGreaterThan(5.8);
        expect(d).toBeLessThan(6.2);
    });

    it('est symetrique', () => {
        const aller = getDistanceInKm(BORDEAUX_CENTRE.lat, BORDEAUX_CENTRE.lon, CAMPUS_TALENCE.lat, CAMPUS_TALENCE.lon);
        const retour = getDistanceInKm(CAMPUS_TALENCE.lat, CAMPUS_TALENCE.lon, BORDEAUX_CENTRE.lat, BORDEAUX_CENTRE.lon);
        expect(aller).toBeCloseTo(retour, 10);
    });
});
