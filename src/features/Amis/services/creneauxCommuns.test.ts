/** Les creneaux communs, et comment ils prolongent les trous de la journee (docs/phase-8/8-amis.md). */

import { describe, expect, it } from 'vitest';

import { trousDuJour } from '../../Planning/services/carteDuJour';
import { formaterHeure, minutesDe } from '../../Planning/services/frise';
import { creneauxCommuns, partDeMidi, premierApres, resteDuCreneau, semaineCommune } from './creneauxCommuns';

const h = (heure: string) => minutesDe(heure) as number;
const p = (debut: string, fin: string) => ({ debut: h(debut), fin: h(fin) });

describe('creneauxCommuns', () => {
    it('trouve le moment ou les deux sont libres entre deux cours', () => {
        expect(creneauxCommuns([p('08:00', '10:00'), p('14:00', '16:00')], [p('08:00', '12:00'), p('13:30', '17:00')])).toEqual([p('12:00', '13:30')]);
    });

    it('propose le dejeuner apres le dernier cours du matin de l un, quand l autre attend celui de l apres-midi', () => {
        expect(creneauxCommuns([p('08:00', '10:00'), p('14:00', '16:00')], [p('10:00', '12:00')])).toEqual([p('12:00', '14:00')]);
    });

    it('ne propose rien avant le premier cours ni apres le dernier des deux', () => {
        expect(creneauxCommuns([p('10:00', '12:00')], [p('10:00', '12:00')])).toEqual([]);
        expect(creneauxCommuns([], [])).toEqual([]);
    });

    it('ecarte ce qui dure moins de 45 minutes', () => {
        expect(creneauxCommuns([p('08:00', '10:00'), p('10:44', '12:00')], [p('08:00', '12:00')])).toEqual([]);
        expect(creneauxCommuns([p('08:00', '10:00'), p('10:45', '12:00')], [p('08:00', '09:00')])).toEqual([p('10:00', '10:45')]);
    });

    it('fond les cours superposes de chacun', () => {
        expect(creneauxCommuns([p('08:00', '11:00'), p('09:00', '12:00'), p('15:00', '16:00')], [p('13:00', '14:00')])).toEqual([p('12:00', '13:00'), p('14:00', '15:00')]);
    });

    it('rend, sans ami, exactement les trous de la journee du lot 6', () => {
        const journees = [
            [p('08:00', '10:00'), p('10:30', '12:00'), p('13:30', '15:00'), p('17:00', '18:00')],
            [p('09:00', '12:00'), p('09:30', '10:00'), p('14:00', '16:00')],
            [p('08:00', '18:00')],
            [p('08:00', '09:00'), p('09:44', '11:00'), p('11:45', '12:00')],
        ];
        for (const journee of journees) {
            const elements = journee.map(({ debut, fin }) => ({ starttime: formaterHeure(debut), endtime: formaterHeure(fin) }));
            const trous = trousDuJour(elements).map(({ debut, fin }) => ({ debut, fin }));
            expect(creneauxCommuns(journee, [])).toEqual(trous);
            expect(creneauxCommuns([], journee)).toEqual(trous);
        }
    });
});

describe('partDeMidi', () => {
    it('borne a 11 h 30 et 14 h, et refuse moins de 45 minutes', () => {
        expect(partDeMidi(p('10:00', '16:00'))).toEqual(p('11:30', '14:00'));
        expect(partDeMidi(p('13:00', '15:00'))).toEqual(p('13:00', '14:00'));
        expect(partDeMidi(p('13:16', '15:00'))).toBeNull();
        expect(partDeMidi(p('08:00', '10:00'))).toBeNull();
    });
});

describe('resteDuCreneau', () => {
    it('rend le creneau entier avant qu il commence, ce qui en reste pendant, rien quand il ne reste pas 45 minutes', () => {
        const creneau = p('12:00', '14:00');
        expect(resteDuCreneau(creneau, null)).toEqual(creneau);
        expect(resteDuCreneau(creneau, h('11:00'))).toEqual(creneau);
        expect(resteDuCreneau(creneau, h('12:30'))).toEqual(p('12:30', '14:00'));
        expect(resteDuCreneau(creneau, h('13:20'))).toBeNull();
    });
});

describe('semaineCommune', () => {
    it('part d aujourd hui, garde ce qui reste du jour, tait un jour inconnu et un jour sans creneau', () => {
        const matin = [p('08:00', '10:00')];
        const apresMidi = [p('14:00', '16:00')];
        const jours = [
            { date: '2026-11-24', miens: matin, siens: apresMidi },
            { date: '2026-11-25', miens: [p('08:00', '10:00'), p('14:00', '16:00')], siens: [p('08:00', '12:00')] },
            { date: '2026-11-26', miens: matin, siens: null },
            { date: '2026-11-27', miens: matin, siens: matin },
            { date: '2026-11-28', miens: matin, siens: apresMidi },
        ];
        expect(semaineCommune(jours, '2026-11-25', h('12:30'))).toEqual([
            { date: '2026-11-25', creneaux: [p('12:30', '14:00')] },
            { date: '2026-11-28', creneaux: [p('10:00', '14:00')] },
        ]);
    });
});

describe('premierApres', () => {
    it('rend le premier cours qui commence a la fin du creneau ou apres, jamais un rendez-vous du telephone', () => {
        const a = { starttime: '15:00' };
        const b = { starttime: '14:00' };
        const tel = { starttime: '13:30', source: 'telephone' as const };
        expect(premierApres([a, tel, b, { starttime: '09:00' }], h('13:30'))).toBe(b);
        expect(premierApres([a], h('16:00'))).toBeNull();
    });
});
