/**
 * Le lecteur CSV, sur ce que Google Sheets ecrit vraiment : guillemets, sauts de ligne dans une
 * cellule, fins de ligne CRLF, et une derniere ligne sans saut final.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyserCsv, enregistrementsDe } from './csv.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const FEUILLE = join(ICI, 'exports/feuille-2026-09-07.csv');
const FICHIER = join(ICI, 'exports/formulaire-2026-09-06.csv');

describe('analyserCsv', () => {
    it('lit des cellules simples', () => {
        expect(analyserCsv('a,b,c\n1,2,3\n')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    });

    it('garde une virgule entre guillemets', () => {
        expect(analyserCsv('"a,b",c')).toEqual([['a,b', 'c']]);
    });

    it('lit un guillemet double comme un guillemet', () => {
        expect(analyserCsv('"dit ""bonjour""",x')).toEqual([['dit "bonjour"', 'x']]);
    });

    it('garde un saut de ligne dans une cellule, ramene a LF', () => {
        expect(analyserCsv('"1. a\r\n2. b",x\r\ny,z')).toEqual([['1. a\n2. b', 'x'], ['y', 'z']]);
        expect(analyserCsv('"1. a\n2. b",x')).toEqual([['1. a\n2. b', 'x']]);
    });

    it('accepte CRLF, un BOM et une derniere ligne sans saut', () => {
        expect(analyserCsv('\uFEFFa,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('ignore une ligne vide finale et garde une cellule vide entre deux', () => {
        expect(analyserCsv('a,,c\n\n')).toEqual([['a', '', 'c']]);
    });

    it('refuse un guillemet jamais ferme', () => {
        expect(() => analyserCsv('"a,b')).toThrow(/tronque/);
    });
});

describe('enregistrementsDe', () => {
    it('trime les en-tetes et complete une ligne courte', () => {
        const { entetes, enregistrements } = enregistrementsDe([[' a ', 'b', 'c'], ['1']]);
        expect(entetes).toEqual(['a', 'b', 'c']);
        expect(enregistrements).toEqual([['1', '', '']]);
    });

    it('refuse une ligne trop longue, numerotee comme dans la feuille', () => {
        expect(() => enregistrementsDe([['a'], ['1'], ['1', '2']])).toThrow(/ligne 3 : 2 cellules pour 1 en-tetes/);
    });

    it('rend vide sans en-tete', () => {
        expect(enregistrementsDe([])).toEqual({ entetes: [], enregistrements: [] });
    });
});

describe('les exports reels', () => {
    it.skipIf(!existsSync(FEUILLE))('l export de la feuille par son adresse : 22 reponses, 18 questions', () => {
        const { entetes, enregistrements } = enregistrementsDe(analyserCsv(readFileSync(FEUILLE, 'utf8')));
        expect(entetes).toHaveLength(18);
        expect(entetes[0]).toBe('Timestamp');
        expect(enregistrements).toHaveLength(22);
        expect(enregistrements.every((ligne) => ligne.length === 18)).toBe(true);
        expect(enregistrements.some((ligne) => ligne.some((cellule) => cellule.includes('\n')))).toBe(true);
    });

    it.skipIf(!existsSync(FICHIER))('le fichier telecharge le 2026-09-06 : 16 reponses', () => {
        const { entetes, enregistrements } = enregistrementsDe(analyserCsv(readFileSync(FICHIER, 'utf8')));
        expect(entetes).toHaveLength(18);
        expect(enregistrements).toHaveLength(16);
    });
});
