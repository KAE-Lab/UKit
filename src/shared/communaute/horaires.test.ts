/**
 * Les horaires corriges : l'empreinte d'une source, l'ecriture et la relecture d'une correction, et ce
 * qui se refuse — un creneau a l'envers, un service en double, une forme fausse.
 */

import { describe, expect, test } from 'vitest';

import { ecrireCorrection, empreinteDesHoraires, formaterMinutes, lireCorrection, servicesDe } from './horaires';
import { sujetDeLieu, valeurPermise } from './vocabulaire';

describe('l empreinte des horaires', () => {
    test('stable, et insensible a la casse et aux espaces', () => {
        const a = empreinteDesHoraires(['du lundi au vendredi', 'SELF : 11h30 - 13h45']);
        expect(a).toMatch(/^[0-9a-f]{8}$/);
        expect(empreinteDesHoraires(['Du lundi  au vendredi ', 'self : 11h30 - 13h45'])).toBe(a);
    });

    test('change avec la source', () => {
        expect(empreinteDesHoraires(['self : 11h30 - 14h00'])).not.toBe(empreinteDesHoraires(['self : 11h30 - 13h45']));
        expect(empreinteDesHoraires([])).toBe(empreinteDesHoraires(['', '  ']));
    });
});

describe('une correction', () => {
    const empreinte = 'a41f09c2';

    test('s ecrit service par service, dans l ordre de la journee, et se relit', () => {
        const valeur = ecrireCorrection({ empreinte, source: false, services: { soir: 'ferme', midi: { debut: 690, fin: 825 } } });
        expect(valeur).toBe('a41f09c2|midi=1130-1345,soir=ferme');
        expect(valeurPermise(sujetDeLieu('restaurant.horaires')!, valeur!)).toBe(true);
        const relue = lireCorrection(valeur!);
        expect(relue).toEqual({ empreinte, source: false, services: { midi: { debut: 690, fin: 825 }, soir: 'ferme' } });
        expect(servicesDe(relue!).map(([s]) => s)).toEqual(['midi', 'soir']);
    });

    test('la source juste', () => {
        expect(ecrireCorrection({ empreinte, source: true })).toBe('a41f09c2|source');
        expect(lireCorrection('a41f09c2|source')).toEqual({ empreinte, source: true });
        expect(servicesDe({ empreinte, source: true })).toEqual([]);
    });

    test('ce qui ne s ecrit pas', () => {
        expect(ecrireCorrection({ empreinte, source: false, services: {} })).toBeNull();
        expect(ecrireCorrection({ empreinte, source: false, services: { midi: { debut: 900, fin: 800 } } })).toBeNull();
        expect(ecrireCorrection({ empreinte, source: false, services: { jour: { debut: 0, fin: 24 * 60 } } })).toBeNull();
        expect(ecrireCorrection({ empreinte: 'zz', source: true })).toBeNull();
    });

    test('ce qui ne se relit pas', () => {
        expect(lireCorrection('a41f09c2|midi=1130-1345,midi=ferme')).toBeNull();
        expect(lireCorrection('a41f09c2|midi=1400-1300')).toBeNull();
        expect(lireCorrection('a41f09c2|brunch=ferme')).toBeNull();
        expect(lireCorrection('oui')).toBeNull();
    });

    test('une heure a l ecran', () => {
        expect(formaterMinutes(690)).toBe('11:30');
        expect(formaterMinutes(485, 'h')).toBe('08h05');
    });
});
