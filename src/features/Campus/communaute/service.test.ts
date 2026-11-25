/**
 * « Ça attend ? » aux heures du service lues dans la source, et a proximite quand la position est connue.
 * Les lignes sont celles que Croustillant sert, relevees sur les restaurants de la region.
 */

import { describe, expect, test } from 'vitest';

import { creneauxDeService, enService, poserLaQuestionDeLAttente } from './service';

const LIGNES = ['du lundi au vendredi', 'SELF : 11h30 - 13h45', "CAFET' : 8h-16h"];
// Un mardi, l'heure locale de l'appareil.
const le = (h: number, m = 0, jour = 25) => new Date(2026, 10, jour, h, m);

describe('les creneaux', () => {
    test('lus dans les formes de la source', () => {
        expect(creneauxDeService(LIGNES)).toEqual([{ debut: 690, fin: 825 }, { debut: 480, fin: 960 }]);
        expect(creneauxDeService(['11:30 à 14:00', 'de 18h30 a 20h'])).toEqual([{ debut: 690, fin: 840 }, { debut: 1110, fin: 1200 }]);
        expect(creneauxDeService(['Fermé le samedi', ''])).toEqual([]);
    });
});

describe('en service', () => {
    test('dans un creneau, et un quart d heure autour', () => {
        expect(enService(['11h30-13h45'], le(12))).toBe(true);
        expect(enService(['11h30-13h45'], le(11, 15))).toBe(true);
        expect(enService(['11h30-13h45'], le(14, 1))).toBe(false);
        expect(enService(['11h30-13h45'], le(10))).toBe(false);
    });

    test('hors de la portee de jours', () => {
        expect(enService(['du lundi au vendredi', '11h30-13h45'], le(12, 0, 29))).toBe(false);
        expect(enService(['du lundi au vendredi', '11h30-13h45'], le(12, 0, 27))).toBe(true);
    });

    test('le self quand la source le nomme, pas la cafeteria ouverte tout le jour', () => {
        expect(enService(LIGNES, le(15))).toBe(false);
        expect(enService(LIGNES, le(12))).toBe(true);
        expect(enService(["CAFET' : 8h-16h"], le(15))).toBe(true);
    });

    test('sans horaires lisibles, jamais', () => {
        expect(enService([], le(12))).toBe(false);
    });
});

describe('la question de l attente', () => {
    const ru = { lat: 44.8065, lon: -0.6044 };

    test('a proximite, ou sans position', () => {
        expect(poserLaQuestionDeLAttente(['11h30-13h45'], le(12), { lat: 44.8067, lon: -0.6040 }, ru)).toBe(true);
        expect(poserLaQuestionDeLAttente(['11h30-13h45'], le(12), null, ru)).toBe(true);
    });

    test('loin, non ; hors service, non', () => {
        expect(poserLaQuestionDeLAttente(['11h30-13h45'], le(12), { lat: 44.84, lon: -0.57 }, ru)).toBe(false);
        expect(poserLaQuestionDeLAttente(['11h30-13h45'], le(16), null, ru)).toBe(false);
    });
});
