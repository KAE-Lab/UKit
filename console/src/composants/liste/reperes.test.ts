/**
 * Les reperes d'une liste : rien pour le cas courant, un mot court sinon.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { CIBLAGE, type Champ } from '../../schema/descripteurs';
import { estCourant, texteDeRepere } from './reperes';

const champ = (nom: string): Champ => {
    const trouve = CIBLAGE.find((c) => c.nom === nom);
    if (trouve === undefined) throw new Error(nom);
    return trouve;
};
const EPINGLEE: Champ = { nom: 'epinglee', libelle: 'Épinglée', type: { type: 'booleen' }, defaut: false };
const ACTIF: Champ = { nom: 'actif', libelle: 'Actif', type: { type: 'booleen' }, defaut: true, repere: 'inactif' };
const PUBLIEE: Champ = { nom: 'publiee_le', libelle: 'Publiée le', type: { type: 'date' }, defaut: () => new Date().toISOString() };

test('le vide et la valeur par defaut sont le cas courant', () => {
    expect(estCourant(champ('etablissements'), null)).toBe(true);
    expect(estCourant(champ('etablissements'), [])).toBe(true);
    expect(estCourant(champ('audience'), 'tous')).toBe(true);
    expect(estCourant(EPINGLEE, false)).toBe(true);
    expect(estCourant(ACTIF, true)).toBe(true);
    expect(estCourant(champ('version_min'), '')).toBe(true);
});

test('un defaut calcule ne fait pas un cas courant', () => {
    expect(estCourant(PUBLIEE, '2026-11-19T13:11:00Z')).toBe(false);
});

test('ce qui s ecarte se dit en un mot court', () => {
    expect(texteDeRepere(EPINGLEE, true)).toBe('Épinglée');
    expect(texteDeRepere(ACTIF, false)).toBe('inactif');
    expect(texteDeRepere(champ('audience'), 'testeurs')).toBe('Testeurs');
    expect(texteDeRepere(champ('version_min'), '6.3.0')).toBe('dès 6.3.0');
    expect(texteDeRepere(champ('version_max'), '6.2.9')).toBe('jusqu’à 6.2.9');
    expect(texteDeRepere(champ('etablissements'), ['bordeaux'])).toBe('');
    // Une date d'une autre annee se lit sans l'heure : le repere reste court.
    expect(texteDeRepere({ nom: 'expire_le', libelle: 'Expire le', type: { type: 'date' }, repere: 'jusqu’au' }, '2100-01-01T00:00:00Z')).toBe('jusqu’au 1 janv. 2100');
});

test('le cas courant ne donne aucun repere', () => {
    expect(texteDeRepere(EPINGLEE, false)).toBeNull();
    expect(texteDeRepere(champ('audience'), 'tous')).toBeNull();
    expect(texteDeRepere(champ('plateformes'), null)).toBeNull();
});

test('une valeur hors liste se montre telle quelle', () => {
    expect(texteDeRepere(champ('audience'), 'partenaires')).toBe('partenaires');
});
