/**
 * La traduction d'un lien de feuille en adresse d'export. Aucun reseau ici.
 */

import { describe, expect, it } from 'vitest';

import { urlDExport } from './source.mjs';

const ID = '1gTraGWohg4xap6Sp_GyQ0bz8idg-OgKo0Pkbxy7ToqQ';

describe('urlDExport', () => {
    it('traduit le lien de partage', () => {
        expect(urlDExport(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`))
            .toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`);
    });

    it('garde l onglet du lien', () => {
        expect(urlDExport(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing#gid=123`))
            .toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=123`);
        expect(urlDExport(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=7#gid=7`))
            .toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=7`);
    });

    it('laisse une adresse d export telle quelle', () => {
        const export_ = `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=0`;
        expect(urlDExport(export_)).toBe(export_);
    });

    it('laisse une adresse quelconque telle quelle', () => {
        expect(urlDExport(' https://exemple.test/reponses.csv ')).toBe('https://exemple.test/reponses.csv');
    });
});
