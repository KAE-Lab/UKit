/**
 * La periode des statistiques : des jours `AAAA-MM-JJ`, bornes comprises, tels que `mesures.jour` les
 * porte — le jour local de l'appareil qui a compte, pas un instant UTC. Tout se calcule sur ces
 * chaines, sans fuseau : `Date.UTC` sert d'arithmetique, jamais d'horloge.
 *
 * Choisie une fois, elle vaut pour toutes les pages (7-G) et voyage dans l'adresse, comme le reste de
 * la console : `?periode=28` pour un prereglage, `?du=2026-11-17&au=2026-11-23` pour une plage. Une
 * adresse hors forme retombe sur le prereglage par defaut, sans erreur : elle vient d'un lien colle.
 *
 * Pur : joue par `npm test` a la racine du depot (periode.test.ts).
 */

export interface Periode {
    readonly du: string;
    readonly au: string;
}

/** Un prereglage compte les derniers jours complets : aujourd'hui, encore partiel, fausserait la variation. */
export const PREREGLAGES = [
    { valeur: '7', jours: 7, libelle: '7 derniers jours' },
    { valeur: '28', jours: 28, libelle: '28 derniers jours' },
    { valeur: '90', jours: 90, libelle: '90 derniers jours' },
] as const;
export type Prereglage = (typeof PREREGLAGES)[number]['valeur'];
export const PREREGLAGE_PAR_DEFAUT: Prereglage = '7';

/** La conservation est de treize mois (docs/mesure.md) : au-dela, il n'y a plus rien a lire. */
export const DUREE_MAXIMALE = 400;

const JOUR_MS = 86_400_000;
const FORME = /^(\d{4})-(\d{2})-(\d{2})$/;

