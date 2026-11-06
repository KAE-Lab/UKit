/** Le jeu Encre : un saut qui retombe, des obstacles franchissables qui se comptent, une chute qui remet a zero. */

import { describe, expect, it } from 'vitest';

import { PIXEL } from './encre';
import {
    avancer,
    etatDeDepart,
    GRAVITE,
    IMPULSION,
    nouvelObstacle,
    PAUSE_DE_CHUTE,
    RENARD,
    sauter,
    SCORE_DES_CHOUETTES,
    touche,
    VITESSE_DES_SOUCHES,
    VITESSE_INITIALE,
    VOL,
    X_DU_RENARD,
    type EtatDuJeu,
    type GenreDObstacle,
    type Obstacle,
} from './physique';

const LARGEUR = 320;
const IMAGE = 16;

/** Joue `n` images de 16 ms, le hasard au milieu. */
function jouer(etat: EtatDuJeu, n: number): EtatDuJeu {
    let courant = etat;
    for (let i = 0; i < n; i += 1) courant = avancer(courant, IMAGE, LARGEUR, 0.5);
    return courant;
}

/** Un obstacle seul, devant le renard, a une vitesse donnee : le reste du plateau est vide. */
function seul(obstacle: Obstacle, vitesse: number): EtatDuJeu {
    const loin = (x: number): Obstacle => ({ genre: 'caillou', x, base: 0, comptee: true });
    return { ...etatDeDepart(LARGEUR), phase: 'course', vitesse, obstacles: [obstacle, loin(5000), loin(6000)] };
}

/** Vrai si un saut lance au bon moment franchit l'obstacle (ou, sans sauter, s'il passe dessous). */
function franchissable(obstacle: Obstacle, vitesse: number, sansSauter = false): boolean {
    for (let attente = 0; attente < 120; attente += 1) {
        let etat = seul(obstacle, vitesse);
        let perdu = false;
        for (let i = 0; i < 200 && !perdu; i += 1) {
            if (!sansSauter && i === attente) etat = sauter(etat, LARGEUR);
            etat = avancer(etat, IMAGE, LARGEUR, 0.5);
            if (etat.phase === 'chute') perdu = true;
            if (etat.obstacles[0]?.comptee === true && etat.y === 0) break;
        }
        if (!perdu) return true;
        if (sansSauter) return false;
    }
    return false;
}

describe('le depart', () => {
    it('attend un toucher, le renard sur l horizon et les obstacles hors champ', () => {
        const depart = etatDeDepart(LARGEUR);
        expect(depart.phase).toBe('attente');
        expect(depart.y).toBe(0);
        expect(depart.obstacles.every((obstacle) => obstacle.x > LARGEUR)).toBe(true);
        expect(jouer(depart, 10)).toEqual(depart);
    });

    it('lance la course et le saut au premier toucher', () => {
        const lance = sauter(etatDeDepart(LARGEUR), LARGEUR);
        expect(lance.phase).toBe('course');
        expect(lance.vy).toBe(IMPULSION);
    });
});

describe('le saut', () => {
    it('culmine vers soixante-seize points et retombe sur l horizon', () => {
        let etat = sauter(etatDeDepart(LARGEUR), LARGEUR);
        let sommet = 0;
        for (let i = 0; i < 60; i += 1) {
            etat = avancer(etat, IMAGE, LARGEUR, 0.5);
            sommet = Math.max(sommet, etat.y);
        }
        expect(sommet).toBeGreaterThan(65);
        expect(sommet).toBeLessThan(IMPULSION ** 2 / (2 * GRAVITE) + 1);
        expect(etat.y).toBe(0);
    });

    it('ne saute pas une seconde fois en l air, et note l atterrissage', () => {
        let etat = jouer(sauter(etatDeDepart(LARGEUR), LARGEUR), 5);
        expect(sauter(etat, LARGEUR).vy).toBe(etat.vy);
        etat = jouer(etat, 40);
        expect(etat.y).toBe(0);
        expect(etat.depuisLAtterrissage).toBeLessThan(40 * IMAGE);
    });
});

