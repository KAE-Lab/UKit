/**
 * L'ordre des annonces : les epinglees, les creneaux, la priorite, la rotation par heure.
 *
 * Le fuseau du harnais est fixe a Europe/Paris (vitest.config.ts) ; les instants sont ecrits avec
 * leur decalage pour que le test dise l'heure de Paris qu'il vise, pas celle du poste.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { creneauActif, instantDeParis, lireCreneaux, minutesDe, ordonner, projeterOrdre, type ParametresDOrdre } from './ordre';

/** Lundi 5 octobre 2026, 12 h 30 a Paris (heure d'ete, UTC+2). */
const LUNDI_MIDI = new Date('2026-10-05T12:30:00+02:00');
const LUNDI_13H30 = new Date('2026-10-05T13:30:00+02:00');
const LUNDI_14H = new Date('2026-10-05T14:00:00+02:00');

const MIDI: ParametresDOrdre['creneaux'] = [{ jours: [1, 2, 3, 4, 5], de: '11:00', a: '14:00' }];

function annonce(id: string, options: Partial<Omit<ParametresDOrdre, 'id'>> = {}): ParametresDOrdre {
    return { id, epinglee: false, priorite: 0, creneaux: [], ...options };
}

const identite = (a: ParametresDOrdre) => a;
const ids = (liste: readonly ParametresDOrdre[]) => liste.map((a) => a.id);

test('l heure de Paris se lit quel que soit le decalage ecrit', () => {
    expect(instantDeParis(LUNDI_MIDI)).toEqual({ jour: 1, minutes: 12 * 60 + 30 });
    expect(instantDeParis(new Date('2026-10-05T10:30:00Z'))).toEqual({ jour: 1, minutes: 12 * 60 + 30 });
    // Un dimanche, en heure d'hiver : 22 h 05 a Paris.
    expect(instantDeParis(new Date('2026-12-06T21:05:00Z'))).toEqual({ jour: 7, minutes: 22 * 60 + 5 });
});

test('les heures se lisent en HH:MM strict', () => {
    expect(minutesDe('11:00')).toBe(660);
    expect(minutesDe('23:59')).toBe(1439);
    expect(minutesDe('24:00')).toBeNull();
    expect(minutesDe('9:00')).toBeNull();
    expect(minutesDe(11)).toBeNull();
});

test('la lecture des creneaux ignore ce qui est malforme et ordonne les jours', () => {
    expect(lireCreneaux([
        { jours: [3, 1, 1, 9, 'x'], de: '11:00', a: '14:00' },
        { jours: [], de: '11:00', a: '14:00' },
        { jours: [1], de: '11h', a: '14:00' },
        'rien',
        null,
    ])).toEqual([{ jours: [1, 3], de: '11:00', a: '14:00' }]);
    expect(lireCreneaux(null)).toEqual([]);
    expect(lireCreneaux('[]')).toEqual([]);
});

test('la projection lit les trois colonnes avec leurs defauts', () => {
    expect(projeterOrdre({ id: 'a' })).toEqual({ id: 'a', epinglee: false, priorite: 0, creneaux: [] });
    expect(projeterOrdre({ id: 'a', epinglee: true, priorite: 3, creneaux: MIDI })).toEqual({ id: 'a', epinglee: true, priorite: 3, creneaux: MIDI });
    expect(projeterOrdre({ id: 'a', epinglee: 'oui', priorite: '3' }).epinglee).toBe(false);
    expect(projeterOrdre({ id: 'a', priorite: Number.NaN }).priorite).toBe(0);
});

test('un creneau est actif de son debut inclus a sa fin exclue, les jours coches seulement', () => {
    expect(creneauActif(MIDI, instantDeParis(LUNDI_MIDI))).toBe(true);
    expect(creneauActif(MIDI, { jour: 1, minutes: 11 * 60 })).toBe(true);
    expect(creneauActif(MIDI, instantDeParis(LUNDI_14H))).toBe(false);
    expect(creneauActif(MIDI, { jour: 6, minutes: 12 * 60 })).toBe(false);
    expect(creneauActif([{ jours: [1], de: '12:00', a: '12:00' }], { jour: 1, minutes: 12 * 60 })).toBe(false);
});

test('une plage qui passe minuit couvre le soir du jour coche et la nuit qui suit', () => {
    const soiree = [{ jours: [5], de: '22:00', a: '02:00' }];
    expect(creneauActif(soiree, { jour: 5, minutes: 23 * 60 })).toBe(true);
    expect(creneauActif(soiree, { jour: 6, minutes: 1 * 60 })).toBe(true);
    expect(creneauActif(soiree, { jour: 6, minutes: 2 * 60 })).toBe(false);
    expect(creneauActif(soiree, { jour: 5, minutes: 1 * 60 })).toBe(false);
});

test('les epinglees passent devant, puis le creneau actif, puis la priorite', () => {
    const liste = [
        annonce('prioritaire', { priorite: 5 }),
        annonce('midi', { creneaux: MIDI }),
        annonce('epinglee', { epinglee: true }),
        annonce('ordinaire'),
    ];
    expect(ids(ordonner(liste, LUNDI_MIDI, identite))).toEqual(['epinglee', 'midi', 'prioritaire', 'ordinaire']);
    // A 14 h, le creneau est passe : la priorite reprend la main.
    expect(ids(ordonner(liste, LUNDI_14H, identite))).toEqual(['epinglee', 'prioritaire', 'midi', 'ordinaire']);
});

test('a egalite, le groupe tourne d une place par heure et revient a son point de depart', () => {
    const liste = [annonce('c'), annonce('a'), annonce('b')];
    const a12 = ids(ordonner(liste, LUNDI_MIDI, identite));
    const a13 = ids(ordonner(liste, LUNDI_13H30, identite));
    const a15 = ids(ordonner(liste, new Date('2026-10-05T15:30:00+02:00'), identite));
    expect([...a12].sort()).toEqual(['a', 'b', 'c']);
    expect(a13).not.toEqual(a12);
    expect(a13[0]).toBe(a12[1]);
    expect(a15).toEqual(a12);
});

test('la rotation est deterministe : meme entree, meme instant, meme sortie, quel que soit l ordre d arrivee', () => {
    const liste = [annonce('b'), annonce('a'), annonce('c')];
    const melangee = [annonce('c'), annonce('b'), annonce('a')];
    expect(ids(ordonner(liste, LUNDI_MIDI, identite))).toEqual(ids(ordonner(melangee, LUNDI_MIDI, identite)));
    expect(ids(ordonner(liste, LUNDI_MIDI, identite))).toEqual(ids(ordonner(liste, new Date(LUNDI_MIDI.getTime() + 60_000), identite)));
});

test('la rotation ne melange pas les groupes : les epinglees tournent entre elles', () => {
    const liste = [annonce('e1', { epinglee: true }), annonce('e2', { epinglee: true }), annonce('o1'), annonce('o2')];
    for (const instant of [LUNDI_MIDI, LUNDI_13H30]) {
        const ordre = ids(ordonner(liste, instant, identite));
        expect(ordre.slice(0, 2).sort()).toEqual(['e1', 'e2']);
        expect(ordre.slice(2).sort()).toEqual(['o1', 'o2']);
    }
});

test('une liste vide ou d un seul element se rend telle quelle', () => {
    expect(ordonner([], LUNDI_MIDI, identite)).toEqual([]);
    expect(ids(ordonner([annonce('seule')], LUNDI_MIDI, identite))).toEqual(['seule']);
});
