/**
 * Les conversions saisie <-> ligne : le vide qui devient nul, sauf la ou il est une valeur ; les
 * formes refusees ; les dates qui font l'aller-retour.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import type { Champ } from './descripteurs';
import { versLigneDuChamp, versSaisieDuChamp } from './conversion';

const TEXTE: Champ = { nom: 't', libelle: 't', type: { type: 'texte' } };
const IMAGE: Champ = { nom: 'i', libelle: 'i', type: { type: 'image', dossier: 'x' }, videEstValeur: true };
const VERSION: Champ = { nom: 'v', libelle: 'v', type: { type: 'version' } };
const JSON_: Champ = { nom: 'j', libelle: 'j', type: { type: 'json' } };
const DATE: Champ = { nom: 'd', libelle: 'd', type: { type: 'date' } };
const CAMPUS: Champ = { nom: 'c', libelle: 'c', type: { type: 'etablissements' } };
const UUID: Champ = { nom: 'u', libelle: 'u', type: { type: 'uuid' }, obligatoire: true };

test('un texte vide devient nul, sauf quand le vide est une valeur', () => {
    expect(versLigneDuChamp(TEXTE, '  ')).toEqual({ ok: true, valeur: null });
    expect(versLigneDuChamp(IMAGE, '')).toEqual({ ok: true, valeur: '' });
    expect(versLigneDuChamp({ ...TEXTE, obligatoire: true }, '')).toEqual({ ok: false, erreur: 'Obligatoire.' });
});

test('une version hors forme ne part pas', () => {
    expect(versLigneDuChamp(VERSION, '6.1.0')).toEqual({ ok: true, valeur: '6.1.0' });
    expect(versLigneDuChamp(VERSION, '')).toEqual({ ok: true, valeur: null });
    expect(versLigneDuChamp(VERSION, '6.1').ok).toBe(false);
});

test('un JSON illisible ne part pas, un JSON vide vaut nul', () => {
    expect(versLigneDuChamp(JSON_, '{"a": 1}')).toEqual({ ok: true, valeur: { a: 1 } });
    expect(versLigneDuChamp(JSON_, '')).toEqual({ ok: true, valeur: null });
    expect(versLigneDuChamp(JSON_, '{a}').ok).toBe(false);
    expect(versSaisieDuChamp(JSON_, { a: 1 })).toBe('{\n  "a": 1\n}');
});

test('une date fait l aller-retour par l heure locale', () => {
    const iso = '2026-09-03T06:30:00.000Z';
    const saisie = versSaisieDuChamp(DATE, iso);
    expect(saisie).toBe('2026-09-03T08:30');
    expect(versLigneDuChamp(DATE, saisie)).toEqual({ ok: true, valeur: iso });
    expect(versLigneDuChamp(DATE, '')).toEqual({ ok: true, valeur: null });
});

test('aucun campus coche vaut tous, c est-a-dire nul', () => {
    expect(versLigneDuChamp(CAMPUS, [])).toEqual({ ok: true, valeur: null });
    expect(versLigneDuChamp(CAMPUS, ['bordeaux'])).toEqual({ ok: true, valeur: ['bordeaux'] });
    expect(versSaisieDuChamp(CAMPUS, ['bordeaux', 3])).toEqual(['bordeaux']);
});

test('un identifiant de testeur est nettoye et verifie', () => {
    expect(versLigneDuChamp(UUID, ' 574C8942-3502-413A-937E-D1818C5E352B ')).toEqual({ ok: true, valeur: '574c8942-3502-413a-937e-d1818c5e352b' });
    expect(versLigneDuChamp(UUID, '574c8942').ok).toBe(false);
});
