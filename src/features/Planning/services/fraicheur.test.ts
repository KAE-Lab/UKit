import { describe, expect, it } from 'vitest';

import { FENETRE_DE_FRAICHEUR_MS, relectureInutile } from './fraicheur';

const LECTURE = { cle: 'INF1CIA1@2026/09/17', quand: 1_000_000 };

describe('relectureInutile', () => {
    it('est inutile dans la fenetre, sur la meme cle', () => {
        expect(relectureInutile(LECTURE, LECTURE.cle, LECTURE.quand)).toBe(true);
        expect(relectureInutile(LECTURE, LECTURE.cle, LECTURE.quand + FENETRE_DE_FRAICHEUR_MS - 1)).toBe(true);
    });

    it('redevient utile a la fin de la fenetre', () => {
        expect(relectureInutile(LECTURE, LECTURE.cle, LECTURE.quand + FENETRE_DE_FRAICHEUR_MS)).toBe(false);
    });

    it('est toujours utile sans lecture, sur une autre cle, ou quand l horloge recule', () => {
        expect(relectureInutile(null, LECTURE.cle, LECTURE.quand)).toBe(false);
        expect(relectureInutile(LECTURE, 'INF1CIA1@2026/09/18', LECTURE.quand)).toBe(false);
        expect(relectureInutile(LECTURE, LECTURE.cle, LECTURE.quand - 1)).toBe(false);
    });

    it('accepte une fenetre explicite', () => {
        expect(relectureInutile(LECTURE, LECTURE.cle, LECTURE.quand + 5, 5)).toBe(false);
        expect(relectureInutile(LECTURE, LECTURE.cle, LECTURE.quand + 4, 5)).toBe(true);
    });
});
