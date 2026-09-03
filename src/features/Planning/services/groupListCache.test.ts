/**
 * Le comportement des deux caches reconcilies, fige avant de les fondre (6.1-C) : sept jours pour le
 * manager, le cache date en repli pour l'ecran, et une liste fraiche qui efface la date.
 */

import { describe, expect, it } from 'vitest';

import { LIMITE_CACHE_GROUPES_MS, doitRafraichir, formeAffichee, lireCache } from './groupListCache';

const JOUR = 24 * 60 * 60 * 1000;

describe('lireCache', () => {
    it('lit une liste et son horodatage', () => {
        expect(lireCache('["A","B"]', '1000')).toEqual({ liste: ['A', 'B'], horodatage: 1000 });
    });

    it('rend un cache absent pour un magasin vide, illisible ou d\'une autre forme', () => {
        expect(lireCache(null, null)).toEqual({ liste: [], horodatage: null });
        expect(lireCache('{pas du json', 'abc')).toEqual({ liste: [], horodatage: null });
        expect(lireCache('{"list":[{"name":"A"}]}', '12')).toEqual({ liste: [], horodatage: 12 });
    });

    it('ne garde que les chaines d\'une liste melangee', () => {
        expect(lireCache('["A", 3, null, "B"]', null).liste).toEqual(['A', 'B']);
    });
});

describe('doitRafraichir', () => {
    it('redemande une liste absente ou sans date', () => {
        expect(doitRafraichir({ liste: [], horodatage: 1000 }, 2000)).toBe(true);
        expect(doitRafraichir({ liste: ['A'], horodatage: null }, 2000)).toBe(true);
    });

    it('garde une liste plus jeune que sept jours, redemande au-dela', () => {
        const cache = { liste: ['A'], horodatage: 0 };
        expect(doitRafraichir(cache, 6 * JOUR)).toBe(false);
        expect(doitRafraichir(cache, LIMITE_CACHE_GROUPES_MS)).toBe(true);
    });
});

describe('formeAffichee', () => {
    const cache = { liste: ['A'], horodatage: 1000 };

    it('prefere la liste fraiche, sans date, meme si un cache existe', () => {
        expect(formeAffichee(cache, ['B'])).toEqual({ liste: ['B'], dateCache: null });
    });

    it('replie sur le cache avec sa date quand la source n\'a rien rendu, quel que soit son age', () => {
        expect(formeAffichee(cache, null)).toEqual({ liste: ['A'], dateCache: 1000 });
    });

    it('ne rend rien quand il n\'y a ni reponse ni cache', () => {
        expect(formeAffichee({ liste: [], horodatage: null }, null)).toBeNull();
    });
});
