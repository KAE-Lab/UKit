/**
 * Les echecs de source : la cle `<hote>:<famille>`, port compris, et les sommes par hote et famille.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import type { Mesure } from './mesures';
import { decouperCle, echecsPar } from './sources';

const m = (cle: string, n: number, evenement = 'source.echec'): Mesure => ({
    jour: '2026-11-20', heure: 10, evenement, cle, campus: 'bordeaux', version: '6.3.1', plateforme: 'ios', testeur: false, n,
});

test('la famille est apres le dernier deux-points, l hote garde son port', () => {
    expect(decouperCle('celcat.u-bordeaux.fr:unavailable')).toEqual({ hote: 'celcat.u-bordeaux.fr', famille: 'unavailable' });
    expect(decouperCle('localhost:8080:rejected')).toEqual({ hote: 'localhost:8080', famille: 'rejected' });
    expect(decouperCle('sans-famille')).toEqual({ hote: 'sans-famille', famille: '?' });
});

const LIGNES = [
    m('ukit.portail.bordeaux.moodle:blocked', 30),
    m('ukit.portail.bordeaux.moodle:unavailable', 10),
    m('celcat.u-bordeaux.fr:unavailable', 25),
    m('ok', 99, 'scolarite.connexion'),
];

test('par hote et par famille', () => {
    expect([...echecsPar(LIGNES, 'hote')]).toEqual([['ukit.portail.bordeaux.moodle', 40], ['celcat.u-bordeaux.fr', 25]]);
    expect([...echecsPar(LIGNES, 'famille')]).toEqual([['blocked', 30], ['unavailable', 35]]);
});

test('les familles d un seul hote', () => {
    expect([...echecsPar(LIGNES, 'famille', 'celcat.u-bordeaux.fr')]).toEqual([['unavailable', 25]]);
});
