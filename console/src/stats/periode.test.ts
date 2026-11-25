/**
 * La periode des statistiques : les jours, la precedente, les tranches, l'adresse.
 *
 *     npm test   (a la racine du depot ; TZ = Europe/Paris)
 */

import { describe, expect, test } from 'vitest';

import {
    derniersJours, duree, estComparable, estUnJour, joursDe, libelleDePeriode, lundiDe, periodeDepuisParams, poserPeriode, precedente, semainesDe, tranchesDe,
} from './periode';

const SEMAINE = { du: '2026-11-17', au: '2026-11-23' };
// Un mercredi soir a Paris : le jour local est le 25, quel que soit l'instant UTC.
const MAINTENANT = new Date('2026-11-25T23:30:00+01:00');

describe('les jours', () => {
    test('une semaine compte sept jours, bornes comprises, et traverse un changement de mois', () => {
        expect(duree(SEMAINE)).toBe(7);
        expect(joursDe({ du: '2026-10-30', au: '2026-11-02' })).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    });

    test('le passage a l heure d hiver ne fait ni perdre ni doubler un jour', () => {
        expect(joursDe({ du: '2026-10-24', au: '2026-10-26' })).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    });

    test('un jour qui n existe pas n est pas un jour', () => {
        expect(estUnJour('2026-11-31')).toBe(false);
        expect(estUnJour('2026-11-3')).toBe(false);
        expect(estUnJour('2026-02-28')).toBe(true);
    });

    test('la periode precedente a la meme duree et finit la veille', () => {
        expect(precedente(SEMAINE)).toEqual({ du: '2026-11-10', au: '2026-11-16' });
        expect(precedente({ du: '2026-11-01', au: '2026-11-01' })).toEqual({ du: '2026-10-31', au: '2026-10-31' });
    });

    test('les derniers jours finissent hier, en jour local', () => {
        expect(derniersJours(7, MAINTENANT)).toEqual({ du: '2026-11-18', au: '2026-11-24' });
    });
});

describe('les tranches et les semaines', () => {
    test('le lundi d un jour', () => {
        expect(lundiDe('2026-11-17')).toBe('2026-11-16');
        expect(lundiDe('2026-11-16')).toBe('2026-11-16');
        expect(lundiDe('2026-11-22')).toBe('2026-11-16');
    });

    test('les tranches sont des semaines entieres qui couvrent la periode', () => {
        expect(tranchesDe(SEMAINE)).toEqual([{ du: '2026-11-16', au: '2026-11-22' }, { du: '2026-11-23', au: '2026-11-29' }]);
    });

    test('les semaines du rapport sont rognees a la periode', () => {
        expect(semainesDe(SEMAINE)).toEqual([{ du: '2026-11-17', au: '2026-11-22' }, { du: '2026-11-23', au: '2026-11-23' }]);
    });
});

describe('l adresse', () => {
    test('une plage valide l emporte sur le prereglage', () => {
        const choix = periodeDepuisParams(new URLSearchParams('du=2026-11-17&au=2026-11-23&periode=28'), MAINTENANT);
        expect(choix).toEqual({ periode: SEMAINE, prereglage: null });
    });

    test('une adresse hors forme retombe sur le prereglage, puis sur le defaut', () => {
        expect(periodeDepuisParams(new URLSearchParams('du=2026-11-23&au=2026-11-17&periode=28'), MAINTENANT).prereglage).toBe('28');
        expect(periodeDepuisParams(new URLSearchParams('du=hier&au=2026-11-17'), MAINTENANT)).toEqual({ periode: { du: '2026-11-18', au: '2026-11-24' }, prereglage: '7' });
        expect(periodeDepuisParams(new URLSearchParams('du=2024-01-01&au=2026-11-17'), MAINTENANT).prereglage).toBe('7');
    });

    test('poser un choix remplace l ancien et garde le reste de l adresse', () => {
        const avant = new URLSearchParams('periode=28&testeurs=1');
        expect(poserPeriode(avant, { periode: SEMAINE }).toString()).toBe('testeurs=1&du=2026-11-17&au=2026-11-23');
        expect(poserPeriode(new URLSearchParams('du=2026-11-17&au=2026-11-23'), { prereglage: '90' }).toString()).toBe('periode=90');
        expect(poserPeriode(avant, { prereglage: '7' }).toString()).toBe('testeurs=1');
    });
});

test('une periode se dit en francais', () => {
    expect(libelleDePeriode(SEMAINE)).toBe('17–23 novembre 2026');
    expect(libelleDePeriode({ du: '2026-11-17', au: '2026-11-17' })).toBe('17 novembre 2026');
});

test('une periode precedente se compare a partir du 2 decembre 2026, deux semaines apres la 6.3.1', () => {
    expect(estComparable({ du: '2026-11-18', au: '2026-11-24' })).toBe(false);
    expect(estComparable({ du: '2026-12-01', au: '2026-12-07' })).toBe(false);
    expect(estComparable({ du: '2026-12-02', au: '2026-12-08' })).toBe(true);
    expect(estComparable(precedente({ du: '2026-12-09', au: '2026-12-15' }))).toBe(true);
});
