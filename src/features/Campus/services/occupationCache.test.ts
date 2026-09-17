import { describe, expect, it } from 'vitest';

import {
    TTL_OCCUPATION_MS,
    cleOccupation,
    estCachable,
    estFraiche,
    fusionner,
    lireOccupation,
    sallesARelire,
    type CacheOccupation,
    type OccupationSalle,
} from './occupationCache';

const EVENEMENT = { id: 'e1', starttime: '08:00', endtime: '10:00', date: { start: '2026-09-17T08:00', end: '2026-09-17T10:00' }, description: 'Cours A28-1', isVacances: false };

function salle(roomId: string, ok = true): OccupationSalle {
    return { roomId, ok, events: ok ? [EVENEMENT] : [] };
}

const CACHE: CacheOccupation = { horodatage: 1_000_000, salles: [salle('s1'), salle('s2', false)] };

describe('cleOccupation', () => {
    it('porte le prefixe versionne, le batiment et le jour', () => {
        expect(cleOccupation('A28', '2026-09-17')).toBe('occupation@1:A28:2026-09-17');
    });
});

describe('lireOccupation', () => {
    it('relit un cache bien forme', () => {
        expect(lireOccupation(JSON.stringify(CACHE))).toEqual(CACHE);
    });

    it('rend null pour un magasin vide, illisible ou d une autre forme', () => {
        expect(lireOccupation(null)).toBeNull();
        expect(lireOccupation('{')).toBeNull();
        expect(lireOccupation(JSON.stringify([]))).toBeNull();
        expect(lireOccupation(JSON.stringify({ horodatage: 'hier', salles: [] }))).toBeNull();
        expect(lireOccupation(JSON.stringify({ horodatage: 1, salles: [{ roomId: 's1' }] }))).toBeNull();
    });
});

describe('estFraiche', () => {
    it('est fraiche moins de dix minutes apres, et perimee ensuite ou quand l horloge recule', () => {
        expect(estFraiche(CACHE, CACHE.horodatage + TTL_OCCUPATION_MS - 1)).toBe(true);
        expect(estFraiche(CACHE, CACHE.horodatage + TTL_OCCUPATION_MS)).toBe(false);
        expect(estFraiche(CACHE, CACHE.horodatage - 1)).toBe(false);
        expect(estFraiche(null, CACHE.horodatage)).toBe(false);
    });
});

describe('estCachable', () => {
    it('refuse un lot ou toutes les salles ont echoue', () => {
        expect(estCachable([salle('s1', false), salle('s2', false)])).toBe(false);
        expect(estCachable([salle('s1', false), salle('s2')])).toBe(true);
        expect(estCachable([])).toBe(false);
    });
});

describe('sallesARelire', () => {
    it('rejoue les salles en echec et les salles absentes, jamais celles qui ont repondu', () => {
        expect(sallesARelire(CACHE, ['s1', 's2', 's3'])).toEqual(['s2', 's3']);
        expect(sallesARelire(CACHE, ['s1'])).toEqual([]);
    });
});

describe('fusionner', () => {
    it('remplace les salles rejouees, ajoute les nouvelles et garde l horodatage', () => {
        const fusion = fusionner(CACHE, [salle('s2'), salle('s3')]);
        expect(fusion.horodatage).toBe(CACHE.horodatage);
        expect(fusion.salles.map((s) => [s.roomId, s.ok])).toEqual([['s1', true], ['s2', true], ['s3', true]]);
    });
});
