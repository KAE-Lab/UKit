/**
 * Les petites cases : rien sous cinq, sauf zero ; le secret secondaire, pour qu'une petite case ne se
 * retrouve pas par difference avec le total ; les parts ; le regroupement du rapport.
 *
 *     npm test   (a la racine du depot)
 */

import { describe, expect, test } from 'vitest';

import { casesDe, libelleDeCase, masquer, proteger, regrouper, SECRET } from './cases';

test('un compte de un a quatre se masque, zero et cinq se lisent', () => {
    expect([0, 1, 4, 5, 12].map(masquer)).toEqual([0, null, null, 5, 12]);
    expect(libelleDeCase(null)).toBe('moins de 5');
    expect(libelleDeCase(SECRET)).toBe('masqué');
    expect(libelleDeCase(1234)).toBe('1 234');
});

describe('le secret secondaire', () => {
    test('une petite case seule a cote du total : la plus petite visible se cache avec elle', () => {
        // Sans cela, 443 − 400 − 40 redonnerait 3.
        expect(proteger([400, 3, 40])).toEqual([400, null, SECRET]);
    });

    test('une case cachee a cinq tout juste ne suffit pas : 6 − 5 redonnerait 1', () => {
        expect(proteger([1, 5, 9, 200])).toEqual([null, SECRET, SECRET, 200]);
        // 1, 5 et 6 caches laisseraient 12 − 10 : la petite case vaudrait 1 ou 2. Tout se cache.
        expect(proteger([1, 5, 6, 200])).toEqual([null, SECRET, SECRET, SECRET]);
    });

    test('plusieurs petites cases qui laissent assez d incertitude se protegent entre elles', () => {
        expect(proteger([2090, 53, 2, 3, 1])).toEqual([2090, 53, null, null, null]);
    });

    test('deux cases a un se devineraient : leur somme vaut leur nombre', () => {
        expect(proteger([1, 1, 300, 40])).toEqual([null, null, 300, SECRET]);
    });

    test('rien a proteger sans petite case, ni quand le total est lui-meme cache', () => {
        expect(proteger([0, 12, 30])).toEqual([0, 12, 30]);
        expect(proteger([1, 2, 0])).toEqual([null, null, 0]);
    });
});

describe('les cases d une repartition', () => {
    test('les visibles par compte, puis les cachees par ordre alphabetique, sans part', () => {
        const cases = casesDe(new Map([['iut', 3], ['bordeaux', 90], ['inp', 2], ['autre', 5], ['montaigne', 4]]));
        expect(cases).toEqual([
            { cle: 'bordeaux', n: 90, part: 90 / 104 },
            { cle: 'autre', n: 5, part: 5 / 104 },
            { cle: 'inp', n: null, part: null },
            { cle: 'iut', n: null, part: null },
            { cle: 'montaigne', n: null, part: null },
        ]);
    });

    test('a deux valeurs, la part de l une redonnerait l autre : les deux se cachent', () => {
        expect(casesDe(new Map([['dark', 200], ['light', 3]]))).toEqual([
            { cle: 'dark', n: SECRET, part: null },
            { cle: 'light', n: null, part: null },
        ]);
    });

    test('une cle sans compte n est pas une case', () => {
        expect(casesDe(new Map([['a', 0], ['b', 8]]))).toEqual([{ cle: 'b', n: 8, part: 1 }]);
    });
});

test('le regroupement additionne les petites cles sous une seule', () => {
    const groupe = regrouper(new Map([['bordeaux', 400], ['iut', 3], ['inp', 2]]), (c) => c !== 'bordeaux', 'autres');
    expect([...groupe]).toEqual([['bordeaux', 400], ['autres', 5]]);
});
