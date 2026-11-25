/**
 * La lecture d'une ligne de `mesures` a la frontiere : la forme du schema, ou une erreur qui dit
 * laquelle des colonnes est fausse.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { dedoublonner, lireMesure, MesureIllisible } from './mesures';

const LIGNE = { jour: '2026-11-17', heure: 9, evenement: 'session', cle: '', campus: 'bordeaux', version: '6.3.1', plateforme: 'ios', testeur: false, n: 12 };

test('une ligne du schema se lit telle quelle', () => {
    expect(lireMesure(LIGNE)).toEqual(LIGNE);
});

test.each([
    ['un jour qui n existe pas', { ...LIGNE, jour: '2026-11-31' }],
    ['une heure hors bornes', { ...LIGNE, heure: 24 }],
    ['un compte negatif', { ...LIGNE, n: -1 }],
    ['un compte en texte', { ...LIGNE, n: '12' }],
    ['une plateforme inconnue', { ...LIGNE, plateforme: 'web' }],
    ['une version hors forme', { ...LIGNE, version: '6.3' }],
    ['un testeur absent', { ...LIGNE, testeur: null }],
    ['une cle absente', { ...LIGNE, cle: undefined }],
    ['autre chose qu un objet', null],
])('%s fait echouer la lecture', (_, ligne) => {
    expect(() => lireMesure(ligne)).toThrow(MesureIllisible);
});

test('une ligne lue deux fois, quand une insertion decale les lots, ne compte qu une fois', () => {
    const avant = lireMesure(LIGNE);
    const apres = { ...avant, n: 14 };
    const autre = { ...avant, heure: 10, n: 3 };
    expect(dedoublonner([avant, autre, apres])).toEqual([apres, autre]);
});
