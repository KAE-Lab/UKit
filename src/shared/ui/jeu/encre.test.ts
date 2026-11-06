import { describe, expect, it } from 'vitest';

import { CAILLOU, COURSE_1, LIGNE_DU_SOL, LUNE, NUAGE, SOLEIL, profilDeCollines, profilDeMontagnes, SAPIN, SAUT, SYMBOLES, tailleDe, TOUFFE, traceDuSymbole, TUILE_DU_SOL, type Grille } from './encre';

describe('traceDuSymbole', () => {
    it('fusionne une suite de pixels en un seul rectangle', () => {
        expect(traceDuSymbole(['#..##'], '#')).toBe('M0 0h1v1h-1zM3 0h2v1h-2z');
        expect(traceDuSymbole(['.', '#'], '#')).toBe('M0 1h1v1h-1z');
    });

    it('ignore les autres symboles', () => {
        expect(traceDuSymbole(['+s+'], '#')).toBe('');
    });
});

describe('les grilles', () => {
    const toutes: Grille[] = [COURSE_1, SAUT, CAILLOU, SAPIN, NUAGE, TOUFFE, TUILE_DU_SOL, LUNE, SOLEIL];

    it('sont rectangulaires', () => {
        for (const grille of toutes) {
            const { largeur } = tailleDe(grille);
            expect(grille.every((ligne) => ligne.length === largeur)).toBe(true);
        }
    });

    it('ne portent que des symboles connus', () => {
        const connus = new Set(['.', ...SYMBOLES]);
        for (const grille of toutes) {
            expect([...grille.join('')].every((c) => connus.has(c))).toBe(true);
        }
    });

    it('donnent au renard une echarpe, la seule touche d accent', () => {
        expect(traceDuSymbole(COURSE_1, 's')).not.toBe('');
        expect(traceDuSymbole(CAILLOU, 's')).toBe('');
    });
});

describe('la tuile du sol', () => {
    it('porte une ligne pleine, que le renard foule, et les touffes au-dessus', () => {
        expect(TUILE_DU_SOL[LIGNE_DU_SOL]).toBe('#'.repeat(32));
        expect(TUILE_DU_SOL.slice(0, LIGNE_DU_SOL).join('')).toMatch(/\+/);
    });
});

describe('les profils du decor', () => {
    it('ferment un polygone en escalier, sans valeur illisible', () => {
        for (const profil of [profilDeMontagnes(), profilDeCollines()]) {
            expect(profil.startsWith('M0 ')).toBe(true);
            expect(profil.endsWith('Z')).toBe(true);
            expect(profil).not.toMatch(/NaN|Infinity/);
        }
    });
});
