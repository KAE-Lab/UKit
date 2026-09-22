/**
 * Les schemas saisie -> ligne : le vide qui devient nul, sauf la ou il est une valeur ; les formes
 * refusees ; les dates qui font l'aller-retour ; les valeurs hors liste qui ne repartent pas.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import type { Champ, Descripteur } from './descripteurs';
import { schemaDuChamp, schemaDuDescripteur, valeursInconnues, versSaisieDuChamp } from './schemas';

const TEXTE: Champ = { nom: 't', libelle: 't', type: { type: 'texte' } };
const IMAGE: Champ = { nom: 'i', libelle: 'i', type: { type: 'image', dossier: 'x' }, videEstValeur: true };
const VERSION: Champ = { nom: 'v', libelle: 'v', type: { type: 'version' } };
const JSON_: Champ = { nom: 'j', libelle: 'j', type: { type: 'json' } };
const DATE: Champ = { nom: 'd', libelle: 'd', type: { type: 'date' } };
const NOMBRE: Champ = { nom: 'n', libelle: 'n', type: { type: 'nombre' } };
const CAMPUS: Champ = { nom: 'c', libelle: 'c', type: { type: 'etablissements' } };
const UUID: Champ = { nom: 'u', libelle: 'u', type: { type: 'uuid' }, obligatoire: true };
const CHOIX: Champ = { nom: 'e', libelle: 'e', type: { type: 'choix', options: [{ valeur: 'info', libelle: 'i' }, { valeur: 'incident', libelle: 'x' }] } };
const PLATEFORMES: Champ = { nom: 'p', libelle: 'p', type: { type: 'cases', options: [{ valeur: 'ios', libelle: 'iOS' }, { valeur: 'android', libelle: 'Android' }] } };

function convertir(champ: Champ, saisie: unknown, etablissements: readonly string[] | null = null) {
    const resultat = schemaDuChamp(champ, { etablissements }).safeParse(saisie);
    return resultat.success ? { ok: true, valeur: resultat.data } : { ok: false, erreur: resultat.error.issues[0]?.message };
}

test('un texte vide devient nul, sauf quand le vide est une valeur', () => {
    expect(convertir(TEXTE, '  ')).toEqual({ ok: true, valeur: null });
    expect(convertir(TEXTE, ' bonjour ')).toEqual({ ok: true, valeur: 'bonjour' });
    expect(convertir(IMAGE, '')).toEqual({ ok: true, valeur: '' });
    expect(convertir({ ...TEXTE, obligatoire: true }, '')).toEqual({ ok: false, erreur: 'Obligatoire.' });
});

test('une version hors forme ne part pas', () => {
    expect(convertir(VERSION, '6.1.0')).toEqual({ ok: true, valeur: '6.1.0' });
    expect(convertir(VERSION, '')).toEqual({ ok: true, valeur: null });
    expect(convertir(VERSION, '6.1').ok).toBe(false);
});

test('un JSON illisible ne part pas, un JSON vide vaut nul', () => {
    expect(convertir(JSON_, '{"a": 1}')).toEqual({ ok: true, valeur: { a: 1 } });
    expect(convertir(JSON_, '')).toEqual({ ok: true, valeur: null });
    expect(convertir(JSON_, '{a}').ok).toBe(false);
    expect(versSaisieDuChamp(JSON_, { a: 1 })).toBe('{\n  "a": 1\n}');
});

test('un nombre se lit, et le reste est refuse', () => {
    expect(convertir(NOMBRE, '44.8')).toEqual({ ok: true, valeur: 44.8 });
    expect(convertir(NOMBRE, '')).toEqual({ ok: true, valeur: null });
    expect(convertir(NOMBRE, 'abc').ok).toBe(false);
    expect(versSaisieDuChamp(NOMBRE, 3)).toBe('3');
});

test('une date fait l aller-retour par l heure locale', () => {
    const iso = '2026-09-03T06:30:00.000Z';
    const saisie = versSaisieDuChamp(DATE, iso);
    expect(saisie).toBe('2026-09-03T08:30');
    expect(convertir(DATE, saisie)).toEqual({ ok: true, valeur: iso });
    expect(convertir(DATE, '')).toEqual({ ok: true, valeur: null });
});

test('aucun campus coche vaut tous, un code hors catalogue ne repart pas quand le catalogue est connu', () => {
    expect(convertir(CAMPUS, [])).toEqual({ ok: true, valeur: null });
    expect(convertir(CAMPUS, ['bordeaux'])).toEqual({ ok: true, valeur: ['bordeaux'] });
    expect(convertir(CAMPUS, ['bordeaux', 'talence'], ['bordeaux']).erreur).toContain('talence');
    expect(convertir(CAMPUS, ['talence'], null)).toEqual({ ok: true, valeur: ['talence'] });
    expect(versSaisieDuChamp(CAMPUS, ['bordeaux', 3])).toEqual(['bordeaux']);
});

test('aucune case cochee vaut toutes, et une valeur hors options ne part pas en la nommant', () => {
    expect(convertir(PLATEFORMES, [])).toEqual({ ok: true, valeur: null });
    expect(convertir(PLATEFORMES, ['android'])).toEqual({ ok: true, valeur: ['android'] });
    expect(convertir(PLATEFORMES, ['tv']).erreur).toContain('tv');
    expect(versSaisieDuChamp(PLATEFORMES, ['ios', 7])).toEqual(['ios']);
});

test('un choix hors liste ne part pas en le nommant ; vide vaut nul sauf obligatoire', () => {
    expect(convertir(CHOIX, 'info')).toEqual({ ok: true, valeur: 'info' });
    expect(convertir(CHOIX, '')).toEqual({ ok: true, valeur: null });
    expect(convertir({ ...CHOIX, obligatoire: true }, '').erreur).toBe('Obligatoire.');
    expect(convertir(CHOIX, 'panique').erreur).toContain('panique');
});

test('un identifiant de testeur est nettoye et verifie', () => {
    expect(convertir(UUID, ' 574C8942-3502-413A-937E-D1818C5E352B ')).toEqual({ ok: true, valeur: '574c8942-3502-413a-937e-d1818c5e352b' });
    expect(convertir(UUID, '574c8942').ok).toBe(false);
});

test('le schema d un descripteur ecrit les champs qui s ecrivent, et rien de ce qui se lit seulement', () => {
    const descripteur: Descripteur = {
        chemin: 'x', table: 'x', titre: 'x', description: '', cle: ['u'], liste: [],
        champs: [UUID, { ...TEXTE, lectureSeule: true }, { nom: 'b', libelle: 'b', type: { type: 'booleen' } }],
    };
    const resultat = schemaDuDescripteur(descripteur).safeParse({ u: '574c8942-3502-413a-937e-d1818c5e352b', t: 'ignore', b: true });
    expect(resultat.success).toBe(true);
    expect(resultat.data).toEqual({ u: '574c8942-3502-413a-937e-d1818c5e352b', b: true });
    const refus = schemaDuDescripteur(descripteur).safeParse({ u: '', b: false });
    expect(refus.success).toBe(false);
    expect(refus.error?.issues[0]?.path).toEqual(['u']);
});

test('les valeurs inconnues d une ligne se reperent pour la liste', () => {
    expect(valeursInconnues(PLATEFORMES, ['ios', 'tv'], null)).toEqual(['tv']);
    expect(valeursInconnues(CHOIX, 'panique', null)).toEqual(['panique']);
    expect(valeursInconnues(CHOIX, null, null)).toEqual([]);
    expect(valeursInconnues(CAMPUS, ['talence'], ['bordeaux'])).toEqual(['talence']);
    expect(valeursInconnues(CAMPUS, ['talence'], null)).toEqual([]);
});
