import { describe, expect, it } from 'vitest';

import { listeCommenceAGlisser, listeFinitDeGlisser, uneListeGlisse } from './listesEnGlissement';

describe('uneListeGlisse', () => {
    it('est vraie pendant le glissement, puis un court instant apres sa fin', () => {
        listeCommenceAGlisser();
        expect(uneListeGlisse(1_000)).toBe(true);
        listeFinitDeGlisser(1_000);
        expect(uneListeGlisse(1_200)).toBe(true);
        expect(uneListeGlisse(1_400)).toBe(false);
    });

    it('ne descend pas sous zero si une fin arrive sans debut', () => {
        listeFinitDeGlisser(5_000);
        listeFinitDeGlisser(5_000);
        expect(uneListeGlisse(6_000)).toBe(false);
        listeCommenceAGlisser();
        expect(uneListeGlisse(6_000)).toBe(true);
        listeFinitDeGlisser(6_000);
        expect(uneListeGlisse(7_000)).toBe(false);
    });
});
