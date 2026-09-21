import { describe, expect, it } from 'vitest';

import { INTERVALLE_ENTRETIEN_MS, estDu, lireTentative, origineDuRun, type OrigineSynchro } from './tentative';

describe('lireTentative', () => {
    it('relit une tentative bien formee, avec ou sans raison', () => {
        expect(lireTentative(JSON.stringify({ at: 10, ok: true, origine: 'tache' }))).toEqual({ at: 10, ok: true, origine: 'tache' });
        expect(lireTentative(JSON.stringify({ at: 10, ok: false, origine: 'manuel', raison: 'calendrier introuvable' }))).toEqual({ at: 10, ok: false, origine: 'manuel', raison: 'calendrier introuvable' });
        expect(lireTentative(JSON.stringify({ at: 10, ok: false, origine: 'manuel', raison: 7 }))).toEqual({ at: 10, ok: false, origine: 'manuel' });
    });

    it('rend null pour un magasin vide, illisible ou d une autre forme', () => {
        expect(lireTentative(null)).toBeNull();
        expect(lireTentative('')).toBeNull();
        expect(lireTentative('{')).toBeNull();
        expect(lireTentative(JSON.stringify({ at: 'hier', ok: true, origine: 'tache' }))).toBeNull();
        expect(lireTentative(JSON.stringify({ at: 10, ok: true, origine: 'martien' }))).toBeNull();
    });
});

describe('estDu', () => {
    it('est du sans tentative, apres un intervalle, ou quand l horloge recule', () => {
        expect(estDu(null, 100)).toBe(true);
        expect(estDu(100, 100 + INTERVALLE_ENTRETIEN_MS)).toBe(true);
        expect(estDu(100, 100 + INTERVALLE_ENTRETIEN_MS - 1)).toBe(false);
        expect(estDu(100, 99)).toBe(true);
    });
});

describe('origineDuRun', () => {
    it('ne rend automatique que ce que l application declenche d elle-meme', () => {
        const table: Record<OrigineSynchro, 'utilisateur' | 'automatique'> = {
            manuel: 'utilisateur',
            lancement: 'automatique',
            'premier-plan': 'automatique',
            tache: 'automatique',
            sonde: 'utilisateur',
            favoris: 'utilisateur',
            activation: 'utilisateur',
            filtres: 'utilisateur',
        };
        for (const [origine, attendu] of Object.entries(table)) {
            expect(origineDuRun(origine as OrigineSynchro)).toBe(attendu);
        }
    });
});
