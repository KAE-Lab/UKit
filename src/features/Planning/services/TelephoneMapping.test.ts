/**
 * Ce que la projection des evenements du telephone doit tenir.
 *
 * Les formes recopiees sont celles que le type d'expo-calendar annonce et que ses sources natives
 * produisent : `startDate` en chaine ISO (Android) ou en `Date`, une journee entiere datee en UTC
 * a fin exclusive (Android) ou en local (iOS), un `location` nul, un evenement annule. Le fuseau
 * des tests est fige a Europe/Paris (vitest.config.ts) : la journee locale y differe de celle d'UTC.
 *
 *     npm test
 */

import { describe, expect, it } from 'vitest';

import {
    calendriersLisibles,
    joursCouverts,
    projeterEvenementsDuTelephone,
    type CalendrierDuTelephone,
    type EvenementDuTelephone,
} from './TelephoneMapping';

const IOS = { journeeEntiereEnUTC: false };
const ANDROID = { journeeEntiereEnUTC: true };

const PERSO: CalendrierDuTelephone = { id: 'cal-perso', title: 'Perso', color: '#FF2D55' };
const TRAVAIL: CalendrierDuTelephone = { id: 'cal-travail', title: 'Travail', color: null };
const CALENDRIERS = new Map([[PERSO.id, PERSO], [TRAVAIL.id, TRAVAIL]]);
const AUCUN = new Set<string>();

function evenement(patch: Partial<EvenementDuTelephone>): EvenementDuTelephone {
    return {
        id: 'ev-1',
        calendarId: PERSO.id,
        title: 'Dentiste',
        location: null,
        notes: '',
        startDate: '2026-09-08T14:00:00.000Z',
        endDate: '2026-09-08T15:00:00.000Z',
        allDay: false,
        status: 'confirmed',
        availability: 'busy',
        ...patch,
    };
}

