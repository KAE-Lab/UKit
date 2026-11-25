/**
 * Le parc actif, compte sur `jetons_push` : les appareils qui ont redepose leur jeton dans les
 * quatorze derniers jours (un depot tous les sept), testeurs exclus — la requete de reference de
 * docs/mesure.md. Un minorant : un appareil qui a coupe les notifications n'y est pas.
 *
 * La table ne garde que le dernier depot de chaque appareil : le parc d'il y a une semaine ne s'y lit
 * pas, et sa variation ne se calcule donc pas. Ce qui s'y lit, c'est la part de la 6.3 — la version
 * qui compte — a poser a cote des sessions, pour que personne ne lise une croissance la ou il y a une
 * mise a jour (7-G).
 *
 * Pur : joue par `npm test` a la racine du depot (parc.test.ts).
 */

import { casesDe, proteger, type Case } from './cases';

export const FENETRE_JOURS = 14;
/** La premiere version qui compte : rien avant elle n'arrive dans `mesures`. */
export const VERSION_DE_LA_MESURE = '6.3.0';

export interface Jeton {
    readonly etablissement: unknown;
    readonly version: unknown;
    readonly plateforme: unknown;
    readonly testeur: unknown;
    readonly maj_le: unknown;
}

export interface Parc {
    readonly total: number;
    readonly parCampus: readonly Case[];
    readonly parVersion: readonly Case[];
    readonly parPlateforme: readonly Case[];
    /** La part du parc en 6.3 ou plus recente ; `null` quand elle trahirait une petite case. */
    readonly partMesuree: number | null;
}

function compter(valeurs: readonly string[]): Map<string, number> {
    const comptes = new Map<string, number>();
    for (const valeur of valeurs) comptes.set(valeur, (comptes.get(valeur) ?? 0) + 1);
    return comptes;
}

/** Compare deux versions `X.Y.Z` pour trier la plus recente d'abord. */
export function plusRecente(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const d = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (d !== 0) return d;
    }
    return 0;
}

/** `avecTesteurs` : la bascule des statistiques ; le parc de reference les exclut. */
export function parcActif(jetons: readonly Jeton[], maintenant: Date, avecTesteurs = false): Parc {
    const limite = maintenant.getTime() - FENETRE_JOURS * 24 * 3_600_000;
    const actifs = jetons.filter((j) => (avecTesteurs || j.testeur !== true) && typeof j.maj_le === 'string' && new Date(j.maj_le).getTime() > limite);
    const texte = (v: unknown) => (typeof v === 'string' && v !== '' ? v : '?');
    const versions = actifs.map((j) => texte(j.version));
    const mesurees = versions.filter((v) => v !== '?' && plusRecente(v, VERSION_DE_LA_MESURE) <= 0).length;
    return {
        total: actifs.length,
        parCampus: casesDe(compter(actifs.map((j) => texte(j.etablissement)))),
        parVersion: casesDe(compter(versions)).sort((a, b) => plusRecente(a.cle, b.cle)),
        parPlateforme: casesDe(compter(actifs.map((j) => texte(j.plateforme)))),
        // Une part se lit avec le total : elle redonnerait les deux comptes, qui doivent pouvoir s'afficher.
        partMesuree: actifs.length > 0 && proteger([mesurees, actifs.length - mesurees]).every((a) => typeof a === 'number') ? mesurees / actifs.length : null,
    };
}
