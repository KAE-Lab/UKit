/**
 * Le sondage d'une annonce : la forme lue de la colonne, l'ouverture, les resultats publics.
 *
 *     npm test
 */

import { describe, expect, test } from 'vitest';

import { estOuvert, lireResultats, lireSondage } from './sondage';

const SONDAGE = {
    question: ' Quel creneau pour la soiree ? ',
    choix: [{ id: 'a', libelle: 'Jeudi' }, { id: 'b', libelle: ' Vendredi ' }],
    clos_le: '2026-12-01T18:00:00+01:00',
};

describe('la forme du sondage', () => {
    test('un sondage complet se lit, nettoye, sa cloture en millisecondes', () => {
        expect(lireSondage(SONDAGE)).toEqual({
            question: 'Quel creneau pour la soiree ?',
            choix: [{ id: 'a', libelle: 'Jeudi' }, { id: 'b', libelle: 'Vendredi' }],
            closLe: Date.parse('2026-12-01T17:00:00Z'),
        });
    });

    test('hors de la forme de la base, rien', () => {
        const refuses: unknown[] = [
            null, [], 'sondage',
            { ...SONDAGE, question: 'Q ?' },
            { ...SONDAGE, choix: [{ id: 'a', libelle: 'Seul' }] },
            { ...SONDAGE, choix: [{ id: 'a', libelle: 'Un' }, { id: 'a', libelle: 'Deux' }] },
            { ...SONDAGE, choix: [{ id: 'A', libelle: 'Un' }, { id: 'b', libelle: 'Deux' }] },
            { ...SONDAGE, choix: [{ id: 'a', libelle: ' ' }, { id: 'b', libelle: 'Deux' }] },
            { ...SONDAGE, choix: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, libelle: `${i}` })) },
            { ...SONDAGE, clos_le: 'demain' },
            { ...SONDAGE, clos_le: '2026-12-01' },
        ];
        for (const brut of refuses) expect(lireSondage(brut)).toBeNull();
    });

    test('ouvert jusqu a sa cloture, exclue', () => {
        const s = lireSondage(SONDAGE);
        expect(s).not.toBeNull();
        if (s === null) return;
        expect(estOuvert(s, s.closLe - 1)).toBe(true);
        expect(estOuvert(s, s.closLe)).toBe(false);
    });
});

describe('les resultats publics', () => {
    const s = lireSondage(SONDAGE);
    if (s === null) throw new Error('fixture');

    test('sous cinq voix, rien a montrer', () => {
        expect(lireResultats({ total: null, parts: {} }, s)).toEqual({ assez: false, total: null, parts: { a: null, b: null } });
    });

    test('une petite case reste masquee, et le total avec elle', () => {
        expect(lireResultats({ total: null, parts: { a: 67, b: null } }, s)).toEqual({ assez: true, total: null, parts: { a: 67, b: null } });
        expect(lireResultats({ total: 16, parts: { a: 38, b: 62 } }, s)).toEqual({ assez: true, total: 16, parts: { a: 38, b: 62 } });
    });

    test('un choix absent de la reponse se lit masque ; une forme inattendue, rien', () => {
        expect(lireResultats({ total: null, parts: { a: 100 } }, s)?.parts).toEqual({ a: 100, b: null });
        expect(lireResultats(null, s)).toBeNull();
        expect(lireResultats({ total: 3, parts: [] }, s)).toBeNull();
    });
});