describe('projeterEvenementsDuTelephone', () => {
    it('projette un rendez-vous a ses heures locales, dans la couleur de son calendrier', () => {
        const [projete] = projeterEvenementsDuTelephone([evenement({})], CALENDRIERS, AUCUN, '2026-09-08', IOS);
        expect(projete.starttime).toBe('16:00');
        expect(projete.endtime).toBe('17:00');
        expect(projete.schedule).toBe('16:00-17:00');
        expect(projete.subject).toBe('Dentiste');
        expect(projete.color).toBe('#ff2d55');
        expect(projete.source).toBe('telephone');
        expect(projete.idTelephone).toBe('ev-1');
        expect(projete.journeeEntiere).toBe(false);
        expect(projete.category).toBe('');
        expect(projete.date.start).toBe('2026-09-08T14:00:00.000Z');
    });

    it('lit un startDate en Date comme en chaine, et un calendrier sans couleur retombe sur default', () => {
        const [projete] = projeterEvenementsDuTelephone(
            [evenement({ calendarId: TRAVAIL.id, startDate: new Date('2026-09-08T07:30:00.000Z'), endDate: new Date('2026-09-08T08:00:00.000Z') })],
            CALENDRIERS, AUCUN, '2026-09-08', IOS,
        );
        expect(projete.starttime).toBe('09:30');
        expect(projete.color).toBe('default');
    });

    it('rattache un evenement a sa journee locale, pas a celle d UTC', () => {
        // 23:30 UTC le 7 = 01:30 a Paris le 8.
        const nuit = evenement({ startDate: '2026-09-07T23:30:00.000Z', endDate: '2026-09-08T00:30:00.000Z' });
        expect(projeterEvenementsDuTelephone([nuit], CALENDRIERS, AUCUN, '2026-09-07', IOS)).toHaveLength(0);
        expect(projeterEvenementsDuTelephone([nuit], CALENDRIERS, AUCUN, '2026-09-08', IOS)).toHaveLength(1);
    });

    it('un rendez-vous a cheval sur minuit apparait sur les deux jours, borne a chacun', () => {
        const soiree = evenement({ startDate: '2026-09-08T20:00:00.000Z', endDate: '2026-09-08T23:30:00.000Z' });
        const [jour1] = projeterEvenementsDuTelephone([soiree], CALENDRIERS, AUCUN, '2026-09-08', IOS);
        const [jour2] = projeterEvenementsDuTelephone([soiree], CALENDRIERS, AUCUN, '2026-09-09', IOS);
        expect([jour1.starttime, jour1.endtime]).toEqual(['22:00', '23:59']);
        expect([jour2.starttime, jour2.endtime]).toEqual(['00:00', '01:30']);
        expect(jour1.id).not.toBe(jour2.id);
        expect(projeterEvenementsDuTelephone([soiree], CALENDRIERS, AUCUN, '2026-09-10', IOS)).toHaveLength(0);
    });

    it('une fin posee exactement a minuit ne mord pas sur le lendemain', () => {
        const jusquaMinuit = evenement({ startDate: '2026-09-08T20:00:00.000Z', endDate: '2026-09-08T22:00:00.000Z' });
        expect(joursCouverts(jusquaMinuit, IOS)).toEqual({ premier: '2026-09-08', dernier: '2026-09-08' });
        expect(projeterEvenementsDuTelephone([jusquaMinuit], CALENDRIERS, AUCUN, '2026-09-09', IOS)).toHaveLength(0);
    });

    it('une journee entiere iOS, datee en local, tient sur son jour et n a pas d heures', () => {
        const ferie = evenement({ allDay: true, availability: 'free', startDate: '2026-09-07T22:00:00.000Z', endDate: '2026-09-08T21:59:59.000Z' });
        expect(joursCouverts(ferie, IOS)).toEqual({ premier: '2026-09-08', dernier: '2026-09-08' });
        const [projete] = projeterEvenementsDuTelephone([ferie], CALENDRIERS, AUCUN, '2026-09-08', IOS);
        expect(projete.journeeEntiere).toBe(true);
        expect([projete.starttime, projete.endtime, projete.schedule]).toEqual(['', '', '']);
    });

    it('une journee entiere Android, datee en UTC a fin exclusive, ne deborde pas sur deux jours', () => {
        const ferie = evenement({ allDay: true, startDate: '2026-09-08T00:00:00.000Z', endDate: '2026-09-09T00:00:00.000Z' });
        expect(joursCouverts(ferie, ANDROID)).toEqual({ premier: '2026-09-08', dernier: '2026-09-08' });
        // Lue comme un instant local, la meme forme couvrirait le 8 (02:00) et le 9 (02:00).
        expect(joursCouverts(ferie, IOS)).toEqual({ premier: '2026-09-08', dernier: '2026-09-09' });
        const vacances = evenement({ allDay: true, startDate: '2026-09-08T00:00:00.000Z', endDate: '2026-09-11T00:00:00.000Z' });
        expect(joursCouverts(vacances, ANDROID)).toEqual({ premier: '2026-09-08', dernier: '2026-09-10' });
    });

    it('un jour entierement couvert est un bandeau, meme sans allDay', () => {
        // Trois jours avec des heures : parti vendredi 18h, rentre dimanche 10h. Le samedi est plein.
        const vacances = evenement({ startDate: '2026-09-08T16:00:00.000Z', endDate: '2026-09-10T08:00:00.000Z' });
        const [depart] = projeterEvenementsDuTelephone([vacances], CALENDRIERS, AUCUN, '2026-09-08', IOS);
        const [plein] = projeterEvenementsDuTelephone([vacances], CALENDRIERS, AUCUN, '2026-09-09', IOS);
        const [retour] = projeterEvenementsDuTelephone([vacances], CALENDRIERS, AUCUN, '2026-09-10', IOS);
        expect([depart.journeeEntiere, depart.starttime, depart.endtime]).toEqual([false, '18:00', '23:59']);
        expect(plein.journeeEntiere).toBe(true);
        expect([plein.starttime, plein.endtime, plein.schedule]).toEqual(['', '', '']);
        expect([retour.journeeEntiere, retour.starttime, retour.endtime]).toEqual([false, '00:00', '10:00']);
    });

    it('de minuit a 23:59 le meme jour est un bandeau, c est ce qu on ecrit pour dire toute la journee', () => {
        const journee = evenement({ startDate: '2026-09-07T22:00:00.000Z', endDate: '2026-09-08T21:59:00.000Z' });
        const [projete] = projeterEvenementsDuTelephone([journee], CALENDRIERS, AUCUN, '2026-09-08', IOS);
        expect(projete.journeeEntiere).toBe(true);
    });

    it('exclut un evenement annule, garde un evenement disponible', () => {
        const annule = evenement({ status: 'canceled' });
        const anniversaire = evenement({ id: 'ev-2', availability: 'free' });
        const projetes = projeterEvenementsDuTelephone([annule, anniversaire], CALENDRIERS, AUCUN, '2026-09-08', IOS);
        expect(projetes.map((p) => p.idTelephone)).toEqual(['ev-2']);
    });

    it('exclut ce qu UKit a ecrit lui-meme, et ce qui vient d un calendrier inconnu', () => {
        const ecritParUkit = evenement({ id: 'sys-42' });
        const orphelin = evenement({ id: 'ev-3', calendarId: 'cal-disparu' });
        const projetes = projeterEvenementsDuTelephone([ecritParUkit, orphelin, evenement({})], CALENDRIERS, new Set(['sys-42']), '2026-09-08', IOS);
        expect(projetes.map((p) => p.idTelephone)).toEqual(['ev-1']);
    });

    it('compose la description du lieu et des notes, et prend le titre du calendrier pour un titre vide', () => {
        const [projete] = projeterEvenementsDuTelephone(
            [evenement({ title: '  ', location: 'Chez Marie', notes: 'Apporter le dossier\n\n  et le cheque ' })],
            CALENDRIERS, AUCUN, '2026-09-08', IOS,
        );
        expect(projete.subject).toBe('Perso');
        expect(projete.description).toBe('Chez Marie\nApporter le dossier\net le cheque');
    });
});

describe('calendriersLisibles', () => {
    const LISTE = [{ id: '1', title: 'Perso' }, { id: '2', title: 'UKit' }, { id: '3', title: 'Travail' }];

    it('ecarte le calendrier dedie par son titre, et la cible par son identifiant', () => {
        expect(calendriersLisibles(LISTE, 'UKit').map((c) => c.id)).toEqual(['1', '3']);
        expect(calendriersLisibles(LISTE, '3').map((c) => c.id)).toEqual(['1']);
        expect(calendriersLisibles(LISTE, -1).map((c) => c.id)).toEqual(['1', '3']);
    });
});
