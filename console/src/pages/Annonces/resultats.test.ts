/**
 * Les resultats d'un sondage dans la console : les voix attestees par choix, protegees, les non
 * attestees a part, les choix retires ignores.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { SECRET } from '../../stats/cases';
import { compterLeSondage } from './resultats';

const CHOIX = [{ id: 'a', libelle: 'Jeudi' }, { id: 'b', libelle: 'Vendredi' }, { id: 'c', libelle: 'Samedi' }];
const votes = (valeur: string, n: number, poids = 1) => Array.from({ length: n }, () => ({ valeur, poids }));

test('les voix attestees par choix, les non attestees a part, un choix retire ignore', () => {
    const r = compterLeSondage([...votes('a', 12), ...votes('b', 8), ...votes('c', 6), ...votes('a', 3, 0), ...votes('z', 4)], CHOIX);
    expect(r.choix.map((c) => c.voix)).toEqual([12, 8, 6]);
    expect(r.attestees).toBe(26);
    expect(r.nonAttestees).toBeNull();
});

test('une petite case se cache, et la plus petite visible avec elle quand le total se lit', () => {
    const r = compterLeSondage([...votes('a', 12), ...votes('b', 8), ...votes('c', 2)], CHOIX);
    expect(r.choix.map((c) => c.voix)).toEqual([12, SECRET, null]);
    expect(r.attestees).toBe(22);
});
