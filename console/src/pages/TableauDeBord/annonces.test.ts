/**
 * L'etat des annonces : active maintenant, programmee, ni l'une ni l'autre.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { etatDesAnnonces } from './annonces';

const MAINTENANT = new Date('2026-09-22T12:00:00Z');
const annonce = (id: string, statut: string, active: boolean, publiee_le: string, expire_le: string | null = null) => ({ id, titre: id, statut, active, publiee_le, expire_le, audience: 'tous' });

test('active, programmee, expiree, inactive, brouillon, archivee', () => {
    const etat = etatDesAnnonces([
        annonce('a', 'publiee', true, '2026-09-20T10:00:00Z'),
        annonce('b', 'publiee', true, '2026-09-23T10:00:00Z'),
        annonce('c', 'publiee', true, '2026-09-01T10:00:00Z', '2026-09-10T10:00:00Z'),
        annonce('d', 'publiee', false, '2026-09-20T10:00:00Z'),
        annonce('e', 'brouillon', true, '2026-09-20T10:00:00Z'),
        annonce('f', 'archivee', true, '2026-09-20T10:00:00Z'),
        annonce('g', 'publiee', true, '2026-09-25T10:00:00Z'),
    ], MAINTENANT);
    expect(etat.actives.map((a) => a.id)).toEqual(['a']);
    expect(etat.programmees.map((a) => a.id)).toEqual(['b', 'g']);
    expect(etat.brouillons).toBe(1);
    expect(etat.archivees).toBe(1);
});
