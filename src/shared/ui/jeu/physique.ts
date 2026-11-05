/**
 * La physique du jeu du point (jalon 7-J) : le saut, le defilement, le compte, la chute.
 *
 * Le jeu occupe l'attente de la connexion universitaire, quatorze a vingt-six secondes. Le point du
 * « i » du logo court sur l'horizon de l'Epure et saute les **cotes** qui defilent — les traits de
 * construction d'un plan, une barre et ses deux butees. Un pouce, aucun ecran de fin : une chute
 * remet le compteur a zero, le record se garde.
 *
 * Tout est en points et en secondes, et en **hauteur au-dessus de l'horizon** : la physique ne connait
 * pas la taille du dessin. Les fonctions sont des worklets — Reanimated les joue sur le fil de
 * l'interface, image par image — et restent de simples fonctions pures sous vitest. Le hasard arrive
 * en parametre (`tirage`, dans [0, 1)), pour qu'un test rejoue la meme partie.
 */

/** La position du point, depuis le bord gauche du dessin. */
export const X_DU_POINT = 44;
export const RAYON_DU_POINT = 7;
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

export interface Cote {
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
    const double = tirage > 0.72;
    return { x, hauteur: 18 + Math.round(tirage * 16), largeur: double ? 22 : 10, comptee: false };
}

/** L'ecart jusqu'a la cote suivante : entre 0,8 et 1,5 seconde de course a la vitesse donnee. */
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
    const cx = X_DU_POINT;
    const cy = RAYON_DU_POINT + y;
    const px = Math.min(Math.max(cx, cote.x + TOLERANCE), cote.x + cote.largeur - TOLERANCE);
    const py = Math.min(Math.max(cy, 0), cote.hauteur - TOLERANCE);
    const dx = cx - px;
    const dy = cy - py;
    return dx * dx + dy * dy < RAYON_DU_POINT * RAYON_DU_POINT;
}

/** Une image de jeu : `dtMs` ecoulees, `tirage` pour la cote qui renait a droite. */
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
        if (!cote.comptee && cote.x + cote.largeur < X_DU_POINT - RAYON_DU_POINT) {
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
