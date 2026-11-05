import { describe, expect, it } from 'vitest';
import moment from 'moment';

import { heureDuCreneau, jourDuFournisseur } from './bandeauDeCases';

describe('jourDuFournisseur', () => {
    it('lit la date en heure locale, sans glisser au jour precedent', () => {
        const jour = jourDuFournisseur('2026-11-05');
        expect(jour?.date()).toBe(5);
        expect(jour?.day()).toBe(4);
        expect(jour?.isSame(moment(new Date(2026, 10, 5, 0, 30)), 'day')).toBe(true);
    });

    it('rend null pour une date absente ou illisible', () => {
        expect(jourDuFournisseur(null)).toBeNull();
        expect(jourDuFournisseur('bientot')).toBeNull();
        expect(jourDuFournisseur('05-11-2026')).toBeNull();
    });
});

describe('heureDuCreneau', () => {
    it('lit l heure d un creneau rond', () => {
        expect(heureDuCreneau('08:00')).toBe(8);
        expect(heureDuCreneau('19:00')).toBe(19);
    });

    it('rend null pour un creneau illisible', () => {
        expect(heureDuCreneau('midi')).toBeNull();
    });
});
