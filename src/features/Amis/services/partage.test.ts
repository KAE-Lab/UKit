/** Ce qui part : des groupes publics un par un et relisibles, un instantane sinon (relecture du lot). */

import { describe, expect, it } from 'vitest';

import { partageParGroupes } from './partage';

const base = { source: 'ical' as const, etablissement: 'bordeaux-inp', favoris: ['ENSC 1A'], filtres: [], groupesPublics: ['ENSC 1A', 'ENSC 2A'] };

describe('partageParGroupes', () => {
    it('part en groupes quand chaque favori est au referentiel publie', () => {
        expect(partageParGroupes(base)).toEqual({ genre: 'groupes', groupes: ['ENSC 1A'], filtres: [] });
    });

    it('ne fait jamais partir le favori personnel, meme quand la table personnelle est vide', () => {
        // Le favori personnel est le nom lu dans le dossier : absent du referentiel publie.
        expect(partageParGroupes({ ...base, favoris: ['ENSC 1A', 'Etudiant Essai'] })).toBeNull();
    });

    it('part en instantane pour un abonnement, et rien sans favori', () => {
        expect(partageParGroupes({ ...base, source: 'abonnement' })).toBeNull();
        expect(partageParGroupes({ ...base, favoris: [] })).toBeNull();
    });

    it('accepte tout favori Celcat, dont la liste est vivante', () => {
        expect(partageParGroupes({ ...base, source: 'celcat', etablissement: 'bordeaux', favoris: ['INF501A1'], groupesPublics: null })?.genre).toBe('groupes');
    });

    it('passe a l instantane quand le lien ne se relirait pas', () => {
        const onze = Array.from({ length: 11 }, (_, i) => `G${i}`);
        expect(partageParGroupes({ ...base, source: 'celcat', favoris: onze, groupesPublics: null })).toBeNull();
        expect(partageParGroupes({ ...base, source: 'celcat', favoris: ['A'.repeat(81)], groupesPublics: null })).toBeNull();
        expect(partageParGroupes({ ...base, filtres: ['4TIN 501U'] })).toBeNull();
        expect(partageParGroupes({ ...base, filtres: Array.from({ length: 41 }, (_, i) => `UE${i}`) })).toBeNull();
    });
});
