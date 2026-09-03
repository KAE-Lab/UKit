/**
 * Le comparateur de versions : la forme stricte, l'ordre numerique, et le sens de l'erreur.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { comparerVersions, lireVersion, versionDansFenetre } from './versions';

test('lit la forme X.Y.Z et rien d autre', () => {
    expect(lireVersion('6.1.0')).toEqual([6, 1, 0]);
    expect(lireVersion(' 10.0.12 ')).toEqual([10, 0, 12]);
    expect(lireVersion('6.1')).toBeNull();
    expect(lireVersion('v6.1.0')).toBeNull();
    expect(lireVersion('6.1.0-beta')).toBeNull();
    expect(lireVersion('')).toBeNull();
    expect(lireVersion(null)).toBeNull();
    expect(lireVersion(undefined)).toBeNull();
});

test('compare numeriquement, pas lexicalement', () => {
    expect(comparerVersions('6.10.0', '6.9.0')).toBe(1);
    expect(comparerVersions('6.1.0', '6.1.0')).toBe(0);
    expect(comparerVersions('5.6.1', '6.0.0')).toBe(-1);
    expect(comparerVersions('6.0.0', '6.0.1')).toBe(-1);
    expect(comparerVersions('6.1', '6.1.0')).toBeNull();
});

test('la fenetre est inclusive et null vaut pas de borne', () => {
    expect(versionDansFenetre('6.1.0', '6.1.0', '6.1.0')).toBe(true);
    expect(versionDansFenetre('6.1.0', null, null)).toBe(true);
    expect(versionDansFenetre('6.1.0', '6.0.0', null)).toBe(true);
    expect(versionDansFenetre('6.1.0', null, '6.0.0')).toBe(false);
    expect(versionDansFenetre('5.9.9', '6.0.0', null)).toBe(false);
    expect(versionDansFenetre('6.0.0', '', '')).toBe(true);
});

test('une version applicative illisible ignore les bornes : mieux un message de trop qu un incident cache', () => {
    expect(versionDansFenetre(null, '6.0.0', '6.0.0')).toBe(true);
    expect(versionDansFenetre('?', '6.0.0', '6.0.0')).toBe(true);
});

test('une borne illisible ne s applique pas', () => {
    expect(versionDansFenetre('6.1.0', 'bientot', null)).toBe(true);
    expect(versionDansFenetre('6.1.0', null, 'v7')).toBe(true);
});
