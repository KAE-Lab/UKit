/**
 * Le parc actif, compte sur `jetons_push` : les appareils qui ont redepose leur jeton dans les
 * quatorze derniers jours (un depot tous les sept), testeurs exclus — la requete de reference de
 * docs/mesure.md. Et la regle des petites cases : la console n'affiche jamais une case sous cinq.
 *
 * Pur : joue par `npm test` a la racine du depot (parc.test.ts).
 */

export const FENETRE_JOURS = 14;
export const SEUIL_PETITE_CASE = 5;

export interface Jeton {
    readonly etablissement: unknown;
    readonly version: unknown;
    readonly plateforme: unknown;
    readonly testeur: unknown;
    readonly maj_le: unknown;
}

export interface Case {
    readonly cle: string;
    /** `null` sous le seuil : la case se lit « moins de 5 ». */
    readonly n: number | null;
}

export interface Parc {
    readonly total: number;
    readonly parCampus: readonly Case[];
    readonly parVersion: readonly Case[];
    readonly parPlateforme: readonly Case[];
}

function compter(valeurs: readonly string[]): readonly Case[] {
    const comptes = new Map<string, number>();
    for (const valeur of valeurs) comptes.set(valeur, (comptes.get(valeur) ?? 0) + 1);
    return [...comptes.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([cle, n]) => ({ cle, n: n < SEUIL_PETITE_CASE ? null : n }));
}

/** Compare deux versions `X.Y.Z` pour trier la plus recente d'abord. */
function plusRecente(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const d = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (d !== 0) return d;
    }
    return 0;
}

export function parcActif(jetons: readonly Jeton[], maintenant: Date): Parc {
    const limite = maintenant.getTime() - FENETRE_JOURS * 24 * 3_600_000;
    const actifs = jetons.filter((j) => j.testeur !== true && typeof j.maj_le === 'string' && new Date(j.maj_le).getTime() > limite);
    const texte = (v: unknown) => (typeof v === 'string' && v !== '' ? v : '?');
    return {
        total: actifs.length,
        parCampus: compter(actifs.map((j) => texte(j.etablissement))),
        parVersion: [...compter(actifs.map((j) => texte(j.version)))].sort((a, b) => plusRecente(a.cle, b.cle)),
        parPlateforme: compter(actifs.map((j) => texte(j.plateforme))),
    };
}

export function libelleDeCase(n: number | null): string {
    return n === null ? `moins de ${SEUIL_PETITE_CASE}` : String(n);
}
