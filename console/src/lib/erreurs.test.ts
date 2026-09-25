/**
 * La traduction des erreurs de la base : un code connu devient une phrase, un code inconnu garde
 * son code, un echec reseau se reconnait.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { ErreurDeBase, ErreurDeConflit, estHorsLigne, messageDErreur, traduire } from './erreurs';

test('une politique qui refuse parle des droits du compte, pas d une table qu il ne connait pas', () => {
    const erreur = traduire({ code: '42501', message: 'new row violates row-level security policy' });
    expect(erreur).toBeInstanceOf(ErreurDeBase);
    expect(erreur.code).toBe('42501');
    expect(erreur.message).toContain('droits de ce compte');
});

test('une garde de la base dit son propre message', () => {
    const message = 'La console garde toujours au moins un admin : nomme d’abord un autre admin.';
    expect(traduire({ code: 'P0001', message }).message).toBe(message);
});

test('un conflit porte la ligne que la base a maintenant', () => {
    const conflit = new ErreurDeConflit('Modifiée entre-temps', { id: 'a' });
    expect(conflit).toBeInstanceOf(ErreurDeBase);
    expect(conflit.code).toBe('CONFLIT');
    expect(conflit.fraiche).toEqual({ id: 'a' });
});

test('une contrainte violee garde le message de la base, un code inconnu garde son code', () => {
    expect(traduire({ code: '23514', message: 'annonces_couleur_check' }).message).toContain('annonces_couleur_check');
    expect(traduire({ code: '23505', message: 'duplicate' }).message).toContain('clé');
    expect(traduire({ code: 'XX000', message: 'boom' }).message).toBe('XX000 : boom');
    expect(traduire({ code: undefined, message: 'boom' }).code).toBeNull();
});

test('un echec reseau se reconnait a son message', () => {
    expect(estHorsLigne(new TypeError('Failed to fetch'))).toBe(true);
    expect(estHorsLigne(traduire({ code: '42501', message: '' }))).toBe(false);
    expect(messageDErreur('texte')).toBe('texte');
});
