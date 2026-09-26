/**
 * Les compteurs des retours : par etat, nature, campus, et les huit dernieres semaines (lundi).
 *
 *     npm test   (a la racine du depot ; TZ = Europe/Paris)
 */

import { expect, test } from 'vitest';

import { compteurs, lundiDe } from './compteurs';

const MAINTENANT = new Date('2026-09-22T12:00:00+02:00');
const OUVERTS = ['nouveau', 'en_attente'];
const retour = (recu_le: string, etat: string, nature: string, campus: string | null) => ({ recu_le, etat, nature, campus });

test('le lundi d une date, en heure locale', () => {
    expect(lundiDe(new Date('2026-09-22T12:00:00+02:00')).getDate()).toBe(21);
    expect(lundiDe(new Date('2026-09-20T23:30:00+02:00')).getDate()).toBe(14);
    expect(lundiDe(new Date('2026-09-21T00:10:00+02:00')).getDate()).toBe(21);
});

test('par etat, par nature, par campus, ouverts', () => {
    const c = compteurs([
        retour('2026-09-21T10:00:00Z', 'nouveau', 'bug', 'Inspe'),
        retour('2026-09-21T11:00:00Z', 'en_attente', 'campus', 'Inspe'),
        retour('2026-09-15T11:00:00Z', 'traite', 'campus', 'Montaigne'),
        retour('2026-07-01T11:00:00Z', 'refuse', 'autre', null),
    ], MAINTENANT, OUVERTS);
    expect(c.total).toBe(4);
    expect(c.ouverts).toBe(2);
    expect(c.parEtat).toEqual({ nouveau: 1, en_attente: 1, traite: 1, refuse: 1 });
    expect(c.parNature).toEqual({ bug: 1, campus: 2, autre: 1 });
    expect(c.parCampus).toEqual([{ campus: 'Inspe', n: 2 }, { campus: 'Montaigne', n: 1 }]);
});

test('huit semaines, la courante en dernier, les anciennes hors fenetre ignorees', () => {
    const c = compteurs([
        retour('2026-09-21T10:00:00Z', 'nouveau', 'bug', null),
        retour('2026-09-20T22:30:00Z', 'nouveau', 'bug', null),
        retour('2026-07-01T11:00:00Z', 'nouveau', 'bug', null),
    ], MAINTENANT, OUVERTS);
    expect(c.parSemaine).toHaveLength(8);
    expect(c.parSemaine[7]).toEqual({ debut: '2026-09-21', n: 2 });
    expect(c.parSemaine[6]).toEqual({ debut: '2026-09-14', n: 0 });
    expect(c.parSemaine[0]?.debut).toBe('2026-08-03');
});
