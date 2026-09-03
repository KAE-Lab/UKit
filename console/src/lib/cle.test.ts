/**
 * Le slug d'une cle : accents, ponctuation, bords, et le repli quand le titre ne donne rien.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { proposerCle, slug } from './cle';

const JOUR = new Date('2026-09-03T10:00:00Z');

test('le slug retire accents et ponctuation, en minuscules', () => {
    expect(slug('Le CAS de Bordeaux ne répond plus !')).toBe('le-cas-de-bordeaux-ne-repond-plus');
    expect(slug('  Maintenance — ce soir  ')).toBe('maintenance-ce-soir');
});

test('la cle proposee porte la date du jour', () => {
    expect(proposerCle('Maintenance ce soir', JOUR)).toBe('maintenance-ce-soir-2026-09-03');
});

test('un titre sans lettre ni chiffre tombe sur un repli date', () => {
    expect(proposerCle('!!!', JOUR)).toBe('message-2026-09-03');
});
