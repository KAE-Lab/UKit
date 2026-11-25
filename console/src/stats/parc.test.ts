/**
 * Le parc actif : la fenetre de quatorze jours, les testeurs exclus, les petites cases masquees, la
 * part de la 6.3.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { libelleDeCase, SECRET } from './cases';
import { parcActif } from './parc';

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
    // A sept appareils, la case de six redonnerait celle d'un : elle se cache aussi.
    expect(parc.parCampus).toEqual([{ cle: 'bordeaux', n: SECRET, part: null }, { cle: 'bordeaux-inp', n: null, part: null }]);
    expect(parc.parPlateforme).toEqual([{ cle: 'android', n: null, part: null }, { cle: 'ios', n: SECRET, part: null }]);
    expect(parc.parVersion).toEqual([{ cle: '6.2.2', n: 7, part: 1 }]);
    expect(parc.partMesuree).toBe(0);
});

test('la bascule des statistiques reintegre les testeurs', () => {
    const jetons = [...Array.from({ length: 5 }, () => jeton('bordeaux', '6.3.1', 'ios', 1)), jeton('bordeaux', '6.3.1', 'ios', 1, true)];
    expect(parcActif(jetons, MAINTENANT).total).toBe(5);
    expect(parcActif(jetons, MAINTENANT, true).total).toBe(6);
});

test('les versions se trient de la plus recente a la plus ancienne, et une petite case se lit moins de 5', () => {
    const parc = parcActif([
        ...Array.from({ length: 5 }, () => jeton('b', '6.2.1', 'ios', 1)),
        ...Array.from({ length: 5 }, () => jeton('b', '6.10.0', 'ios', 1)),
        ...Array.from({ length: 5 }, () => jeton('b', '6.3.0', 'ios', 1)),
    ], MAINTENANT);
    expect(parc.parVersion.map((c) => c.cle)).toEqual(['6.10.0', '6.3.0', '6.2.1']);
    expect(parc.partMesuree).toBeCloseTo(10 / 15);
    expect(libelleDeCase(null)).toBe('moins de 5');
    expect(libelleDeCase(12)).toBe('12');
});

test('un parc vide n a pas de part de la 6.3', () => {
    expect(parcActif([], MAINTENANT).partMesuree).toBeNull();
});

test('la part de la 6.3 ne se dit pas quand elle redonnerait une petite case', () => {
    const jetons = [...Array.from({ length: 2 }, () => jeton('iut', '6.3.1', 'ios', 1)), jeton('iut', '6.2.2', 'ios', 1)];
    expect(parcActif(jetons, MAINTENANT).partMesuree).toBeNull();
    const grand = [...Array.from({ length: 30 }, () => jeton('b', '6.3.1', 'ios', 1)), ...Array.from({ length: 10 }, () => jeton('b', '6.2.2', 'ios', 1))];
    expect(parcActif(grand, MAINTENANT).partMesuree).toBe(0.75);
});
