/**
 * La physique du jeu Encre, pure et testee (physique.test.ts) : des worklets, joues sur le fil de
 * l'interface par la boucle du jeu (`JeuDuRenard`).
 *
 * Le renard court sur l'horizon et saute ; les obstacles defilent vers lui. Les boites de collision
 * sont plus petites que les sprites (ni oreilles, ni queue, ni racines) et une tolerance pardonne le
 * frolement : on perd sur un vrai choc, pas sur un pixel.
 *
 * **Tout obstacle tire est franchissable** a la vitesse ou il apparait, et le test le verifie : le
 * renard monte a 76 points et reste au-dessus de 30 points pendant 0,38 s. La double souche, trop
 * large a la vitesse de depart, n'arrive qu'a partir de `VITESSE_DES_SOUCHES` ; les chouettes, apres
 * `SCORE_DES_CHOUETTES` obstacles, basses (a sauter) ou hautes (a passer dessous, sans sauter).
 */

import { PIXEL } from './encre';

/** Le bord gauche du sprite du renard, en points depuis le bord du plateau. */
export const X_DU_RENARD = 18;
/** La boite du renard, en points depuis le bord gauche de son sprite et depuis ses pieds. */
export const RENARD = { gauche: 8 * PIXEL, droite: 23 * PIXEL, haut: 11 * PIXEL } as const;

export const GRAVITE = 2700;
export const IMPULSION = 640;
export const VITESSE_INITIALE = 230;
export const VITESSE_MAXIMALE = 470;
export const ACCELERATION = 7;
export const PAUSE_DE_CHUTE = 750;
/** Le score a partir duquel les chouettes volent. */
export const SCORE_DES_CHOUETTES = 6;
/** La vitesse a partir de laquelle la double souche, plus large, devient franchissable. */
export const VITESSE_DES_SOUCHES = 340;

const TOLERANCE = 4;
const NOMBRE_D_OBSTACLES = 3;
const PAS_MAXIMAL = 50;
/** L'ecart minimal entre deux obstacles, en plus de la course : de quoi retomber avant le suivant. */
const ECART_MINIMAL = 60;

export type GenreDObstacle = 'caillou' | 'rocher' | 'souche' | 'souches' | 'chouette';

/** Ce qu'un obstacle occupe, en pixels de jeu : son sprite, et sa boite dans le sprite. */
export const FORMES: Readonly<Record<GenreDObstacle, { sprite: number; decalage: number; largeur: number; hauteur: number }>> = {
    caillou: { sprite: 11, decalage: 1, largeur: 9, hauteur: 4 },
    rocher: { sprite: 16, decalage: 2, largeur: 12, hauteur: 8 },
    souche: { sprite: 16, decalage: 3, largeur: 10, hauteur: 10 },
    souches: { sprite: 30, decalage: 3, largeur: 24, hauteur: 10 },
    chouette: { sprite: 15, decalage: 4, largeur: 7, hauteur: 7 },
};
/** L'altitude d'une chouette, en pixels : basse, on la saute ; haute, on passe dessous. */
export const VOL = { bas: 6, haut: 14 } as const;

export interface Obstacle {
    readonly genre: GenreDObstacle;
    readonly x: number;
    /** L'altitude du bas de la boite, en pixels de jeu : zero pour ce qui est pose. */
    readonly base: number;
    readonly comptee: boolean;
}

export type PhaseDuJeu = 'attente' | 'course' | 'chute';

export interface EtatDuJeu {
    readonly phase: PhaseDuJeu;
    readonly y: number;
    readonly vy: number;
    readonly obstacles: readonly Obstacle[];
    readonly vitesse: number;
    readonly score: number;
    readonly pause: number;
    readonly distance: number;
    /** Le temps depuis le dernier atterrissage, en millisecondes : la poussiere s'en sert. */
    readonly depuisLAtterrissage: number;
    /** Le temps de course, en millisecondes : le battement des ailes s'en sert. */
    readonly temps: number;
}

export function nouvelObstacle(x: number, tirage: number, score: number, vitesse: number): Obstacle {
    'worklet';
    if (score >= SCORE_DES_CHOUETTES && tirage < 0.16) {
        return { genre: 'chouette', x, base: tirage < 0.08 ? VOL.bas : VOL.haut, comptee: false };
    }
    if (vitesse >= VITESSE_DES_SOUCHES && tirage > 0.86) return { genre: 'souches', x, base: 0, comptee: false };
    if (tirage < 0.44) return { genre: 'caillou', x, base: 0, comptee: false };
    if (tirage < 0.68) return { genre: 'rocher', x, base: 0, comptee: false };
    return { genre: 'souche', x, base: 0, comptee: false };
}

