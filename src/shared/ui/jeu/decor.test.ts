/** Ce que le decor doit tenir : une periode exacte, une boucle sans saut, un chemin ferme. */

import { describe, expect, it } from 'vitest';

import { decalageDuDecor, largeurDUnePeriode, PERIODE_DU_DECOR, silhouetteDuCampus } from './decor';

describe('le decor du jeu', () => {
    it('remplit exactement une periode, pour que le glissement retombe sur son depart', () => {
        expect(largeurDUnePeriode()).toBe(PERIODE_DU_DECOR);
    });

    it('dessine le nombre de periodes demande, ferme sur l horizon', () => {
        const chemin = silhouetteDuCampus(3);
        expect(chemin.startsWith('M0 ')).toBe(true);
        expect(chemin.endsWith('Z')).toBe(true);
        expect(chemin).toContain(`L${3 * PERIODE_DU_DECOR} `);
        expect(chemin).not.toContain(`L${4 * PERIODE_DU_DECOR} `);
    });

    it('defile sans jamais depasser une periode, plus lentement que l horizon', () => {
        expect(decalageDuDecor(0, 0.3)).toBeCloseTo(0);
        expect(decalageDuDecor(1000, 0.3)).toBeCloseTo(-(300 % PERIODE_DU_DECOR));
        expect(decalageDuDecor(1200, 0.3)).toBeLessThanOrEqual(0);
        expect(decalageDuDecor(1200, 0.3)).toBeGreaterThan(-PERIODE_DU_DECOR);
    });
});