describe('les obstacles', () => {
    const devant = X_DU_RENARD + RENARD.gauche;

    it('touche un obstacle sur le passage du renard, au sol', () => {
        expect(touche(0, { genre: 'souche', x: devant, base: 0, comptee: false })).toBe(true);
    });

    it('ne touche pas un obstacle survole', () => {
        expect(touche(40, { genre: 'souche', x: devant, base: 0, comptee: false })).toBe(false);
    });

    it('pardonne un frolement', () => {
        const juste = X_DU_RENARD + RENARD.droite - 3 - 3 * PIXEL;
        expect(touche(0, { genre: 'souche', x: juste, base: 0, comptee: false })).toBe(false);
    });

    it('compte un obstacle franchi et accelere', () => {
        const passe = seul({ genre: 'caillou', x: X_DU_RENARD + RENARD.gauche - 34, base: 0, comptee: false }, VITESSE_INITIALE);
        const apres = avancer(passe, IMAGE, LARGEUR, 0.5);
        expect(apres.score).toBe(1);
        expect(apres.vitesse).toBeGreaterThan(VITESSE_INITIALE);
    });

    it('fait renaitre a droite un obstacle sorti a gauche', () => {
        const sorti = seul({ genre: 'caillou', x: -40, base: 0, comptee: true }, VITESSE_INITIALE);
        expect(avancer(sorti, IMAGE, LARGEUR, 0.5).obstacles[0].x).toBeGreaterThan(LARGEUR);
    });

    it('ne fait voler les chouettes, ni ne pose la double souche, qu en cours de partie', () => {
        expect(nouvelObstacle(0, 0.05, 0, VITESSE_INITIALE).genre).not.toBe('chouette');
        expect(nouvelObstacle(0, 0.05, SCORE_DES_CHOUETTES, VITESSE_INITIALE).genre).toBe('chouette');
        expect(nouvelObstacle(0, 0.95, 0, VITESSE_INITIALE).genre).not.toBe('souches');
        expect(nouvelObstacle(0, 0.95, 0, VITESSE_DES_SOUCHES).genre).toBe('souches');
    });

    it('rend chaque obstacle franchissable a la vitesse ou il apparait', () => {
        const genres: [GenreDObstacle, number][] = [['caillou', VITESSE_INITIALE], ['rocher', VITESSE_INITIALE], ['souche', VITESSE_INITIALE], ['souches', VITESSE_DES_SOUCHES]];
        for (const [genre, vitesse] of genres) {
            expect(franchissable({ genre, x: LARGEUR, base: 0, comptee: false }, vitesse)).toBe(true);
        }
        expect(franchissable({ genre: 'chouette', x: LARGEUR, base: VOL.bas, comptee: false }, VITESSE_INITIALE)).toBe(true);
    });

    it('fait passer sous une chouette haute, et la rend fatale a qui saute dessous', () => {
        const haute: Obstacle = { genre: 'chouette', x: X_DU_RENARD + RENARD.gauche, base: VOL.haut, comptee: false };
        expect(touche(0, haute)).toBe(false);
        expect(touche(45, haute)).toBe(true);
        expect(franchissable({ ...haute, x: LARGEUR }, VITESSE_INITIALE, true)).toBe(true);
    });
});

describe('la chute', () => {
    it('tombe sur un obstacle, attend, puis revient au depart sans perdre la largeur', () => {
        const fatal = seul({ genre: 'souche', x: X_DU_RENARD + RENARD.gauche, base: 0, comptee: false }, VITESSE_INITIALE);
        const tombe = avancer(fatal, IMAGE, LARGEUR, 0.5);
        expect(tombe.phase).toBe('chute');
        expect(tombe.pause).toBe(PAUSE_DE_CHUTE);
        const revenu = avancer(tombe, PAUSE_DE_CHUTE + 1, LARGEUR, 0.5);
        expect(revenu.phase).toBe('attente');
        expect(revenu.obstacles.every((obstacle) => obstacle.x > LARGEUR)).toBe(true);
    });

    it('ne saute pas pendant la chute', () => {
        const fatal = seul({ genre: 'souche', x: X_DU_RENARD + RENARD.gauche, base: 0, comptee: false }, VITESSE_INITIALE);
        const tombe = avancer(fatal, IMAGE, LARGEUR, 0.5);
        expect(sauter(tombe, LARGEUR)).toBe(tombe);
    });
});
