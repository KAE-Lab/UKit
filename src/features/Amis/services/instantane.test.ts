/** L'instantane : les creneaux occupes, leur forme compacte, l'expiration (docs/phase-8/8-amis.md). */

import { describe, expect, it } from 'vitest';

import {
    CRENEAUX_MAXIMUM,
    creneauxOccupes,
    decoderCreneaux,
    dernierJour,
    encoderCreneaux,
    estExpire,
    fondre,
    occupeLe,
} from './instantane';

const cours = (jour: string, starttime: string, endtime: string, extra: Record<string, unknown> = {}) => ({
    starttime,
    endtime,
    date: { start: `${jour}T${starttime}:00` },
    ...extra,
});

describe('creneauxOccupes', () => {
    it('garde les heures, rang du jour compris, et fond ce qui se recouvre ou se touche', () => {
        const creneaux = creneauxOccupes([
            cours('2026-11-25', '08:00', '10:00'),
            cours('2026-11-25', '10:00', '12:00'),
            cours('2026-11-25', '11:00', '12:30'),
            cours('2026-11-27', '14:00', '16:00'),
        ], '2026-11-25');
        expect(creneaux).toEqual([
            { jour: 0, debut: 480, fin: 750 },
            { jour: 2, debut: 840, fin: 960 },
        ]);
    });

    it('arrondit vers l exterieur, au pas de cinq minutes', () => {
        expect(creneauxOccupes([cours('2026-11-25', '08:07', '09:58')], '2026-11-25')).toEqual([{ jour: 0, debut: 485, fin: 600 }]);
    });

    it('ecarte les journees entieres, le telephone, les cours masques et ce qui sort des quatorze jours', () => {
        expect(creneauxOccupes([
            cours('2026-11-25', '00:00', '00:00', { journeeEntiere: true }),
            cours('2026-11-25', '12:00', '13:00', { source: 'telephone' }),
            cours('2026-11-25', '14:00', '15:00', { category: 'masked' }),
            cours('2026-11-24', '08:00', '10:00'),
            cours('2026-12-09', '08:00', '10:00'),
            cours('2026-12-08', '08:00', '10:00'),
            { starttime: '08:00', endtime: '10:00' },
            cours('2026-11-26', '10:00', '09:00'),
        ], '2026-11-25')).toEqual([{ jour: 13, debut: 480, fin: 600 }]);
    });
});

describe('la forme compacte', () => {
    it('revient a l identique, trois octets par creneau', () => {
        const creneaux = [{ jour: 0, debut: 480, fin: 600 }, { jour: 13, debut: 0, fin: 1440 }, { jour: 7, debut: 1435, fin: 1440 }];
        const octets = encoderCreneaux(creneaux);
        expect(octets?.length).toBe(9);
        expect(decoderCreneaux(octets as Uint8Array)).toEqual(creneaux);
    });

    it('refuse d ecrire un creneau hors bornes', () => {
        expect(encoderCreneaux([{ jour: 14, debut: 480, fin: 600 }])).toBeNull();
        expect(encoderCreneaux([{ jour: 0, debut: 482, fin: 600 }])).toBeNull();
        expect(encoderCreneaux([{ jour: 0, debut: 600, fin: 600 }])).toBeNull();
    });

    it('refuse de lire une forme abimee', () => {
        expect(decoderCreneaux(new Uint8Array([1, 2]))).toBeNull();
        // jour 15
        expect(decoderCreneaux(new Uint8Array([(15 << 2), 0, 1]))).toBeNull();
        // duree nulle
        expect(decoderCreneaux(new Uint8Array([0, 0, 0]))).toBeNull();
        // debut 287 pas, duree 2 : deborde minuit
        const valeur = (287 << 9) | 2;
        expect(decoderCreneaux(new Uint8Array([(valeur >> 16) & 0xff, (valeur >> 8) & 0xff, valeur & 0xff]))).toBeNull();
        expect(decoderCreneaux(new Uint8Array((CRENEAUX_MAXIMUM + 1) * 3).fill(1))).toBeNull();
    });
});

describe('l expiration', () => {
    it('couvre quatorze jours, le jour du partage compris, et expire le lendemain du dernier', () => {
        expect(dernierJour('2026-11-25')).toBe('2026-12-08');
        expect(estExpire('2026-11-25', '2026-12-08')).toBe(false);
        expect(estExpire('2026-11-25', '2026-12-09')).toBe(true);
    });

    it('dit inconnu un jour hors de la fenetre, et libre un jour couvert sans creneau', () => {
        const creneaux = [{ jour: 1, debut: 480, fin: 600 }];
        expect(occupeLe('2026-11-25', creneaux, '2026-11-24')).toBeNull();
        expect(occupeLe('2026-11-25', creneaux, '2026-12-09')).toBeNull();
        expect(occupeLe('2026-11-25', creneaux, '2026-11-25')).toEqual([]);
        expect(occupeLe('2026-11-25', creneaux, '2026-11-26')).toEqual([{ debut: 480, fin: 600 }]);
    });

    it('traverse le changement d heure sans perdre un jour', () => {
        expect(dernierJour('2026-10-20')).toBe('2026-11-02');
        expect(occupeLe('2026-10-20', [{ jour: 6, debut: 480, fin: 600 }], '2026-10-26')).toEqual([{ debut: 480, fin: 600 }]);
    });
});

describe('fondre', () => {
    it('fond dans l ordre, quel que soit l ordre d arrivee', () => {
        expect(fondre([{ debut: 600, fin: 700 }, { debut: 480, fin: 610 }, { debut: 800, fin: 900 }])).toEqual([{ debut: 480, fin: 700 }, { debut: 800, fin: 900 }]);
    });
});
