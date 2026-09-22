/**
 * Le panneau « ordre du carrousel » : la visibilite, le ciblage et l'ordre, ensemble.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { ordreVuA, type ContexteDuPanneau } from './visibles';

const LUNDI_MIDI = new Date('2026-10-05T12:30:00+02:00');
const TALENCE: ContexteDuPanneau = { instant: LUNDI_MIDI, etablissement: 'bordeaux', plateforme: 'ios', testeur: false, version: '6.3.0' };

function ligne(id: string, patch: Record<string, unknown> = {}) {
    return { id, statut: 'publiee', active: true, publiee_le: '2026-09-01T10:00:00Z', expire_le: null, audience: 'tous', etablissements: null, version_min: null, version_max: null, plateformes: null, epinglee: false, priorite: 0, creneaux: null, ...patch };
}

test('seules les annonces visibles a l instant et ciblees vers ce telephone entrent dans l ordre', () => {
    const resultat = ordreVuA([
        ligne('visible'),
        ligne('brouillon', { statut: 'brouillon' }),
        ligne('programmee', { publiee_le: '2026-10-05T12:00:00Z' }),
        ligne('inp', { etablissements: ['bordeaux-inp'] }),
        ligne('testeurs', { audience: 'testeurs' }),
        ligne('android', { plateformes: ['android'] }),
        ligne('trop-vieille', { version_max: '6.2.2' }),
    ], TALENCE);
    expect(resultat.map((r) => r.annonce.id)).toEqual(['visible']);
});

test('un appareil testeur voit l audience testeurs, et le creneau actif se lit', () => {
    const resultat = ordreVuA([
        ligne('ordinaire'),
        ligne('testeurs', { audience: 'testeurs' }),
        ligne('midi', { creneaux: [{ jours: [1], de: '11:00', a: '14:00' }] }),
        ligne('epinglee', { epinglee: true }),
    ], { ...TALENCE, testeur: true });
    expect(resultat.map((r) => r.annonce.id).slice(0, 2)).toEqual(['epinglee', 'midi']);
    expect(resultat.find((r) => r.annonce.id === 'midi')?.creneauActif).toBe(true);
    expect(resultat.map((r) => r.annonce.id)).toContain('testeurs');
});

test('sans version, aucune borne ne filtre', () => {
    expect(ordreVuA([ligne('bornee', { version_min: '9.0.0' })], { ...TALENCE, version: null })).toHaveLength(1);
});
