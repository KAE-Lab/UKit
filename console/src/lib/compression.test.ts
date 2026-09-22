/**
 * Les dimensions de compression : le grand cote borne au palier du dossier, jamais agrandi.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { dimensionsCible, grandCoteVise } from './compression';

test('le grand cote vise depend du dossier, avec un defaut', () => {
    expect(grandCoteVise('annonces')).toBe(1080);
    expect(grandCoteVise('etablissements')).toBe(1280);
    expect(grandCoteVise('visuels')).toBe(1200);
});

test('une image trop grande est reduite en gardant son ratio', () => {
    expect(dimensionsCible({ largeur: 3000, hauteur: 2000 }, 1200)).toEqual({ largeur: 1200, hauteur: 800 });
    expect(dimensionsCible({ largeur: 1081, hauteur: 1351 }, 1080)).toEqual({ largeur: 864, hauteur: 1080 });
});

test('une image plus petite que le palier reste telle quelle', () => {
    expect(dimensionsCible({ largeur: 500, hauteur: 624 }, 1080)).toEqual({ largeur: 500, hauteur: 624 });
    expect(dimensionsCible({ largeur: 0, hauteur: 0 }, 1080)).toEqual({ largeur: 0, hauteur: 0 });
});
