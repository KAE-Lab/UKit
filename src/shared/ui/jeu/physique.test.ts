/**
 * Le jeu Encre : un saut qui se dose au doigt, un renard qui se baisse, des obstacles franchissables
 * qui se comptent, une chute qui remet a zero.
 */

import { describe, expect, it } from 'vitest';

import { PIXEL } from './encre';
import {
    appuyer,
    avancer,
    baisser,
    etatDeDepart,
    MAINTIEN_MAX,
    nouvelObstacle,
    PAUSE_DE_CHUTE,
    RENARD,
    relacher,
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

/** Le geste du joueur : un appui bref, un appui tenu, se baisser, ou ne rien faire. */
type Geste = 'bref' | 'tenu' | 'baisse' | 'rien';

/** Une image du geste, lance a l'image `debut` : appui, maintien puis relache, ou glissement. */
function geste(etat: EtatDuJeu, geste: Geste, i: number, debut: number): EtatDuJeu {
    if (geste === 'rien' || i < debut) return etat;
    if (geste === 'baisse') return i === debut ? baisser(etat) : etat;
    if (i === debut) return appuyer(etat, LARGEUR);
    const tenu = geste === 'tenu' ? MAINTIEN_MAX : IMAGE;
    return (i - debut) * IMAGE >= tenu ? relacher(etat) : etat;
}

/** Vrai si le geste, lance au bon moment, franchit l'obstacle. */
function franchissable(obstacle: Obstacle, vitesse: number, choisi: Geste): boolean {
    for (let debut = 0; debut < 120; debut += 1) {
        let etat = seul(obstacle, vitesse);
        let perdu = false;
        for (let i = 0; i < 200 && !perdu; i += 1) {
            etat = geste(etat, choisi, i, debut);
            etat = avancer(etat, IMAGE, LARGEUR, 0.5);
            if (etat.phase === 'chute') perdu = true;
            if (etat.obstacles[0]?.comptee === true && etat.y === 0) break;
        }
        if (!perdu) return true;
        if (choisi === 'rien') return false;
    }
    return false;
}

/** Le sommet d'un saut tenu `tenuMs` millisecondes. */
function sommet(tenuMs: number): number {
    let etat = appuyer(etatDeDepart(LARGEUR), LARGEUR);
    let haut = 0;
    for (let i = 0; i < 80; i += 1) {
        if (i * IMAGE >= tenuMs) etat = relacher(etat);
        etat = avancer(etat, IMAGE, LARGEUR, 0.5);
        haut = Math.max(haut, etat.y);
    }
    return haut;
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
        const lance = appuyer(etatDeDepart(LARGEUR), LARGEUR);
        expect(lance.phase).toBe('course');
        expect(lance.vy).toBeGreaterThan(0);
        expect(lance.maintenu).toBe(true);
    });
});

describe('le saut', () => {
    it('monte plus haut quand le doigt reste pose', () => {
        const bref = sommet(IMAGE);
        const tenu = sommet(MAINTIEN_MAX);
        expect(bref).toBeGreaterThan(38);
        expect(bref).toBeLessThan(48);
        expect(tenu).toBeGreaterThan(75);
        expect(tenu).toBeLessThan(90);
    });

    it('ne monte plus au-dela du maintien maximal', () => {
        expect(sommet(1000)).toBeCloseTo(sommet(MAINTIEN_MAX), 0);
    });

    it('retombe sur l horizon, ne saute pas une seconde fois en l air, et note l atterrissage', () => {
        let etat = jouer(appuyer(etatDeDepart(LARGEUR), LARGEUR), 5);
        expect(appuyer(etat, LARGEUR).vy).toBe(etat.vy);
        etat = jouer(relacher(etat), 40);
        expect(etat.y).toBe(0);
        expect(etat.depuisLAtterrissage).toBeLessThan(40 * IMAGE);
    });
});

describe('se baisser', () => {
    it('plonge en l air et retombe plus vite', () => {
        const enLAir = jouer(relacher(appuyer(etatDeDepart(LARGEUR), LARGEUR)), 8);
        const plonge = avancer(baisser(enLAir), IMAGE, LARGEUR, 0.5);
        const libre = avancer(enLAir, IMAGE, LARGEUR, 0.5);
        expect(plonge.y).toBeLessThan(libre.y);
    });

    it('ne saute pas baisse, et se releve au relache', () => {
        const baisse = baisser(jouer(relacher(appuyer(etatDeDepart(LARGEUR), LARGEUR)), 40));
        expect(appuyer(baisse, LARGEUR).vy).toBe(0);
        expect(relacher(baisse).baisse).toBe(false);
    });

    it('n agit qu en course', () => {
        const depart = etatDeDepart(LARGEUR);
        expect(baisser(depart)).toBe(depart);
    });
});

describe('les obstacles', () => {
    const devant = X_DU_RENARD + RENARD.gauche;

    it('touche un obstacle sur le passage du renard, au sol', () => {
        expect(touche(0, false, { genre: 'souche', x: devant, base: 0, comptee: false })).toBe(true);
    });

    it('ne touche pas un obstacle survole', () => {
        expect(touche(40, false, { genre: 'souche', x: devant, base: 0, comptee: false })).toBe(false);
    });

    it('pardonne un frolement', () => {
        const juste = X_DU_RENARD + RENARD.droite - 3 - 3 * PIXEL;
        expect(touche(0, false, { genre: 'souche', x: juste, base: 0, comptee: false })).toBe(false);
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
            expect(franchissable({ genre, x: LARGEUR, base: 0, comptee: false }, vitesse, 'tenu')).toBe(true);
        }
        expect(franchissable({ genre: 'caillou', x: LARGEUR, base: 0, comptee: false }, VITESSE_INITIALE, 'bref')).toBe(true);
        expect(franchissable({ genre: 'chouette', x: LARGEUR, base: VOL.bas, comptee: false }, VITESSE_INITIALE, 'tenu')).toBe(true);
    });

    it('demande un saut tenu pour la double souche', () => {
        expect(franchissable({ genre: 'souches', x: LARGEUR, base: 0, comptee: false }, VITESSE_DES_SOUCHES, 'bref')).toBe(false);
    });

    it('fait passer baisse sous une chouette a mi-hauteur, qui frappe le renard debout', () => {
        const milieu: Obstacle = { genre: 'chouette', x: X_DU_RENARD + RENARD.gauche, base: VOL.milieu, comptee: false };
        expect(touche(0, false, milieu)).toBe(true);
        expect(touche(0, true, milieu)).toBe(false);
        expect(franchissable({ ...milieu, x: LARGEUR }, VITESSE_INITIALE, 'baisse')).toBe(true);
        expect(franchissable({ ...milieu, x: LARGEUR }, VITESSE_INITIALE, 'rien')).toBe(false);
    });

    it('fait passer sous une chouette haute, et la rend fatale a qui saute dessous', () => {
        const haute: Obstacle = { genre: 'chouette', x: X_DU_RENARD + RENARD.gauche, base: VOL.haut, comptee: false };
        expect(touche(0, false, haute)).toBe(false);
        expect(touche(45, false, haute)).toBe(true);
        expect(franchissable({ ...haute, x: LARGEUR }, VITESSE_INITIALE, 'rien')).toBe(true);
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
        expect(appuyer(tombe, LARGEUR)).toBe(tombe);
    });
});
