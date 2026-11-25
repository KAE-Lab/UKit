/** La journee en une carte : ce qu'elle montre, et quand elle se tait (lot 6). */

import { describe, expect, it } from 'vitest';

import { composerLaCarte, trousDuJour } from './carteDuJour';
import type { Changement } from './changements';
import { minutesDe } from './frise';

const h = (heure: string) => minutesDe(heure) as number;
const el = (starttime: string, endtime: string, morceaux: { source?: 'telephone'; journeeEntiere?: boolean } = {}) => ({ starttime, endtime, ...morceaux });
const journee = [el('08:00', '10:00'), el('10:15', '12:00'), el('13:30', '15:30'), el('16:30', '17:30')];
const retire: Changement = { genre: 'retire', cours: { id: 'x', sujet: 'Anglais', type: 'TD', debut: '10:15', fin: '12:00', salle: '' } };

describe('trousDuJour', () => {
    it('ne compte que les ecarts de 45 minutes ou plus', () => {
        expect(trousDuJour(journee).map((t) => [t.debut, t.fin])).toEqual([[h('12:00'), h('13:30')], [h('15:30'), h('16:30')]]);
    });

    it('ignore une journee entiere et une heure illisible', () => {
        expect(trousDuJour([el('08:00', '09:00'), el('', '', { journeeEntiere: true }), el('Invalid date', '11:00'), el('11:00', '12:00')])).toHaveLength(1);
    });
});

describe('composerLaCarte', () => {
    it('dit la journee : ses bornes, ses segments, ses cours et ses trous', () => {
        const carte = composerLaCarte(journee, h('07:00'), []);
        expect(carte?.jauge).toMatchObject({ debut: h('08:00'), fin: h('17:30'), maintenant: null });
        expect(carte?.jauge?.segments[0]).toEqual({ debut: h('08:00'), fin: h('10:00') });
        expect(carte?.nombreDeCours).toBe(4);
        expect(carte?.trous).toHaveLength(2);
        expect(carte?.dureeDesTrous).toBe(150);
    });

    it('fond les cours superposes en une plage, et garde distincts ceux qui se touchent', () => {
        const carte = composerLaCarte([el('09:30', '12:20'), el('09:30', '12:20'), el('12:20', '13:00'), el('14:00', '16:50'), el('15:30', '17:30')], h('07:00'), []);
        expect(carte?.jauge?.segments).toEqual([
            { debut: h('09:30'), fin: h('12:20') }, { debut: h('12:20'), fin: h('13:00') }, { debut: h('14:00'), fin: h('17:30') },
        ]);
    });

    it('pose l heure dans la journee', () => {
        expect(composerLaCarte(journee, h('12:40'), [])?.jauge?.maintenant).toBe(h('12:40'));
    });

    it('ne compte pas les evenements du telephone parmi les cours', () => {
        expect(composerLaCarte([el('08:00', '10:00'), el('12:00', '13:00', { source: 'telephone' })], h('07:00'), [])?.nombreDeCours).toBe(1);
    });

    it('se tait un jour sans element, une journee finie, un cours seul, une journee sans trou', () => {
        expect(composerLaCarte([], h('07:00'), [])).toBeNull();
        expect(composerLaCarte(journee, h('17:30'), [])).toBeNull();
        expect(composerLaCarte([el('08:00', '10:00')], h('07:00'), [])).toBeNull();
        expect(composerLaCarte([el('08:00', '10:00'), el('10:15', '12:00')], h('07:00'), [])).toBeNull();
    });

    it('dit un cours retire meme la journee finie, ou sans plage horaire', () => {
        expect(composerLaCarte(journee, h('18:00'), [retire])).toMatchObject({ jauge: null, trous: [], changements: [retire] });
        expect(composerLaCarte([el('', '', { journeeEntiere: true })], h('09:00'), [retire])?.changements).toEqual([retire]);
    });

    it('parle pour une journee sans trou quand quelque chose a change', () => {
        expect(composerLaCarte([el('08:00', '10:00'), el('10:15', '12:00')], h('07:00'), [retire])?.jauge?.segments).toHaveLength(2);
    });

    it('parle pour un cours seul quand quelque chose a change', () => {
        const carte = composerLaCarte([el('08:00', '10:00')], h('07:00'), [retire]);
        expect(carte?.jauge).toBeNull();
        expect(carte?.changements).toEqual([retire]);
    });
});
