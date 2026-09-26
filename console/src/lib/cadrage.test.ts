/**
 * Le cadrage par la focale : la position CSS, la zone que le cadre 4:5 garde, le point sous le
 * pointeur mesure dans la boite de l'image.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { focaleDepuisPointeur, positionDeFocale, RATIO_CARTE, zoneGardee } from './cadrage';

test('la focale devient une position CSS', () => {
    expect(positionDeFocale({ x: 0.5, y: 0.3 })).toBe('50% 30%');
    expect(positionDeFocale({ x: 0.797, y: 0.898 })).toBe('80% 90%');
});

test('une image plus large que le cadre perd ses bords, selon la focale', () => {
    // Un carre dans un cadre 4:5 : on garde 80 % de la largeur.
    expect(zoneGardee(1, { x: 0.5, y: 0.3 }, RATIO_CARTE)).toEqual({ gauche: 0.09999999999999998, haut: 0, largeur: 0.8, hauteur: 1 });
    expect(zoneGardee(1, { x: 0, y: 0.3 }, RATIO_CARTE).gauche).toBe(0);
    expect(zoneGardee(1, { x: 1, y: 0.3 }, RATIO_CARTE).gauche).toBeCloseTo(0.2);
    // Une banniere 16:9 : on n'en garde qu'une bande.
    expect(zoneGardee(16 / 9, { x: 0.5, y: 0.5 }, RATIO_CARTE).largeur).toBeCloseTo(0.45);
});

test('une image plus haute que le cadre perd le haut et le bas, selon la focale', () => {
    const story = zoneGardee(9 / 16, { x: 0.5, y: 0.3 }, RATIO_CARTE);
    expect(story.largeur).toBe(1);
    expect(story.hauteur).toBeCloseTo(0.703125);
    expect(story.haut).toBeCloseTo(0.3 * (1 - 0.703125));
});

test('une affiche exactement 4:5 est gardee entiere, et un ratio illisible aussi', () => {
    expect(zoneGardee(RATIO_CARTE, { x: 0.9, y: 0.9 }, RATIO_CARTE)).toEqual({ gauche: 0, haut: 0, largeur: 1, hauteur: 1 });
    expect(zoneGardee(0, { x: 0.5, y: 0.5 }, RATIO_CARTE)).toEqual({ gauche: 0, haut: 0, largeur: 1, hauteur: 1 });
    expect(zoneGardee(Number.NaN, { x: 0.5, y: 0.5 }, RATIO_CARTE).largeur).toBe(1);
});

test('le point sous le pointeur se mesure dans la boite de l image, borne a l image', () => {
    const boite = { left: 100, top: 50, width: 256, height: 320 };
    expect(focaleDepuisPointeur(100 + 0.8 * 256, 50 + 0.9 * 320, boite)).toEqual({ x: 0.8, y: 0.9 });
    expect(focaleDepuisPointeur(0, 0, boite)).toEqual({ x: 0, y: 0 });
    expect(focaleDepuisPointeur(9999, 9999, boite)).toEqual({ x: 1, y: 1 });
    expect(focaleDepuisPointeur(10, 10, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
});
