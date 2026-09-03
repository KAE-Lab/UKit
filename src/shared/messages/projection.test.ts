/**
 * La projection des messages de service : ce qui passe, ce qui est rejete, et la peremption.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { estEnCours, projeterMessage, projeterMessages } from './projection';

const LIGNE = {
    id: 'a3b0c1d2-0000-4000-8000-000000000001',
    cle: 'rentree-2026',
    niveau: 'info',
    titre: '  Bonne rentree  ',
    corps: 'Le planning est a jour.',
    actif: true,
    publie_le: '2026-09-01T08:00:00+00:00',
    expire_le: null,
    audience: 'tous',
    etablissements: null,
    version_min: null,
    version_max: null,
};

test('une ligne complete se projette, titre et corps nettoyes', () => {
    const message = projeterMessage(LIGNE);
    expect(message).not.toBeNull();
    expect(message?.titre).toBe('Bonne rentree');
    expect(message?.corps).toBe('Le planning est a jour.');
    expect(message?.niveau).toBe('info');
    expect(message?.ciblage.audience).toBe('tous');
});

test('sans cle, sans titre ou avec un niveau inconnu, rien ne se montre', () => {
    expect(projeterMessage({ ...LIGNE, cle: '' })).toBeNull();
    expect(projeterMessage({ ...LIGNE, titre: null })).toBeNull();
    expect(projeterMessage({ ...LIGNE, niveau: 'urgent' })).toBeNull();
    expect(projeterMessage(null)).toBeNull();
    expect(projeterMessage('texte')).toBeNull();
});

test('un corps vide est null, pas une chaine vide', () => {
    expect(projeterMessage({ ...LIGNE, corps: '   ' })?.corps).toBeNull();
});

test('une liste garde ce qui se projette et ignore le reste', () => {
    expect(projeterMessages([LIGNE, { niveau: 'info' }, 42])).toHaveLength(1);
    expect(projeterMessages('rien')).toEqual([]);
    expect(projeterMessages(null)).toEqual([]);
});

test('la peremption suit la regle des annonces', () => {
    const maintenant = new Date('2026-09-03T10:00:00Z');
    const sansEcheance = projeterMessage(LIGNE)!;
    expect(estEnCours(sansEcheance, maintenant)).toBe(true);
    expect(estEnCours(projeterMessage({ ...LIGNE, expire_le: '2026-09-04T00:00:00Z' })!, maintenant)).toBe(true);
    expect(estEnCours(projeterMessage({ ...LIGNE, expire_le: '2026-09-02T00:00:00Z' })!, maintenant)).toBe(false);
    expect(estEnCours(projeterMessage({ ...LIGNE, expire_le: 'bientot' })!, maintenant)).toBe(false);
    expect(estEnCours(projeterMessage({ ...LIGNE, actif: false })!, maintenant)).toBe(false);
});
