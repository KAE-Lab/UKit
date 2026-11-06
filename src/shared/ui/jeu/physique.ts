/**
 * La physique du jeu Encre, pure et testee (physique.test.ts) : des worklets, joues sur le fil de
 * l'interface par la boucle du jeu et par le geste (`usePartieDuRenard`).
 *
 * Le renard court sur l'horizon ; les obstacles defilent vers lui. Les boites de collision sont plus
 * petites que les sprites (ni oreilles, ni queue, ni racines) et une tolerance pardonne le frolement :
 * on perd sur un vrai choc, pas sur un pixel.
 *
 * **Le saut se dose au doigt**, comme celui du jeu du dinosaure : un appui lance le renard, et tant
 * que le doigt reste pose (`MAINTIEN_MAX` au plus) la pesanteur ne pese qu'a moitie. Un appui bref
 * monte a 43 points, un appui tenu a 82. **Glisser vers le bas baisse le renard** : au sol, sa boite
 * tombe a six pixels de haut ; en l'air, il plonge.
 *
 * **Tout obstacle tire est franchissable** a la vitesse ou il apparait, et le test le verifie. La
 * double souche, trop large pour un saut bref, n'arrive qu'a partir de `VITESSE_DES_SOUCHES` et
 * demande un saut tenu ; les chouettes, apres `SCORE_DES_CHOUETTES` obstacles, volent basses (a
 * sauter), a mi-hauteur (a passer baisse, ou par un saut tenu) ou hautes (a laisser passer debout).
 */

import { PIXEL } from './encre';

/** Le bord gauche du sprite du renard, en points depuis le bord du plateau. */
export const X_DU_RENARD = 18;
/** La boite du renard debout, en points depuis le bord gauche de son sprite et depuis ses pieds. */
export const RENARD = { gauche: 5 * PIXEL, droite: 18 * PIXEL, haut: 10 * PIXEL } as const;
/** La boite du renard baisse : plus basse, le museau un peu plus loin. */
export const RENARD_BAISSE = { gauche: 5 * PIXEL, droite: 19 * PIXEL, haut: 6 * PIXEL } as const;

export const GRAVITE = 2700;
export const IMPULSION = 480;
/** La part de la pesanteur qui reste tant que le doigt tient le saut. */
export const ALLEGEMENT = 0.45;
/** La duree au-dela de laquelle tenir le doigt ne fait plus monter, en millisecondes. */
export const MAINTIEN_MAX = 200;
/** La vitesse de la plongee, quand on glisse vers le bas en l'air. */
export const PLONGEE = 900;
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
/**
 * L'altitude d'une chouette, en pixels : basse, on la saute ; a mi-hauteur, on se baisse (ou on la
 * saute en tenant le doigt) ; haute, on passe dessous sans rien faire.
 */
export const VOL = { bas: 2, milieu: 8, haut: 13 } as const;

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
    /** Le doigt tient le saut : la pesanteur est allegee, pendant `MAINTIEN_MAX` au plus. */
    readonly maintenu: boolean;
    /** Le temps depuis le debut du saut, en millisecondes. */
    readonly depuisLeSaut: number;
    /** Le doigt a glisse vers le bas : baisse au sol, en plongee en l'air. */
    readonly baisse: boolean;
    /** Le temps de course, en millisecondes : le battement des ailes s'en sert. */
    readonly temps: number;
}

export function nouvelObstacle(x: number, tirage: number, score: number, vitesse: number): Obstacle {
    'worklet';
    if (score >= SCORE_DES_CHOUETTES && tirage < 0.18) {
        const base = tirage < 0.06 ? VOL.bas : tirage < 0.12 ? VOL.milieu : VOL.haut;
        return { genre: 'chouette', x, base, comptee: false };
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
    return {
        phase: 'attente', y: 0, vy: 0, obstacles, vitesse: VITESSE_INITIALE, score: 0, pause: 0, distance: 0,
        depuisLAtterrissage: 1000, temps: 0, maintenu: false, depuisLeSaut: 0, baisse: false,
    };
}

/** Le doigt se pose : le depart d'une partie, ou un saut si le renard est au sol et debout. */
export function appuyer(etat: EtatDuJeu, largeur: number): EtatDuJeu {
    'worklet';
    if (etat.phase === 'chute') return etat;
    const depart = etat.phase === 'attente' ? { ...etatDeDepart(largeur), phase: 'course' as const } : etat;
    if (depart.y > 0 || depart.baisse) return depart;
    return { ...depart, vy: IMPULSION, maintenu: true, depuisLeSaut: 0 };
}

/** Le doigt se leve : le saut cesse d'etre tenu, le renard se releve. */
export function relacher(etat: EtatDuJeu): EtatDuJeu {
    'worklet';
    if (!etat.maintenu && !etat.baisse) return etat;
    return { ...etat, maintenu: false, baisse: false };
}

/** Le doigt glisse vers le bas : le renard se baisse, ou plonge s'il est en l'air. */
export function baisser(etat: EtatDuJeu): EtatDuJeu {
    'worklet';
    if (etat.phase !== 'course' || etat.baisse) return etat;
    return { ...etat, baisse: true, maintenu: false };
}

export function touche(y: number, baisse: boolean, obstacle: Obstacle): boolean {
    'worklet';
    const forme = FORMES[obstacle.genre];
    const boite = baisse && y === 0 ? RENARD_BAISSE : RENARD;
    const gauche = obstacle.x + forme.decalage * PIXEL;
    const droite = gauche + forme.largeur * PIXEL;
    const bas = obstacle.base * PIXEL;
    const haut = bas + forme.hauteur * PIXEL;
    const renardGauche = X_DU_RENARD + boite.gauche;
    const renardDroite = X_DU_RENARD + boite.droite;
    const deFace = gauche + TOLERANCE < renardDroite && droite - TOLERANCE > renardGauche;
    const aLaHauteur = y + TOLERANCE < haut && y + boite.haut - TOLERANCE > bas;
    return deFace && aLaHauteur;
}

/** La pesanteur du moment : allegee tant que le doigt tient un saut qui monte. */
function pesanteur(etat: EtatDuJeu): number {
    'worklet';
    return etat.maintenu && etat.vy > 0 && etat.depuisLeSaut < MAINTIEN_MAX ? GRAVITE * ALLEGEMENT : GRAVITE;
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
    let vy = etat.vy - pesanteur(etat) * dt;
    if (etat.baisse && etat.y > 0) vy = Math.min(vy, -PLONGEE);
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
    const tombe = obstacles.some((obstacle) => touche(y, etat.baisse, obstacle));
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
        maintenu: etat.maintenu,
        depuisLeSaut: etat.depuisLeSaut + pasMs,
        baisse: etat.baisse,
    };
}
