/**
 * La cadence de la fiche de notation : quatre jours d'usage, cent vingt jours entre deux demandes, jamais
 * le jour d'une question d'avis.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { lireMemoire, MEMOIRE_VIDE, noterAvis, noterUsage, peutDemander } from './cadence';

const quatreJours = ['2026-11-01', '2026-11-03', '2026-11-08', '2026-11-09'].reduce(noterUsage, MEMOIRE_VIDE);

test('pas avant quatre jours d usage reussi, distincts', () => {
    const trois = ['2026-11-01', '2026-11-01', '2026-11-03', '2026-11-08'].reduce(noterUsage, MEMOIRE_VIDE);
    expect(trois.jours).toHaveLength(3);
    expect(peutDemander(trois, '2026-11-08')).toBe(false);
    expect(peutDemander(quatreJours, '2026-11-09')).toBe(true);
});

test('jamais le jour d une question d avis', () => {
    expect(peutDemander(noterAvis(quatreJours, '2026-11-09'), '2026-11-09')).toBe(false);
    expect(peutDemander(noterAvis(quatreJours, '2026-11-08'), '2026-11-09')).toBe(true);
});

test('cent vingt jours entre deux demandes, et quatre jours d usage neufs', () => {
    const demandee = { ...quatreJours, demandee: '2026-11-09' };
    const apres = ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04'].reduce(noterUsage, demandee);
    expect(peutDemander(apres, '2027-03-04')).toBe(false);
    const plusTard = ['2027-03-10', '2027-03-11', '2027-03-12', '2027-03-13'].reduce(noterUsage, demandee);
    expect(peutDemander(plusTard, '2027-03-13')).toBe(true);
    expect(peutDemander({ ...demandee, jours: [...demandee.jours, '2027-03-13'] }, '2027-03-13')).toBe(false);
});

test('une memoire illisible vaut une memoire vide', () => {
    expect(lireMemoire('{')).toEqual(MEMOIRE_VIDE);
    expect(lireMemoire({ jours: ['2026-11-01', 3, 'hier'], demandee: 'jamais', avis: '2026-11-02' })).toEqual({ jours: ['2026-11-01'], demandee: null, avis: '2026-11-02' });
});
