/**
 * L'etat d'une table devient une requete : le tri borne aux colonnes triables, les filtres types,
 * la recherche echappee, le campus qui garde les contenus « tous campus », la plage de la page.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import type { Descripteur } from '../schema/descripteurs';
import { echapper, expressionDeCampus, expressionDeRecherche, specDepuisEtat } from './requete';

const DESCRIPTEUR: Descripteur = {
    chemin: 'x', table: 'x', titre: 'x', description: '', cle: ['id'],
    liste: ['titre', 'active', 'images', 'publiee_le'],
    tri: { colonne: 'publiee_le', desc: true },
    recherche: ['titre', 'emetteur'],
    campus: { type: 'ciblage', colonne: 'etablissements' },
    champs: [
        { nom: 'id', libelle: 'id', type: { type: 'uuid' } },
        { nom: 'titre', libelle: 't', type: { type: 'texte' } },
        { nom: 'emetteur', libelle: 'e', type: { type: 'texte' } },
        { nom: 'active', libelle: 'a', type: { type: 'booleen' } },
        { nom: 'images', libelle: 'i', type: { type: 'json' } },
        { nom: 'publiee_le', libelle: 'p', type: { type: 'date' } },
        { nom: 'etat', libelle: 'e', type: { type: 'choix', options: [{ valeur: 'nouveau', libelle: 'n' }] } },
    ],
};

const ETAT = { sorting: [], columnFilters: [], globalFilter: '', pagination: { pageIndex: 0, pageSize: 50 } };

test('sans etat, le tri du descripteur et la premiere page', () => {
    const spec = specDepuisEtat(DESCRIPTEUR, ETAT, null);
    expect(spec.tri).toEqual([{ colonne: 'publiee_le', desc: true }]);
    expect(spec.plage).toEqual({ de: 0, a: 49 });
    expect(spec.recherche).toBeNull();
    expect(spec.campus).toBeNull();
});

test('un tri sur une colonne non triable est ignore, la page 3 commence a 100', () => {
    const spec = specDepuisEtat(DESCRIPTEUR, { ...ETAT, sorting: [{ id: 'images', desc: false }], pagination: { pageIndex: 2, pageSize: 50 } }, null);
    expect(spec.tri).toEqual([{ colonne: 'publiee_le', desc: true }]);
    expect(spec.plage).toEqual({ de: 100, a: 149 });
    expect(specDepuisEtat(DESCRIPTEUR, { ...ETAT, sorting: [{ id: 'titre', desc: false }] }, null).tri).toEqual([{ colonne: 'titre', desc: false }]);
});

test('un filtre booleen devient un booleen, un choix une egalite, une liste un in, le vide rien', () => {
    const spec = specDepuisEtat(DESCRIPTEUR, {
        ...ETAT,
        columnFilters: [{ id: 'active', value: 'true' }, { id: 'etat', value: ['nouveau', 'en_attente'] }, { id: 'titre', value: '' }, { id: 'inconnue', value: 'x' }],
    }, null);
    expect(spec.filtres).toEqual([
        { colonne: 'active', op: 'eq', valeur: true },
        { colonne: 'etat', op: 'in', valeurs: ['nouveau', 'en_attente'] },
    ]);
});

test('la recherche parcourt les colonnes declarees, entre guillemets, jokers compris', () => {
    const spec = specDepuisEtat(DESCRIPTEUR, { ...ETAT, globalFilter: '  soirée, "BDE"  ' }, null);
    expect(spec.recherche).toEqual({ colonnes: ['titre', 'emetteur'], texte: 'soirée, "BDE"' });
    expect(expressionDeRecherche(spec.recherche!)).toBe('titre.ilike."*soirée, \\"BDE\\"*",emetteur.ilike."*soirée, \\"BDE\\"*"');
    expect(echapper('a\\b')).toBe('"a\\\\b"');
});

test('le campus garde les contenus sans ciblage, et compare un code tel quel', () => {
    expect(specDepuisEtat(DESCRIPTEUR, ETAT, 'bordeaux').campus).toBe('etablissements.is.null,etablissements.cs.{"bordeaux"}');
    expect(expressionDeCampus({ type: 'code', colonne: 'etablissement' }, 'bordeaux-inp')).toBe('etablissement.eq."bordeaux-inp"');
    expect(specDepuisEtat({ ...DESCRIPTEUR, campus: undefined }, ETAT, 'bordeaux').campus).toBeNull();
});
