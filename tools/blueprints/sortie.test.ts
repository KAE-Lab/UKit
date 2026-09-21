/**
 * Le socle sorti : ce que le manifeste annonce, et ce qu'il laisse a la sortie.
 * Les cas portent l'etat reel du 2026-09-21 : un depot a jour face a son propre tag.
 */

import { describe, expect, it } from 'vitest';

import { construireManifeste } from './socle.mjs';
import { batLeSocle, comparerVersions, tagLePlusRecent, versionsDuSocle } from './sortie.mjs';

const SOCLE_6_2_2 = versionsDuSocle(
    JSON.stringify({
        'ukit.celcat.jour': { version: '4' },
        'ukit.celcat.semaine': { version: '5' },
        'ukit.portail.bordeaux.dossier': { version: '7' },
    }),
);

const entree = (nom: string, version: string) => ({ nom, version, fichier: `${nom}.blueprint.json`, sha256: 'a'.repeat(64) });

describe('comparerVersions', () => {
    it('compare numeriquement, pas lexicalement', () => {
        expect(comparerVersions('10', '9')).toBe(1);
        expect(comparerVersions('1.2', '1.10')).toBe(-1);
    });

    it('tient une composante absente pour zero', () => {
        expect(comparerVersions('1.2', '1.2.0')).toBe(0);
        expect(comparerVersions('1.2.1', '1.2')).toBe(1);
    });
});

describe('tagLePlusRecent', () => {
    it('choisit la version la plus haute, pas la derniere ecrite', () => {
        expect(tagLePlusRecent(['v6.2.1', 'v6.10.0', 'v6.2.2', ''])).toBe('v6.10.0');
    });

    it('ignore ce qui n a pas la forme d une sortie', () => {
        expect(tagLePlusRecent(['main', 'v6.2', 'v0.5.8-rc1', 'release'])).toBe('v6.2');
        expect(tagLePlusRecent(['main', 'docs/plan'])).toBeNull();
    });
});

describe('versionsDuSocle', () => {
    it('ne garde que la version, sous forme de chaine', () => {
        expect(SOCLE_6_2_2).toEqual({
            'ukit.celcat.jour': '4',
            'ukit.celcat.semaine': '5',
            'ukit.portail.bordeaux.dossier': '7',
        });
    });
});

describe('batLeSocle', () => {
    it('une version egale au socle sorti n a rien a annoncer', () => {
        expect(batLeSocle(entree('ukit.celcat.jour', '4'), SOCLE_6_2_2)).toBe(false);
    });

    it('une version superieure corrige le socle sorti', () => {
        expect(batLeSocle(entree('ukit.celcat.jour', '5'), SOCLE_6_2_2)).toBe(true);
    });

    it('un nom hors socle est toujours annonce', () => {
        expect(batLeSocle(entree('ukit.portail.montaigne.dossier', '1'), SOCLE_6_2_2)).toBe(true);
    });
});

describe('construireManifeste face au socle sorti', () => {
    const socle = [
        entree('ukit.celcat.jour', '4'),
        entree('ukit.celcat.semaine', '6'),
        entree('ukit.portail.montaigne.dossier', '1'),
    ];

    it('omet ce que la sortie embarque deja, annonce le reste', () => {
        const manifeste = construireManifeste(socle, { socleSorti: SOCLE_6_2_2 });
        expect(Object.keys(manifeste.blueprints)).toEqual(['ukit.celcat.semaine', 'ukit.portail.montaigne.dossier']);
        expect(manifeste.blueprints['ukit.celcat.semaine']).toMatchObject({ version: '6', url: 'ukit.celcat.semaine.blueprint.json' });
    });

    it('est vide quand le depot est exactement la sortie', () => {
        const aJour = [entree('ukit.celcat.jour', '4'), entree('ukit.celcat.semaine', '5')];
        expect(construireManifeste(aJour, { socleSorti: SOCLE_6_2_2 }).blueprints).toEqual({});
    });

    it('sans socle sorti, annonce tout, comme avant', () => {
        expect(Object.keys(construireManifeste(socle).blueprints)).toHaveLength(3);
    });

    it('garde la desactivation d une entree annoncee', () => {
        const manifeste = construireManifeste(socle, { socleSorti: SOCLE_6_2_2, desactives: ['ukit.celcat.semaine'] });
        expect(manifeste.blueprints['ukit.celcat.semaine'].disabled).toBe(true);
    });
});