export function ecartSuivant(vitesse: number, tirage: number): number {
    'worklet';
    return ECART_MINIMAL + vitesse * (0.75 + ((tirage * 7.31) % 1) * 0.8);
}

export function etatDeDepart(largeur: number): EtatDuJeu {
    'worklet';
    const obstacles: Obstacle[] = [];
    let x = largeur + 60;
    for (let i = 0; i < NOMBRE_D_OBSTACLES; i += 1) {
        obstacles.push(nouvelObstacle(x, 0.2 + i * 0.25, 0, VITESSE_INITIALE));
        x += ecartSuivant(VITESSE_INITIALE, i * 0.33);
    }
    return { phase: 'attente', y: 0, vy: 0, obstacles, vitesse: VITESSE_INITIALE, score: 0, pause: 0, distance: 0, depuisLAtterrissage: 1000, temps: 0 };
}

export function sauter(etat: EtatDuJeu, largeur: number): EtatDuJeu {
    'worklet';
    if (etat.phase === 'chute') return etat;
    const depart = etat.phase === 'attente' ? { ...etatDeDepart(largeur), phase: 'course' as const } : etat;
    if (depart.y > 0) return depart;
    return { ...depart, vy: IMPULSION };
}

export function touche(y: number, obstacle: Obstacle): boolean {
    'worklet';
    const forme = FORMES[obstacle.genre];
    const gauche = obstacle.x + forme.decalage * PIXEL;
    const droite = gauche + forme.largeur * PIXEL;
    const bas = obstacle.base * PIXEL;
    const haut = bas + forme.hauteur * PIXEL;
    const renardGauche = X_DU_RENARD + RENARD.gauche;
    const renardDroite = X_DU_RENARD + RENARD.droite;
    const deFace = gauche + TOLERANCE < renardDroite && droite - TOLERANCE > renardGauche;
    const aLaHauteur = y + TOLERANCE < haut && y + RENARD.haut - TOLERANCE > bas;
    return deFace && aLaHauteur;
}

export function avancer(etat: EtatDuJeu, dtMs: number, largeur: number, tirage: number): EtatDuJeu {
    'worklet';
    if (etat.phase === 'attente') return etat;
    if (etat.phase === 'chute') {
        const pause = etat.pause - dtMs;
        return pause > 0 ? { ...etat, pause } : etatDeDepart(largeur);
    }
    const pasMs = Math.min(dtMs, PAS_MAXIMAL);
    const dt = pasMs / 1000;
    let vy = etat.vy - GRAVITE * dt;
    let y = etat.y + vy * dt;
    let depuisLAtterrissage = etat.depuisLAtterrissage + pasMs;
    if (y <= 0) {
        if (etat.y > 0) depuisLAtterrissage = 0;
        y = 0;
        vy = 0;
    }
    let score = etat.score;
    let vitesse = etat.vitesse;
    const avances = etat.obstacles.map((obstacle) => ({ ...obstacle, x: obstacle.x - vitesse * dt }));
    const plusLoin = Math.max(...avances.map((obstacle) => obstacle.x + FORMES[obstacle.genre].sprite * PIXEL));
    const obstacles = avances.map((obstacle) => {
        const fin = obstacle.x + FORMES[obstacle.genre].sprite * PIXEL;
        if (!obstacle.comptee && fin < X_DU_RENARD + RENARD.gauche) {
            score += 1;
            vitesse = Math.min(VITESSE_MAXIMALE, vitesse + ACCELERATION);
            return { ...obstacle, comptee: true };
        }
        if (fin < 0) return nouvelObstacle(Math.max(plusLoin, largeur) + ecartSuivant(vitesse, tirage), tirage, score, vitesse);
        return obstacle;
    });
    const tombe = obstacles.some((obstacle) => touche(y, obstacle));
    return {
        phase: tombe ? 'chute' : 'course',
        y,
        vy,
        obstacles,
        vitesse,
        score,
        pause: tombe ? PAUSE_DE_CHUTE : 0,
        distance: etat.distance + vitesse * dt,
        depuisLAtterrissage,
        temps: etat.temps + pasMs,
    };
}
