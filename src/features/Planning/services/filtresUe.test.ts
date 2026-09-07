/**
 * Ce que le filtre d'UE doit tenir, sur des cours a plusieurs codes.
 *
 * Aucun test ne verrouillait `filterCourse` avant le 2026-09-06 : le defaut signale — un TP a deux
 * codes d'UE qui disparait des qu'un seul est filtre — n'a ete vu que par un utilisateur. Les
 * intitules ci-dessous sont ceux que Celcat sert au groupe `MI601A`, mesures le meme jour.
 */

import { describe, expect, it } from 'vitest';

import { codesDUE, estMasque, poserLesUE, preparerPourAffichage, type CoursAvecUE } from './filtresUe';

/** Le cours d'intelligence artificielle, sous son code francais et son code anglais. */
const IA: CoursAvecUE = {
    subject: '4TTV417U Artificial intelligence',
    modules: ['4TTV417U Artificial intelligence', '4TTI607U Artificial Intelligence '],
};

/** Un cours ordinaire, un seul module. */
const ALGO: CoursAvecUE = { subject: '4TIN602U Techn algorithmiques et program', modules: ['4TIN602U Techn algorithmiques et program'] };

/** Un cours d'ADE : pas de modules, pas de code dans le titre. */
const ANGLAIS: CoursAvecUE = { subject: 'Anglais TOEIC' };

describe('codesDUE', () => {
    it('lit tous les codes des modules, sans doublon', () => {
        expect(codesDUE(IA)).toEqual(['4TTV417U', '4TTI607U']);
        expect(codesDUE({ subject: 'x', modules: ['4TIN410U POO', '4TIN410U POO', '4TIN614U POO'] })).toEqual(['4TIN410U', '4TIN614U']);
    });

    it('retombe sur le sujet quand la source ne declare pas de modules', () => {
        // L'export iCalendar, et les caches ecrits avant le champ.
        expect(codesDUE({ subject: '4TIN602U Techn algorithmiques' })).toEqual(['4TIN602U']);
        expect(codesDUE(ANGLAIS)).toEqual([]);
    });
});

describe('poserLesUE', () => {
    it('pose le premier code en UE, tous en ues, et retire le code du sujet', () => {
        const cours = poserLesUE({ ...IA });
        expect(cours.UE).toBe('4TTV417U');
        expect(cours.ues).toEqual(['4TTV417U', '4TTI607U']);
        expect(cours.subject).toBe('Artificial intelligence');
    });

    it('est idempotent : un second passage ne remet pas UE a null', () => {
        const cours = poserLesUE(poserLesUE({ ...ALGO }));
        expect(cours.UE).toBe('4TIN602U');
        expect(cours.subject).toBe('Techn algorithmiques et program');
    });

    it('laisse un cours sans code intact, UE a null', () => {
        const cours = poserLesUE({ ...ANGLAIS });
        expect(cours.UE).toBeNull();
        expect(cours.ues).toEqual([]);
        expect(cours.subject).toBe('Anglais TOEIC');
    });
});

describe('estMasque', () => {
    it('garde un cours dont une seule UE est filtree — le cas signale', () => {
        expect(estMasque(poserLesUE({ ...IA }), ['4TTV417U'])).toBe(false);
        expect(estMasque(poserLesUE({ ...IA }), ['4TTI607U'])).toBe(false);
    });

    it('masque un cours dont toutes les UE sont filtrees', () => {
        expect(estMasque(poserLesUE({ ...IA }), ['4TTV417U', '4TTI607U'])).toBe(true);
        expect(estMasque(poserLesUE({ ...ALGO }), ['4TIN602U'])).toBe(true);
    });

    it('ne masque jamais un cours sans UE', () => {
        expect(estMasque(poserLesUE({ ...ANGLAIS }), ['4TTV417U'])).toBe(false);
    });

    it('compare verbatim, comme le planning ecrit ses codes', () => {
        expect(estMasque(poserLesUE({ ...ALGO }), ['4tin602u'])).toBe(false);
    });
});

describe('preparerPourAffichage', () => {
    it('ne filtre que le planning des favoris', () => {
        expect(preparerPourAffichage([{ ...ALGO }], false, ['4TIN602U'])).toHaveLength(1);
        expect(preparerPourAffichage([{ ...ALGO }], true, ['4TIN602U'])).toHaveLength(0);
    });

    it('accepte une liste de filtres absente ou malformee', () => {
        expect(preparerPourAffichage([{ ...ALGO }], true, undefined)).toHaveLength(1);
        expect(preparerPourAffichage([{ ...ALGO }], true, 'pas une liste')).toHaveLength(1);
    });
});
