/**
 * La physique du jeu du point (jalon 7-J) : le saut, le defilement, le compte, la chute.
 *
 * Le jeu occupe l'attente de la connexion universitaire, quatorze a vingt-six secondes. Le « i » du
 * logo — son point, et depuis la deuxieme passe de 7-J son corps — court sur l'horizon et saute ce que
 * le campus pose sur son chemin : un plot, un gobelet, une pile de livres, la cote d'un plan. Un pouce,
 * aucun ecran de fin : une chute remet le compteur a zero, le record se garde.
 *
 * **La collision est celle d'un rectangle** depuis que le personnage a un corps : sa largeur, posee
 * sur sa hauteur au-dessus de l'horizon. Seul le bas compte, puisque tout obstacle est au sol.
 *
 * Tout est en points et en secondes, et en **hauteur au-dessus de l'horizon** : la physique ne connait
 * pas la taille du dessin. Les fonctions sont des worklets — Reanimated les joue sur le fil de
 * l'interface, image par image — et restent de simples fonctions pures sous vitest. Le hasard arrive
 * en parametre (`tirage`, dans [0, 1)), pour qu'un test rejoue la meme partie.
 */

/** La position du point, depuis le bord gauche du dessin. */
export const X_DU_POINT = 44;
/** La demi-largeur du personnage : le corps du « i », sa tete comprise. */
export const DEMI_LARGEUR = 6;
/** Points par seconde au carre : le saut culmine a une soixantaine de points. */
export const GRAVITE = 2600;
export const IMPULSION = 568;
export const VITESSE_INITIALE = 220;
export const VITESSE_MAXIMALE = 420;
/** Ce que gagne la vitesse a chaque cote franchie. */
export const ACCELERATION = 8;
/** La pause apres une chute, avant que le point attende un nouveau toucher. */
export const PAUSE_DE_CHUTE = 700;
/** La marge d'une collision : un frolement n'est pas une chute. */
const TOLERANCE = 3;
const NOMBRE_DE_COTES = 3;
/** Un pas d'image ne depasse jamais cette duree : une saccade ne fait pas traverser une cote. */
const PAS_MAXIMAL = 50;

/** Ce que le campus pose sur l'horizon : la forme seule change, la collision est celle de la boite. */
export type GenreDObstacle = 'plot' | 'gobelet' | 'livres' | 'cote';

export interface Cote {
    readonly genre: GenreDObstacle;
    /** Le bord gauche, en points depuis le bord gauche du dessin. */
    readonly x: number;
    readonly hauteur: number;
    readonly largeur: number;
    /** La cote a ete franchie et comptee. */
    readonly comptee: boolean;
}

export type PhaseDuJeu = 'attente' | 'course' | 'chute';

export interface EtatDuJeu {
    readonly phase: PhaseDuJeu;
    /** La hauteur du point au-dessus de l'horizon, et sa vitesse verticale (vers le haut). */
    readonly y: number;
    readonly vy: number;
    readonly cotes: readonly Cote[];
    readonly vitesse: number;
    readonly score: number;
    /** Ce qui reste de la pause de chute, en millisecondes. */
    readonly pause: number;
    /** La distance parcourue : elle fait defiler la graduation de l'horizon. */
    readonly distance: number;
}

/** Une cote, simple ou double, de hauteur tiree au hasard. */
export function nouvelleCote(x: number, tirage: number): Cote {
    'worklet';
    // Un quart pour chaque genre ; la cote garde la hauteur variable et la largeur double d'avant.
    if (tirage < 0.25) return { genre: 'plot', x, hauteur: 24, largeur: 18, comptee: false };
    if (tirage < 0.5) return { genre: 'gobelet', x, hauteur: 20, largeur: 14, comptee: false };
    if (tirage < 0.75) return { genre: 'livres', x, hauteur: tirage < 0.62 ? 22 : 33, largeur: 24, comptee: false };
    return { genre: 'cote', x, hauteur: 18 + Math.round((tirage - 0.75) * 64), largeur: tirage > 0.9 ? 22 : 10, comptee: false };
}

export function ecartSuivant(vitesse: number, tirage: number): number {
    'worklet';
    return vitesse * (0.8 + tirage * 0.7);
}

/** Le jeu au repos, le point sur l'horizon et les cotes hors champ a droite. */
export function etatDeDepart(largeur: number): EtatDuJeu {
    'worklet';
    const cotes: Cote[] = [];
    let x = largeur + 40;
    for (let i = 0; i < NOMBRE_DE_COTES; i += 1) {
        cotes.push(nouvelleCote(x, (i * 0.37) % 1));
        x += ecartSuivant(VITESSE_INITIALE, (i * 0.61) % 1);
    }
    return { phase: 'attente', y: 0, vy: 0, cotes, vitesse: VITESSE_INITIALE, score: 0, pause: 0, distance: 0 };
}

/** Un toucher : lance la course depuis l'attente, fait sauter le point s'il touche l'horizon. */
export function sauter(etat: EtatDuJeu, largeur: number): EtatDuJeu {
    'worklet';
    if (etat.phase === 'chute') return etat;
    const depart = etat.phase === 'attente' ? { ...etatDeDepart(largeur), phase: 'course' as const } : etat;
    if (depart.y > 0) return depart;
    return { ...depart, vy: IMPULSION };
}

/** Le point touche-t-il la cote ? Un cercle contre un rectangle pose sur l'horizon. */
export function touche(y: number, cote: Cote): boolean {
    'worklet';
    const gauche = X_DU_POINT - DEMI_LARGEUR;
    const droite = X_DU_POINT + DEMI_LARGEUR;
    const chevauche = cote.x + TOLERANCE < droite && cote.x + cote.largeur - TOLERANCE > gauche;
    return chevauche && y < cote.hauteur - TOLERANCE;
}

export function avancer(etat: EtatDuJeu, dtMs: number, largeur: number, tirage: number): EtatDuJeu {
    'worklet';
    if (etat.phase === 'attente') return etat;
    if (etat.phase === 'chute') {
        const pause = etat.pause - dtMs;
        return pause > 0 ? { ...etat, pause } : etatDeDepart(largeur);
    }

    const dt = Math.min(dtMs, PAS_MAXIMAL) / 1000;
    let vy = etat.vy - GRAVITE * dt;
    let y = etat.y + vy * dt;
    if (y <= 0) {
        y = 0;
        vy = 0;
    }

    let score = etat.score;
    let vitesse = etat.vitesse;
    const avancees = etat.cotes.map((cote) => ({ ...cote, x: cote.x - vitesse * dt }));
    const plusLoin = Math.max(...avancees.map((cote) => cote.x));
    const cotes = avancees.map((cote) => {
        if (!cote.comptee && cote.x + cote.largeur < X_DU_POINT - DEMI_LARGEUR) {
            score += 1;
            vitesse = Math.min(VITESSE_MAXIMALE, vitesse + ACCELERATION);
            return { ...cote, comptee: true };
        }
        if (cote.x + cote.largeur < 0) return nouvelleCote(Math.max(plusLoin, largeur) + ecartSuivant(vitesse, tirage), tirage);
        return cote;
    });

    const tombe = cotes.some((cote) => touche(y, cote));
    return {
        phase: tombe ? 'chute' : 'course',
        y,
        vy,
        cotes,
        vitesse,
        score,
        pause: tombe ? PAUSE_DE_CHUTE : 0,
        distance: etat.distance + vitesse * dt,
    };
}
