/**
 * L'entonnoir d'une annonce : vue, ouverte, action (docs/mesure.md). Le taux d'ouverture est
 * `annonce.ouverture` sur `annonce.impression`, le taux d'action `annonce.action` sur
 * `annonce.ouverture`. Une impression se compte une fois par session, pas une fois par personne.
 *
 * Pur : joue par `npm test` a la racine du depot (annonces.test.ts).
 */

import { masquer, proteger, type Affiche } from './cases';
import type { Mesure } from './mesures';

export const IMPRESSION = 'annonce.impression';
export const OUVERTURE = 'annonce.ouverture';
export const ACTION = 'annonce.action';
const DE_L_ENTONNOIR: ReadonlySet<string> = new Set([IMPRESSION, OUVERTURE, ACTION]);

export interface Entonnoir {
    readonly impressions: number;
    readonly ouvertures: number;
    readonly actions: number;
}

export const ENTONNOIR_VIDE: Entonnoir = { impressions: 0, ouvertures: 0, actions: 0 };

function ajouter(e: Entonnoir, m: Mesure): Entonnoir {
    if (m.evenement === IMPRESSION) return { ...e, impressions: e.impressions + m.n };
    if (m.evenement === OUVERTURE) return { ...e, ouvertures: e.ouvertures + m.n };
    if (m.evenement === ACTION) return { ...e, actions: e.actions + m.n };
    return e;
}

/** L'entonnoir des annonces que `garder` retient (toutes par defaut). */
export function entonnoir(mesures: readonly Mesure[], garder: (cle: string) => boolean = () => true): Entonnoir {
    let e = ENTONNOIR_VIDE;
    for (const m of mesures) if (garder(m.cle)) e = ajouter(e, m);
    return e;
}

/** Sous vingt au denominateur, un taux ne veut rien dire : il s'affiche grise (7-G). */
export const SEUIL_DE_TAUX = 20;

export interface Taux {
    /** `null` quand il ne se calcule pas, ou qu'il trahirait une petite case. */
    readonly valeur: number | null;
    /** Le denominateur est sous le seuil : le taux se lit, grise. */
    readonly fragile: boolean;
}

export function taux(numerateur: number, denominateur: number): Taux {
    if (denominateur === 0 || masquer(numerateur) === null || masquer(denominateur) === null) return { valeur: null, fragile: false };
    return { valeur: numerateur / denominateur, fragile: denominateur < SEUIL_DE_TAUX };
}

export function tauxDOuverture(e: Entonnoir): Taux {
    return taux(e.ouvertures, e.impressions);
}

export function tauxDAction(e: Entonnoir): Taux {
    return taux(e.actions, e.ouvertures);
}

export interface LigneDAnnonce extends Entonnoir {
    readonly cle: string;
}

/** Le classement des annonces de la periode : par impressions, puis par ouvertures. */
export function classement(mesures: readonly Mesure[]): LigneDAnnonce[] {
    const parCle = new Map<string, Entonnoir>();
    for (const m of mesures) {
        if (!DE_L_ENTONNOIR.has(m.evenement)) continue;
        parCle.set(m.cle, ajouter(parCle.get(m.cle) ?? ENTONNOIR_VIDE, m));
    }
    return [...parCle.entries()].map(([cle, e]) => ({ cle, ...e }));
}

/** L'entonnoir par campus : la comparaison de 7-G. Un campus vide se lit « ? ». */
export function entonnoirParCampus(mesures: readonly Mesure[], garder: (cle: string) => boolean): Map<string, Entonnoir> {
    const parCampus = new Map<string, Entonnoir>();
    for (const m of mesures) {
        if (!DE_L_ENTONNOIR.has(m.evenement) || !garder(m.cle)) continue;
        const campus = m.campus === '' ? '?' : m.campus;
        parCampus.set(campus, ajouter(parCampus.get(campus) ?? ENTONNOIR_VIDE, m));
    }
    return parCampus;
}

export interface EntonnoirAffiche {
    readonly impressions: Affiche;
    readonly ouvertures: Affiche;
    readonly actions: Affiche;
}

export interface LigneProtegee extends LigneDAnnonce {
    readonly affiche: EntonnoirAffiche;
}

/**
 * Les lignes d'un tableau d'entonnoir telles qu'elles s'affichent a cote de leur total — le chiffre cle
 * du classement, la ligne « Tous les campus » du rapport : chaque colonne protegee (cases.ts), puis,
 * sauf `trier: false` (les semaines, dans l'ordre du calendrier), triees par impressions visibles, les
 * impressions cachees en dernier, par cle. Triees par leur compte, elles diraient laquelle est la plus
 * grande.
 *
 * `secondaire: false` ne cache que les petites cases : la page Annonces, ou choisir une annonce redonne
 * ses chiffres exacts, et ou un secret secondaire cacherait les comptes utiles sans rien proteger.
 */
export function protegerLesLignes<L extends LigneDAnnonce>(lignes: readonly L[], { trier = true, secondaire = true }: { readonly trier?: boolean; readonly secondaire?: boolean } = {}): (L & LigneProtegee)[] {
    const cacher = (valeurs: readonly number[]): Affiche[] => (secondaire ? proteger(valeurs) : valeurs.map(masquer));
    const [impressions, ouvertures, actions] = (['impressions', 'ouvertures', 'actions'] as const).map((c) => cacher(lignes.map((l) => l[c])));
    const protegees = lignes.map((l, i) => ({ ...l, affiche: { impressions: impressions?.[i] ?? null, ouvertures: ouvertures?.[i] ?? null, actions: actions?.[i] ?? null } }));
    if (!trier) return protegees;
    return protegees.sort((a, b) => {
        const va = a.affiche.impressions;
        const vb = b.affiche.impressions;
        if (typeof va !== 'number' || typeof vb !== 'number') return Number(typeof va !== 'number') - Number(typeof vb !== 'number') || a.cle.localeCompare(b.cle);
        return vb - va || a.cle.localeCompare(b.cle);
    });
}

/** Un taux entre deux cases telles qu'elles s'affichent : rien si l'une est cachee, il la trahirait. */
export function tauxAffiche(numerateur: Affiche, denominateur: Affiche): Taux {
    if (typeof numerateur !== 'number' || typeof denominateur !== 'number') return { valeur: null, fragile: false };
    return taux(numerateur, denominateur);
}
