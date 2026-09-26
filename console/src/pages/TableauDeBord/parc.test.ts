/**
 * Le parc actif : la fenetre de quatorze jours, les testeurs exclus, les petites cases masquees.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { libelleDeCase, parcActif } from './parc';

const MAINTENANT = new Date('2026-09-22T12:00:00Z');
const jeton = (etablissement: string, version: string, plateforme: string, jours: number, testeur = false) => ({
    etablissement, version, plateforme, testeur, maj_le: new Date(MAINTENANT.getTime() - jours * 86_400_000).toISOString(),
});

test('seuls les jetons recents et non testeurs comptent', () => {
    const parc = parcActif([
        ...Array.from({ length: 6 }, () => jeton('bordeaux', '6.2.2', 'ios', 1)),
        jeton('bordeaux', '6.2.1', 'android', 20),
        jeton('bordeaux', '6.2.2', 'android', 2, true),
        jeton('bordeaux-inp', '6.2.2', 'android', 3),
    ], MAINTENANT);
    expect(parc.total).toBe(7);
    expect(parc.parCampus).toEqual([{ cle: 'bordeaux', n: 6 }, { cle: 'bordeaux-inp', n: null }]);
    expect(parc.parPlateforme).toEqual([{ cle: 'ios', n: 6 }, { cle: 'android', n: null }]);
    expect(parc.parVersion).toEqual([{ cle: '6.2.2', n: 7 }]);
});

test('les versions se trient de la plus recente a la plus ancienne, et une petite case se lit moins de 5', () => {
    const parc = parcActif([
        ...Array.from({ length: 5 }, () => jeton('b', '6.2.1', 'ios', 1)),
        ...Array.from({ length: 5 }, () => jeton('b', '6.10.0', 'ios', 1)),
        ...Array.from({ length: 5 }, () => jeton('b', '6.3.0', 'ios', 1)),
    ], MAINTENANT);
    expect(parc.parVersion.map((c) => c.cle)).toEqual(['6.10.0', '6.3.0', '6.2.1']);
    expect(libelleDeCase(null)).toBe('moins de 5');
    expect(libelleDeCase(12)).toBe('12');
});