function enUtc(jour: string): number {
    const m = FORME.exec(jour);
    if (m === null) return Number.NaN;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function depuisUtc(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}

/** Une chaine `AAAA-MM-JJ` qui designe un jour qui existe (pas le 31 novembre). */
export function estUnJour(valeur: string): boolean {
    const ms = enUtc(valeur);
    return !Number.isNaN(ms) && depuisUtc(ms) === valeur;
}

/** Le jour local d'un instant, comme l'appareil l'aurait ecrit. */
export function jourLocal(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

export function decaler(jour: string, n: number): string {
    return depuisUtc(enUtc(jour) + n * JOUR_MS);
}

/** Le nombre de jours de la periode, bornes comprises. */
export function duree(periode: Periode): number {
    return Math.round((enUtc(periode.au) - enUtc(periode.du)) / JOUR_MS) + 1;
}

export function joursDe(periode: Periode): string[] {
    return Array.from({ length: duree(periode) }, (_, i) => decaler(periode.du, i));
}

/** La periode de meme duree qui finit la veille de celle-ci : la base de la variation. */
export function precedente(periode: Periode): Periode {
    const n = duree(periode);
    return { du: decaler(periode.du, -n), au: decaler(periode.du, -1) };
}

/**
 * Le premier jour d'une periode precedente comparable. La 6.3.1, qui porte la mesure, est en ligne sur
 * les deux stores le 2026-11-18 : avant, presque rien ne comptait, et le parc se met encore a jour deux
 * semaines apres — le delai que 7-G donnait a la 6.3 avant que les courbes disent quelque chose. Une
 * periode precedente qui commence plus tot compte l'adoption, pas l'usage : le 25 novembre, la console
 * montrait des variations a quatre chiffres. La regle est une date, pas un seuil sur les
 * chiffres : un seuil cacherait aussi la vraie flambee d'echecs d'une source qui tombe.
 */
const COMPARABLE_DES = '2026-12-02';

/** Une periode precedente se compare quand la mesure y avait deja tout le parc. */
export function estComparable(precedente: Periode): boolean {
    return precedente.du >= COMPARABLE_DES;
}

/** Les `n` derniers jours complets : la periode finit hier. */
export function derniersJours(n: number, maintenant: Date): Periode {
    const hier = decaler(jourLocal(maintenant), -1);
    return { du: decaler(hier, -(n - 1)), au: hier };
}

/** Le lundi de la semaine d'un jour. */
export function lundiDe(jour: string): string {
    const jourDeSemaine = new Date(enUtc(jour)).getUTCDay();
    return decaler(jour, -((jourDeSemaine + 6) % 7));
}

/**
 * Les tranches de lecture : des semaines entieres, du lundi au dimanche, qui couvrent la periode.
 * Calees sur le calendrier, elles se retrouvent d'une periode a l'autre et le cache les reprend : la
 * semaine de la vue d'ensemble est celle que le tableau de bord a deja lue.
 */
export function tranchesDe(periode: Periode): Periode[] {
    const tranches: Periode[] = [];
    for (let lundi = lundiDe(periode.du); lundi <= periode.au; lundi = decaler(lundi, 7)) {
        tranches.push({ du: lundi, au: decaler(lundi, 6) });
    }
    return tranches;
}

/** Les semaines du rapport partenaire : du lundi au dimanche, rognees aux bornes de la periode. */
export function semainesDe(periode: Periode): Periode[] {
    return tranchesDe(periode).map((s) => ({ du: s.du < periode.du ? periode.du : s.du, au: s.au > periode.au ? periode.au : s.au }));
}

export function contient(periode: Periode, jour: string): boolean {
    return jour >= periode.du && jour <= periode.au;
}

export interface ChoixDePeriode {
    readonly periode: Periode;
    /** `null` pour une plage choisie a la main. */
    readonly prereglage: Prereglage | null;
}

function prereglageDe(valeur: string | null): (typeof PREREGLAGES)[number] | undefined {
    return PREREGLAGES.find((p) => p.valeur === valeur);
}

/** La periode que l'adresse designe : une plage valide d'abord, un prereglage ensuite, le defaut sinon. */
export function periodeDepuisParams(params: URLSearchParams, maintenant: Date): ChoixDePeriode {
    const du = params.get('du');
    const au = params.get('au');
    if (du !== null && au !== null && estUnJour(du) && estUnJour(au) && du <= au) {
        const plage = { du, au };
        if (duree(plage) <= DUREE_MAXIMALE) return { periode: plage, prereglage: null };
    }
    const prereglage = prereglageDe(params.get('periode')) ?? prereglageDe(PREREGLAGE_PAR_DEFAUT);
    const jours = prereglage?.jours ?? 7;
    return { periode: derniersJours(jours, maintenant), prereglage: prereglage?.valeur ?? PREREGLAGE_PAR_DEFAUT };
}

/** Ecrit le choix dans des parametres d'adresse, sans toucher aux autres. */
export function poserPeriode(params: URLSearchParams, choix: { readonly prereglage: Prereglage } | { readonly periode: Periode }): URLSearchParams {
    const suite = new URLSearchParams(params);
    suite.delete('periode');
    suite.delete('du');
    suite.delete('au');
    if ('prereglage' in choix) {
        if (choix.prereglage !== PREREGLAGE_PAR_DEFAUT) suite.set('periode', choix.prereglage);
    } else {
        suite.set('du', choix.periode.du);
        suite.set('au', choix.periode.au);
    }
    return suite;
}

const LOCALE = 'fr-FR';
const FORMAT_JOUR = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const FORMAT_PLAGE = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const FORMAT_JOUR_DE_SEMAINE = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** « 17 nov. » : l'axe d'une courbe. */
export function libelleCourt(jour: string): string {
    return FORMAT_JOUR.format(new Date(enUtc(jour)));
}

/** « mar. 17 nov. » : la bulle d'une courbe, la ligne d'un tableau. */
export function libelleDuJour(jour: string): string {
    return FORMAT_JOUR_DE_SEMAINE.format(new Date(enUtc(jour)));
}

/** « 17–23 novembre 2026 » : l'en-tete d'une page, le rapport. */
export function libelleDePeriode(periode: Periode): string {
    if (periode.du === periode.au) return FORMAT_PLAGE.format(new Date(enUtc(periode.du)));
    return FORMAT_PLAGE.formatRange(new Date(enUtc(periode.du)), new Date(enUtc(periode.au)));
}
