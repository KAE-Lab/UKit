/** Ce que la direction d'un glissement doit tenir : seuils, sens, bornes, sens de lecture. */

import { describe, expect, it } from 'vitest';

import { SEUIL_DISTANCE, SEUIL_VITESSE, directionDuGlissement } from './directionDuGlissement';

describe('directionDuGlissement', () => {
    it('ne compte ni un geste court et lent, ni rien du tout', () => {
        expect(directionDuGlissement(-SEUIL_DISTANCE + 1, -SEUIL_VITESSE + 1, 1, 4)).toBe(0);
        expect(directionDuGlissement(0, 0, 1, 4)).toBe(0);
    });

    it('compte un geste long ou un geste vif, vers la gauche pour le suivant', () => {
        expect(directionDuGlissement(-SEUIL_DISTANCE, 0, 1, 4)).toBe(1);
        expect(directionDuGlissement(-10, -SEUIL_VITESSE, 1, 4)).toBe(1);
        expect(directionDuGlissement(SEUIL_DISTANCE, 0, 1, 4)).toBe(-1);
        expect(directionDuGlissement(0, SEUIL_VITESSE, 1, 4)).toBe(-1);
    });

    it('ne boucle pas aux extremites', () => {
        expect(directionDuGlissement(SEUIL_DISTANCE, 0, 0, 4)).toBe(0);
        expect(directionDuGlissement(-SEUIL_DISTANCE, 0, 3, 4)).toBe(0);
    });

    it('inverse le sens en lecture de droite a gauche', () => {
        expect(directionDuGlissement(-SEUIL_DISTANCE, 0, 1, 4, true)).toBe(-1);
    });
});
