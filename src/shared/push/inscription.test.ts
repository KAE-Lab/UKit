/**
 * Le depot du jeton : sa forme, son egalite, son echeance, sa memoire.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { doitDeposer, estUnJeton, INTERVALLE_REDEPOT_MS, lireMemoire, type Inscription } from './inscription';

const INSCRIPTION: Inscription = { jeton: 'ExponentPushToken[abc-DEF_123]', plateforme: 'ios', etablissement: 'bordeaux', version: '6.1.0', testeur: false };

test('seul un jeton Expo a la bonne forme passe', () => {
    expect(estUnJeton('ExponentPushToken[abc-DEF_123]')).toBe(true);
    expect(estUnJeton('ExpoPushToken[abc]')).toBe(false);
    expect(estUnJeton('ExponentPushToken[]')).toBe(false);
    expect(estUnJeton(42)).toBe(false);
});

test('on depose quand rien n a ete depose, quand quelque chose a change, ou apres sept jours', () => {
    const at = 1_000_000;
    expect(doitDeposer(null, INSCRIPTION, at)).toBe(true);
    expect(doitDeposer({ inscription: INSCRIPTION, at }, INSCRIPTION, at + 1000)).toBe(false);
    expect(doitDeposer({ inscription: INSCRIPTION, at }, { ...INSCRIPTION, etablissement: 'bordeaux-inp' }, at + 1000)).toBe(true);
    expect(doitDeposer({ inscription: INSCRIPTION, at }, { ...INSCRIPTION, testeur: true }, at + 1000)).toBe(true);
    expect(doitDeposer({ inscription: INSCRIPTION, at }, INSCRIPTION, at + INTERVALLE_REDEPOT_MS)).toBe(true);
});

test('la memoire se relit defensivement', () => {
    const brut = JSON.stringify({ inscription: INSCRIPTION, at: 5 });
    expect(lireMemoire(brut)).toEqual({ inscription: INSCRIPTION, at: 5 });
    expect(lireMemoire(null)).toBeNull();
    expect(lireMemoire('{')).toBeNull();
    expect(lireMemoire(JSON.stringify({ inscription: { ...INSCRIPTION, jeton: 'x' }, at: 5 }))).toBeNull();
    expect(lireMemoire(JSON.stringify({ inscription: INSCRIPTION }))).toBeNull();
});
