/**
 * Ce que le curseur ne doit jamais faire : rendre une valeur hors bornes, tomber entre deux crans, ou
 * produire un `NaN` avant d'avoir ete mesure. Les trois sont invisibles a la relecture et visibles a
 * l'usage — une notification programmee a la mauvaise minute, une poignee qui disparait.
 */

import { describe, expect, it } from 'vitest';

import {
    arrondirAuPas,
    borner,
    bornerPosition,
    pasSuivant,
    positionDepuisValeur,
    valeurDepuisPosition,
    type EchelleDeCurseur,
} from './echelleDeCurseur';

/** Celle des Reglages : le delai d'un rappel de cours, de 5 a 60 minutes par pas de 5. */
const RAPPELS: EchelleDeCurseur = { min: 5, max: 60, pas: 5 };

describe('borner', () => {
    it('ramene aux bornes, et laisse passer ce qui est dedans', () => {
        expect(borner(0, RAPPELS)).toBe(5);
        expect(borner(120, RAPPELS)).toBe(60);
        expect(borner(25, RAPPELS)).toBe(25);
    });
});

describe('arrondirAuPas', () => {
    it('choisit le cran le plus proche', () => {
        expect(arrondirAuPas(12, RAPPELS)).toBe(10);
        expect(arrondirAuPas(13, RAPPELS)).toBe(15);
    });

    it('ne sort jamais des bornes, meme en arrondissant vers l exterieur', () => {
        expect(arrondirAuPas(62, RAPPELS)).toBe(60);
        expect(arrondirAuPas(-4, RAPPELS)).toBe(5);
    });

    it('compte depuis le minimum, pas depuis zero', () => {
        // Un minimum qui n'est pas un multiple du pas : les crans sont 3, 8, 13 — jamais 0, 5, 10.
        const decalee: EchelleDeCurseur = { min: 3, max: 18, pas: 5 };
        expect(arrondirAuPas(7, decalee)).toBe(8);
        expect(arrondirAuPas(12, decalee)).toBe(13);
    });
});

describe('position et valeur', () => {
    it('fait un aller-retour fidele aux deux extremites et au milieu', () => {
        const course = 220;
        for (const valeur of [5, 30, 60]) {
            const x = positionDepuisValeur(valeur, course, RAPPELS);
            expect(valeurDepuisPosition(x, course, RAPPELS)).toBe(valeur);
        }
    });

    it('pose le minimum a gauche et le maximum a droite', () => {
        expect(positionDepuisValeur(5, 220, RAPPELS)).toBe(0);
        expect(positionDepuisValeur(60, 220, RAPPELS)).toBe(220);
    });

    it('couvre les douze crans de l echelle des rappels', () => {
        const course = 220;
        const crans = new Set<number>();
        for (let x = 0; x <= course; x += 1) crans.add(valeurDepuisPosition(x, course, RAPPELS));
        expect(crans.size).toBe(12);
        expect(Math.min(...crans)).toBe(5);
        expect(Math.max(...crans)).toBe(60);
    });

    it('**survit a une course nulle**, c est-a-dire avant la premiere mesure', () => {
        // Le premier rendu precede `onLayout` : sans cette garde, la division rendait un `NaN` que
        // le style propageait, et la poignee disparaissait au lieu de se poser a gauche.
        expect(positionDepuisValeur(30, 0, RAPPELS)).toBe(0);
        expect(valeurDepuisPosition(120, 0, RAPPELS)).toBe(5);
    });

    it('garde la poignee sur sa piste', () => {
        expect(bornerPosition(-30, 220)).toBe(0);
        expect(bornerPosition(400, 220)).toBe(220);
        expect(bornerPosition(110, 220)).toBe(110);
    });
});

describe('pasSuivant', () => {
    it('avance et recule d un cran', () => {
        expect(pasSuivant(15, 1, RAPPELS)).toBe(20);
        expect(pasSuivant(15, -1, RAPPELS)).toBe(10);
    });

    it('bute sur les bornes plutot que de les franchir', () => {
        expect(pasSuivant(60, 1, RAPPELS)).toBe(60);
        expect(pasSuivant(5, -1, RAPPELS)).toBe(5);
    });
});
