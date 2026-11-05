import { describe, expect, it } from 'vitest';

import { formaterDistance, getDistanceInKm } from './distance';

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

describe('formaterDistance', () => {
    it('ecrit les metres a la dizaine, jamais zero', () => {
        expect(formaterDistance(0.2774, 'fr')).toBe('280 m');
        expect(formaterDistance(0.001, 'fr')).toBe('10 m');
    });

    it('garde une decimale sous dix kilometres, au separateur de la langue', () => {
        expect(formaterDistance(1.234, 'fr')).toBe('1,2 km');
        expect(formaterDistance(1.234, 'en')).toBe('1.2 km');
    });

    it('arrondit au kilometre au-dela, avec les milliers groupes', () => {
        expect(formaterDistance(9045.4, 'fr')).toBe('9 045 km');
        expect(formaterDistance(9045.4, 'es')).toBe('9.045 km');
        expect(formaterDistance(12.6, 'en')).toBe('13 km');
    });

    it('retombe sur l anglais pour une langue inconnue', () => {
        expect(formaterDistance(2.5, 'de')).toBe('2.5 km');
    });
});
