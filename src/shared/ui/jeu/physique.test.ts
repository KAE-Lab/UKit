/** Le jeu du point : un saut qui retombe, des obstacles qui se comptent, une chute qui remet a zero. */

import { describe, expect, it } from 'vitest';

import {
    avancer,
    etatDeDepart,
    GRAVITE,
    IMPULSION,
    PAUSE_DE_CHUTE,
    DEMI_LARGEUR,
    nouvelleCote,
    sauter,
    touche,
    VITESSE_INITIALE,
    X_DU_POINT,
    type EtatDuJeu,
} from './physique';

const LARGEUR = 320;
const IMAGE = 16;

/** Joue `n` images de 16 ms, le hasard au milieu. */
function jouer(etat: EtatDuJeu, n: number): EtatDuJeu {
    let courant = etat;
    for (let i = 0; i < n; i += 1) courant = avancer(courant, IMAGE, LARGEUR, 0.5);
    return courant;
}

describe('le depart', () => {
    it('attend un toucher, le point sur l horizon et les cotes hors champ', () => {
        const etat = etatDeDepart(LARGEUR);
        expect(etat.phase).toBe('attente');
        expect(etat.y).toBe(0);
        expect(etat.cotes.every((c) => c.x > LARGEUR)).toBe(true);
        expect(avancer(etat, IMAGE, LARGEUR, 0.5)).toBe(etat);
    });

    it('lance la course et le saut au premier toucher', () => {
        const etat = sauter(etatDeDepart(LARGEUR), LARGEUR);
        expect(etat.phase).toBe('course');
        expect(etat.vy).toBe(IMPULSION);
    });
});

describe('le saut', () => {
    it('culmine sous soixante-dix points et retombe sur l horizon', () => {
        let etat = sauter(etatDeDepart(LARGEUR), LARGEUR);
        let sommet = 0;
        for (let i = 0; i < 40; i += 1) {
            etat = avancer(etat, IMAGE, LARGEUR, 0.5);
            sommet = Math.max(sommet, etat.y);
        }
        expect(sommet).toBeGreaterThan(50);
        expect(sommet).toBeLessThan(70);
        expect(sommet).toBeCloseTo((IMPULSION * IMPULSION) / (2 * GRAVITE), -1);
        expect(etat.y).toBe(0);
    });

    it('ne saute pas une seconde fois en l air', () => {
        const enLAir = jouer(sauter(etatDeDepart(LARGEUR), LARGEUR), 5);
        expect(sauter(enLAir, LARGEUR).vy).toBe(enLAir.vy);
    });
});

describe('les cotes', () => {
    const course: EtatDuJeu = { ...etatDeDepart(LARGEUR), phase: 'course' };

    it('touche une cote sur le passage du point, au sol', () => {
        expect(touche(0, { genre: 'cote', x: X_DU_POINT - 5, hauteur: 30, largeur: 10, comptee: false })).toBe(true);
    });

    it('ne touche pas une cote survolee', () => {
        expect(touche(40, { genre: 'cote', x: X_DU_POINT - 5, hauteur: 30, largeur: 10, comptee: false })).toBe(false);
    });

    it('pardonne un frolement', () => {
        expect(touche(0, { genre: 'cote', x: X_DU_POINT + DEMI_LARGEUR - 1, hauteur: 30, largeur: 10, comptee: false })).toBe(false);
    });

    it('compte une cote franchie et accelere', () => {
        const juste: EtatDuJeu = { ...course, y: 80, cotes: [{ genre: 'cote', x: X_DU_POINT - DEMI_LARGEUR - 11, hauteur: 20, largeur: 10, comptee: false }] };
        const apres = avancer(juste, IMAGE, LARGEUR, 0.5);
        expect(apres.score).toBe(1);
        expect(apres.vitesse).toBeGreaterThan(VITESSE_INITIALE);
    });

    it('tire les quatre genres d obstacles, tous franchissables d un saut', () => {
        const genres = [0.1, 0.3, 0.55, 0.7, 0.8, 0.95].map((tirage) => nouvelleCote(0, tirage));
        expect(new Set(genres.map((c) => c.genre))).toEqual(new Set(['plot', 'gobelet', 'livres', 'cote']));
        const sommet = (IMPULSION * IMPULSION) / (2 * GRAVITE);
        genres.forEach((c) => expect(c.hauteur).toBeLessThan(sommet - 15));
    });

    it('fait renaitre a droite une cote sortie a gauche', () => {
        const sortie: EtatDuJeu = { ...course, y: 80, cotes: [{ genre: 'cote', x: -30, hauteur: 20, largeur: 10, comptee: true }] };
        expect(avancer(sortie, IMAGE, LARGEUR, 0.5).cotes[0].x).toBeGreaterThan(LARGEUR);
    });
});

describe('la chute', () => {
    it('tombe sur une cote, attend, puis revient au depart sans perdre la largeur', () => {
        const face: EtatDuJeu = { ...etatDeDepart(LARGEUR), phase: 'course', score: 7, cotes: [{ genre: 'cote', x: X_DU_POINT, hauteur: 30, largeur: 10, comptee: false }] };
        const tombe = avancer(face, IMAGE, LARGEUR, 0.5);
        expect(tombe.phase).toBe('chute');
        expect(tombe.score).toBe(7);
        const encore = avancer(tombe, PAUSE_DE_CHUTE / 2, LARGEUR, 0.5);
        expect(encore.phase).toBe('chute');
        const repart = avancer(encore, PAUSE_DE_CHUTE, LARGEUR, 0.5);
        expect(repart.phase).toBe('attente');
        expect(repart.score).toBe(0);
    });

    it('ne saute pas pendant la chute', () => {
        const chute: EtatDuJeu = { ...etatDeDepart(LARGEUR), phase: 'chute', pause: 300 };
        expect(sauter(chute, LARGEUR)).toBe(chute);
    });
});
