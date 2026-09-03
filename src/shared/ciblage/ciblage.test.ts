/**
 * Le ciblage : la projection defensive des quatre colonnes, et la regle de presentation.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { CIBLAGE_TOUS, estCible, projeterCiblage, type ContexteDeCiblage } from './ciblage';

const BORDEAUX: ContexteDeCiblage = { testeur: false, etablissement: 'bordeaux', version: '6.1.0' };
const TESTEUR_INP: ContexteDeCiblage = { testeur: true, etablissement: 'bordeaux-inp', version: '6.1.0' };

test('une ligne sans colonnes de ciblage vise tout le monde', () => {
    expect(projeterCiblage({})).toEqual(CIBLAGE_TOUS);
    expect(estCible(projeterCiblage({}), BORDEAUX)).toBe(true);
});

test('la projection nettoie ce qui vient d un cache', () => {
    expect(projeterCiblage({
        audience: 'testeurs',
        etablissements: ['bordeaux', 42, '', null],
        version_min: '',
        version_max: '6.0.0',
    })).toEqual({ audience: 'testeurs', etablissements: ['bordeaux'], version_min: null, version_max: '6.0.0' });
});

test('un tableau d etablissements vide vaut tous, comme null', () => {
    expect(projeterCiblage({ etablissements: [] }).etablissements).toBeNull();
    expect(projeterCiblage({ etablissements: 'bordeaux' }).etablissements).toBeNull();
});

test('l audience testeurs ne se montre qu aux appareils enregistres', () => {
    const ciblage = projeterCiblage({ audience: 'testeurs' });
    expect(estCible(ciblage, BORDEAUX)).toBe(false);
    expect(estCible(ciblage, TESTEUR_INP)).toBe(true);
});

test('une audience inconnue cache : elle existe pour restreindre, pas pour montrer', () => {
    expect(estCible(projeterCiblage({ audience: 'internes' }), TESTEUR_INP)).toBe(false);
});

test('les etablissements filtrent sur le code actif', () => {
    const ciblage = projeterCiblage({ etablissements: ['bordeaux-inp'] });
    expect(estCible(ciblage, BORDEAUX)).toBe(false);
    expect(estCible(ciblage, TESTEUR_INP)).toBe(true);
});

test('la fenetre de versions est inclusive et un cas d usage est le message de mise a jour', () => {
    const misAJour = projeterCiblage({ version_max: '6.0.0' });
    expect(estCible(misAJour, { ...BORDEAUX, version: '6.0.0' })).toBe(true);
    expect(estCible(misAJour, { ...BORDEAUX, version: '6.1.0' })).toBe(false);

    const nouveaute = projeterCiblage({ version_min: '6.1.0' });
    expect(estCible(nouveaute, { ...BORDEAUX, version: '6.0.0' })).toBe(false);
    expect(estCible(nouveaute, { ...BORDEAUX, version: '6.1.0' })).toBe(true);
});

test('une version applicative inconnue ne cache rien', () => {
    expect(estCible(projeterCiblage({ version_min: '9.0.0' }), { ...BORDEAUX, version: null })).toBe(true);
});
