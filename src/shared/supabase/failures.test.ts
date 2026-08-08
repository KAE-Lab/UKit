/**
 * La table d'erreurs de la base : ce qu'une lecture ratee dit a un ecran.
 *
 * Jouable hors appareil parce que `failures.ts` ne manipule que la **forme** de l'erreur rendue, sans
 * importer ni le client Supabase ni React Native. Casser cette contrainte rendra ce fichier
 * injouable : ce sera le signal.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { baseNonConfiguree, describeSupabaseFailure } from './failures';

test('un echec de transport est reessayable', () => {
    // Ce que le client rend quand la requete n'a jamais abouti : pas de code, un message de fetch.
    const failure = describeSupabaseFailure({ message: 'TypeError: Network request failed' });

    expect(failure.kind).toBe('unavailable');
    expect(failure.retryable).toBe(true);
    expect(failure.messageKey).toBe('ERROR_SERVICE_UNAVAILABLE');
});

test('une table absente du schema n est pas une panne, et ne se reessaie pas', () => {
    // PGRST205 : le code demande une table que la base n'a pas. Rejouer redonnerait la meme reponse.
    const failure = describeSupabaseFailure({
        code: 'PGRST205',
        message: "Could not find the table 'public.annonces' in the schema cache",
    });

    expect(failure.kind).toBe('rejected');
    expect(failure.retryable).toBe(false);
});

test('une colonne absente est rangee avec les decalages de schema', () => {
    expect(describeSupabaseFailure({ code: 'PGRST204', message: 'column not found' }).kind).toBe('rejected');
    expect(describeSupabaseFailure({ code: '42703', message: 'undefined_column' }).kind).toBe('rejected');
});

test('une cle invalide reste unavailable, jamais config', () => {
    // `config` affiche « Saisis tes identifiants » : l'utilisateur n'a aucune prise sur une cle
    // compilee dans le binaire, et le lui demander serait un mensonge. Ce test verrouille la
    // decision pour qu'on ne la « corrige » pas par megarde.
    const failure = describeSupabaseFailure({ code: '', message: 'Invalid API key' });

    expect(failure.kind).toBe('unavailable');
    expect(failure.kind).not.toBe('config');
});

test('un refus de politique est une indisponibilite vue de l ecran', () => {
    // 42501 est ce que la base rend a une ecriture avec la cle publiable. L'utilisateur n'a rien a
    // corriger ; le detail journalise, lui, dit la verite a qui peut agir.
    const failure = describeSupabaseFailure({
        code: '42501',
        message: 'new row violates row-level security policy for table "annonces"',
    });

    expect(failure.kind).toBe('unavailable');
    expect(failure.detail).toContain('42501');
});

test('le detail porte le code quand il y en a un', () => {
    expect(describeSupabaseFailure({ code: 'PGRST205', message: 'absente' }).detail).toBe('PGRST205 : absente');
    expect(describeSupabaseFailure({ message: 'sans code' }).detail).toBe('sans code');
});

test('une erreur absente reste un echec, pas un succes silencieux', () => {
    // Appeler la traduction sur `null` est un defaut d'appelant ; rendre un objet qui pretendrait
    // qu'il n'y a rien a signaler serait pire que le dire.
    expect(describeSupabaseFailure(null).kind).toBe('unavailable');
    expect(describeSupabaseFailure(undefined).kind).toBe('unavailable');
});

test('une application sans cle de base echoue proprement, sans reclamer d identifiants', () => {
    // La sonde qui valide le jalon : sans base, l'application vit sur son socle embarque.
    const failure = baseNonConfiguree();

    expect(failure.kind).toBe('unavailable');
    expect(failure.retryable).toBe(true);
    expect(failure.detail).toContain('configuree');
});
