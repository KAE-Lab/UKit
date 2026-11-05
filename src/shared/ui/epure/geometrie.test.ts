/** Les nombres de l'Epure dans l'application : ceux du kit, rien d'invente. */

import { describe, expect, it } from 'vitest';

import { BOITE_DU_LOGO, BOITE_DU_U, TRACE_DU_LOGO, TRACE_DU_U } from './geometrie';

describe('les traces', () => {
    it('prend le U comme premier sous-trace du logo', () => {
        expect(TRACE_DU_LOGO.startsWith(TRACE_DU_U)).toBe(true);
        expect(TRACE_DU_U.endsWith('Z')).toBe(true);
    });

    it('cadre le U dans le debut de la boite du logo', () => {
        expect(BOITE_DU_U.x + BOITE_DU_U.largeur).toBeLessThan(BOITE_DU_LOGO.largeur / 2);
        expect(BOITE_DU_U.y + BOITE_DU_U.hauteur).toBeGreaterThanOrEqual(BOITE_DU_LOGO.hauteur);
    });
});
