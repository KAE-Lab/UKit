/**
 * La file : l'heure locale, la fusion par identite, la relecture defensive, les lots, la borne et la
 * soustraction apres un envoi. Le fuseau Europe/Paris est celui de vitest.config.ts.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import {
    borner,
    fusionner,
    jourEtHeure,
    ligneDe,
    LIGNES_MAX,
    lireFile,
    lireReponse,
    lots,
    soustraire,
    TAILLE_LOT,
    type ContexteDeMesure,
    type LigneDeMesure,
} from './file';

const CONTEXTE: ContexteDeMesure = { campus: 'bordeaux', version: '6.3.0', plateforme: 'ios', testeur: false };
/** 12:30 a Paris, en septembre. */
const A_MIDI = new Date('2026-09-21T10:30:00Z');

test('le jour et l heure sont ceux de l appareil, pas ceux d UTC', () => {
    expect(jourEtHeure(A_MIDI)).toEqual({ jour: '2026-09-21', heure: 12 });
    // 23:30 UTC le 21 est deja le 22 a Paris : c'est pour cela que la base accepte « demain ».
    expect(jourEtHeure(new Date('2026-09-21T23:30:00Z'))).toEqual({ jour: '2026-09-22', heure: 1 });
    // Et en hiver, une heure de moins.
    expect(jourEtHeure(new Date('2026-12-21T23:30:00Z'))).toEqual({ jour: '2026-12-22', heure: 0 });
});

test('la granularite decide de l heure : -1 pour le jour entier', () => {
    expect(ligneDe('session', '', CONTEXTE, A_MIDI)).toEqual({
        jour: '2026-09-21', heure: 12, evenement: 'session', cle: '', campus: 'bordeaux', version: '6.3.0', plateforme: 'ios', testeur: false, n: 1,
    });
    expect(ligneDe('annonce.ouverture', 'abc', CONTEXTE, A_MIDI)).toMatchObject({ heure: -1, cle: 'abc' });
});

test('la meme identite fait monter n, une autre s ajoute', () => {
    const session = ligneDe('session', '', CONTEXTE, A_MIDI);
    let file = fusionner([], session);
    file = fusionner(file, session);
    expect(file).toEqual([{ ...session, n: 2 }]);
    file = fusionner(file, ligneDe('session', '', CONTEXTE, new Date('2026-09-21T11:30:00Z')));
    expect(file).toHaveLength(2);
    file = fusionner(file, ligneDe('session', '', { ...CONTEXTE, testeur: true }, A_MIDI));
    expect(file).toHaveLength(3);
});

test('la memoire se relit defensivement', () => {
    const ligne = ligneDe('onglet.vu', 'campus', CONTEXTE, A_MIDI);
    expect(lireFile(null)).toEqual([]);
    expect(lireFile('pas du json')).toEqual([]);
    expect(lireFile('{"a":1}')).toEqual([]);
    const fausses = [{ ...ligne, evenement: 'inconnu' }, { ...ligne, n: 0 }, { ...ligne, heure: 24 }, { ...ligne, plateforme: 'tv' }, 'x'];
    expect(lireFile(JSON.stringify([ligne, ...fausses]))).toEqual([ligne]);
});

test('les lots font deux cents lignes au plus, dans l ordre', () => {
    const lignes = Array.from({ length: TAILLE_LOT + 1 }, (_, i) => ligneDe('annonce.impression', `id-${i}`, CONTEXTE, A_MIDI));
    expect(lots([])).toEqual([]);
    expect(lots(lignes.slice(0, TAILLE_LOT))).toHaveLength(1);
    const deux = lots(lignes);
    expect(deux.map((lot) => lot.length)).toEqual([TAILLE_LOT, 1]);
    expect(deux[1][0].cle).toBe(`id-${TAILLE_LOT}`);
});

test('la borne fait partir les jours les plus anciens d abord', () => {
    const anciennes = Array.from({ length: 10 }, (_, i) => ligneDe('annonce.impression', `vieux-${i}`, CONTEXTE, new Date('2026-09-01T10:00:00Z')));
    const recentes = Array.from({ length: LIGNES_MAX - 5 }, (_, i) => ligneDe('annonce.impression', `neuf-${i}`, CONTEXTE, A_MIDI));
    // Les anciennes en fin de file : c'est le jour qui compte, pas la position.
    const bornee = borner([...recentes, ...anciennes]);
    expect(bornee).toHaveLength(LIGNES_MAX);
    expect(bornee.filter((l) => l.jour === '2026-09-01')).toHaveLength(5);
    expect(bornee.filter((l) => l.jour === '2026-09-21')).toHaveLength(LIGNES_MAX - 5);
    expect(borner(recentes)).toEqual(recentes);
});

test('soustraire retire ce qui est parti et garde ce qui a ete compte pendant l envoi', () => {
    const session = ligneDe('session', '', CONTEXTE, A_MIDI);
    const planning = ligneDe('onglet.vu', 'planning', CONTEXTE, A_MIDI);
    const campus = ligneDe('onglet.vu', 'campus', CONTEXTE, A_MIDI);
    const envoyees: LigneDeMesure[] = [{ ...session, n: 2 }, planning];
    // Pendant l'envoi : une session de plus, et un onglet nouveau.
    const file = [{ ...session, n: 3 }, planning, campus];
    expect(soustraire(file, envoyees)).toEqual([{ ...session, n: 1 }, campus]);
    expect(soustraire(envoyees, envoyees)).toEqual([]);
});

test('la reponse de la base se relit defensivement', () => {
    expect(lireReponse({ comptes: 3, rejetes: 1 })).toEqual({ comptes: 3, rejetes: 1 });
    expect(lireReponse({ comptes: '3' })).toBeNull();
    expect(lireReponse(null)).toBeNull();
    expect(lireReponse('ok')).toBeNull();
});
