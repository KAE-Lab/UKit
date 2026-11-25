/**
 * Les agregats des statistiques, calcules dans la console a partir des lignes de `mesures` : ni vue ni
 * fonction qui calcule dans la base (docs/backend.md). Chaque somme est celle de la requete faite a la
 * main dans docs/mesure.md (« Lire les chiffres ») : `sum(n)`, testeurs exclus, `jour` dans la periode.
 * C'est elle que le plan de test de 7-G compare au SQL.
 *
 * Pur : joue par `npm test` a la racine du depot (agregats.test.ts).
 */

import { masquer, proteger, type Affiche } from './cases';
import type { Mesure } from './mesures';
import { contient, estComparable, type Periode } from './periode';

export interface Filtre {
    /** Les appareils testeurs sont exclus par defaut ; la bascule les reintegre (7-G). */
    readonly testeurs: boolean;
    /** Le campus du filtre global de la console, ou `null` pour tous. */
    readonly campus: string | null;
}

/** Les lignes de la periode qui passent le filtre. */
export function filtrer(mesures: readonly Mesure[], periode: Periode, filtre: Filtre): Mesure[] {
    return mesures.filter((m) => contient(periode, m.jour)
        && (filtre.testeurs || !m.testeur)
        && (filtre.campus === null || m.campus === filtre.campus));
}

export function somme(mesures: readonly Mesure[], evenement: string, cle?: string): number {
    let total = 0;
    for (const m of mesures) if (m.evenement === evenement && (cle === undefined || m.cle === cle)) total += m.n;
    return total;
}

/** La somme par jour, un nombre par jour de `jours`, zero pour un jour sans ligne. */
export function parJour(mesures: readonly Mesure[], evenement: string, jours: readonly string[], garder: (m: Mesure) => boolean = () => true): number[] {
    const index = new Map(jours.map((jour, i) => [jour, i]));
    const sommes = jours.map(() => 0);
    for (const m of mesures) {
        if (m.evenement !== evenement || !garder(m)) continue;
        const i = index.get(m.jour);
        if (i !== undefined) sommes[i] = (sommes[i] ?? 0) + m.n;
    }
    return sommes;
}

export type Dimension = 'campus' | 'version' | 'plateforme' | 'cle';

/** La somme d'un evenement par valeur d'une colonne. Une cle vide se lit « ? » : la base l'autorise pour le campus. */
export function par(mesures: readonly Mesure[], evenement: string, dimension: Dimension): Map<string, number> {
    const comptes = new Map<string, number>();
    for (const m of mesures) {
        if (m.evenement !== evenement) continue;
        const valeur = m[dimension] === '' ? '?' : m[dimension];
        comptes.set(valeur, (comptes.get(valeur) ?? 0) + m.n);
    }
    return comptes;
}

/**
 * La variation d'une periode sur la precedente, en fraction (0,12 pour +12 %). `null` quand elle ne
 * se dit pas : une periode precedente d'avant l'adoption de la 6.3 (`estComparable`), rien avant, ou
 * l'un des deux comptes est une petite case — la variation le trahirait. La periode est un argument
 * pour qu'aucune page ne l'oublie.
 */
export function variation(courant: number, precedent: number, periodePrecedente: Periode): number | null {
    if (!estComparable(periodePrecedente)) return null;
    if (precedent === 0 || masquer(courant) === null || masquer(precedent) === null) return null;
    return (courant - precedent) / precedent;
}

export interface PointAffiche {
    readonly jour: string;
    readonly valeur: Affiche;
}

/**
 * Une serie par jour telle qu'elle s'affiche — la courbe et son tableau. Son total se lit a cote, dans
 * le chiffre cle : un jour sous cinq se retrouverait par difference, d'ou le secret secondaire (cases.ts).
 */
export function serieAffichee(jours: readonly string[], valeurs: readonly number[]): PointAffiche[] {
    const affiches = proteger(valeurs);
    return jours.map((jour, i) => ({ jour, valeur: affiches[i] ?? null }));
}
