/**
 * L'ordre des annonces : celui dans lequel un telephone les montre a un instant donne.
 *
 * Les parametres vivent en base — `epinglee`, `priorite`, `creneaux` (jalon 7-C) —, l'algorithme
 * dans l'application, et la console montre « l'ordre vu a telle heure » avec **ce meme module**
 * (jalon 7-F, branche par la 6.3 dans `BdeService`). Pur : aucun import de plateforme, l'instant
 * arrive en parametre comme partout dans le depot (`Temps.ts` : les fonctions pures ne lisent pas
 * l'heure, c'est l'appelant qui vient la chercher).
 *
 * ## La regle
 *
 * 1. les **epinglees** d'abord, avant toute rotation ;
 * 2. puis celles dont un **creneau est actif** a cet instant — un bon plan du midi passe devant a
 *    midi et redescend a 14 h ;
 * 3. puis la **priorite**, decroissante ;
 * 4. a egalite, une **rotation deterministe par heure** : le groupe est trie par identifiant puis
 *    tourne de « l'heure courante modulo sa taille ». Chaque annonce passe en tete a son tour, et
 *    deux appareils — ou la console — rendent le meme ordre a la meme heure, sans tirage au sort.
 *
 * ## Les creneaux
 *
 * `[{ "jours": [1, 2, 3], "de": "11:00", "a": "14:00" }]` : les jours en ISO (1 = lundi, 7 =
 * dimanche), les heures en `HH:MM` **de Paris**, comme toute l'application, le debut inclus et la
 * fin exclue. Une plage qui passe minuit (`22:00` → `02:00`) vaut le soir du jour coche et la nuit
 * qui suit. La colonne est un `jsonb` libre : la lecture est defensive, une plage malformee est
 * ignoree plutot que de casser la liste.
 *
 * L'heure de Paris se lit par `Intl.DateTimeFormat` avec son fuseau ; si l'environnement ne le
 * porte pas, l'heure locale de l'appareil fait foi — le parc est a Bordeaux.
 *
 * Voir docs/features/campus-vie-etudiante.md et docs/phase-7/7-f-console-annonces.md.
 */

export interface Creneau {
    /** Les jours ISO, 1 = lundi … 7 = dimanche. */
    readonly jours: readonly number[];
    /** `HH:MM`, heure de Paris, debut inclus. */
    readonly de: string;
    /** `HH:MM`, heure de Paris, fin exclue. */
    readonly a: string;
}

/** Ce que l'ordre lit d'une annonce, quelle que soit sa forme d'origine (ligne de base ou contrat). */
export interface ParametresDOrdre {
    readonly id: string;
    readonly epinglee: boolean;
    readonly priorite: number;
    readonly creneaux: readonly Creneau[];
}

/** L'instant, vu de Paris : le jour ISO et la minute de la journee. */
export interface InstantDeParis {
    readonly jour: number;
    readonly minutes: number;
}

const MINUTES_PAR_JOUR = 24 * 60;
const MS_PAR_HEURE = 3_600_000;
const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const JOURS_ISO: Readonly<Record<string, number>> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** `HH:MM` → la minute de la journee, ou `null` si la forme ne colle pas. */
export function minutesDe(heure: unknown): number | null {
    if (typeof heure !== 'string') return null;
    const trouve = HEURE.exec(heure);
    if (trouve === null) return null;
    return Number(trouve[1]) * 60 + Number(trouve[2]);
}

function joursValides(valeur: unknown): number[] | null {
    if (!Array.isArray(valeur)) return null;
    const jours = valeur.filter((jour): jour is number => Number.isInteger(jour) && jour >= 1 && jour <= 7);
    const uniques = [...new Set(jours)].sort((a, b) => a - b);
    return uniques.length > 0 ? uniques : null;
}

function creneauValide(valeur: unknown): Creneau | null {
    if (typeof valeur !== 'object' || valeur === null) return null;
    const brut = valeur as { readonly jours?: unknown; readonly de?: unknown; readonly a?: unknown };
    const jours = joursValides(brut.jours);
    if (jours === null || minutesDe(brut.de) === null || minutesDe(brut.a) === null) return null;
    return { jours, de: brut.de as string, a: brut.a as string };
}

/** La colonne `creneaux`, reduite a ce qui est exploitable. Defensif : elle peut venir d'un cache. */
export function lireCreneaux(valeur: unknown): Creneau[] {
    if (!Array.isArray(valeur)) return [];
    return valeur.map(creneauValide).filter((creneau): creneau is Creneau => creneau !== null);
}

/** Projette les trois colonnes d'une ligne, quelle que soit sa table ou son cache. */
export function projeterOrdre(ligne: {
    readonly id: unknown;
    readonly epinglee?: unknown;
    readonly priorite?: unknown;
    readonly creneaux?: unknown;
}): ParametresDOrdre {
    return {
        id: String(ligne.id ?? ''),
        epinglee: ligne.epinglee === true,
        priorite: typeof ligne.priorite === 'number' && Number.isFinite(ligne.priorite) ? ligne.priorite : 0,
        creneaux: lireCreneaux(ligne.creneaux),
    };
}

function instantLocal(date: Date): InstantDeParis {
    const jour = date.getDay();
    return { jour: jour === 0 ? 7 : jour, minutes: date.getHours() * 60 + date.getMinutes() };
}

/**
 * L'instant vu de Paris. `Intl` porte le fuseau ; a defaut, l'heure locale de l'appareil — le
 * parc est a Bordeaux, et une heure locale vaut mieux qu'un plantage.
 */
export function instantDeParis(date: Date): InstantDeParis {
    try {
        const parties = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(date);
        const valeur = (type: string) => parties.find((partie) => partie.type === type)?.value;
        const jour = JOURS_ISO[valeur('weekday') ?? ''];
        const heure = Number(valeur('hour'));
        const minute = Number(valeur('minute'));
        if (jour === undefined || Number.isNaN(heure) || Number.isNaN(minute)) return instantLocal(date);
        return { jour, minutes: (heure % 24) * 60 + minute };
    } catch {
        return instantLocal(date);
    }
}

function jourPrecedent(jour: number): number {
    return jour === 1 ? 7 : jour - 1;
}

/** Une plage couvre-t-elle l'instant ? Debut inclus, fin exclue ; une plage qui passe minuit deborde sur le jour suivant. */
export function creneauActif(creneaux: readonly Creneau[], instant: InstantDeParis): boolean {
    return creneaux.some((creneau) => {
        const de = minutesDe(creneau.de) ?? 0;
        const a = minutesDe(creneau.a) ?? 0;
        if (de === a) return false;
        if (de < a) return creneau.jours.includes(instant.jour) && instant.minutes >= de && instant.minutes < a;
        // Passe minuit : le soir du jour coche, ou la nuit qui suit — donc le debut du jour d'apres.
        return (creneau.jours.includes(instant.jour) && instant.minutes >= de)
            || (creneau.jours.includes(jourPrecedent(instant.jour)) && instant.minutes < a && instant.minutes < MINUTES_PAR_JOUR);
    });
}

interface Classee<T> {
    readonly annonce: T;
    readonly cle: string;
    readonly rang: readonly [number, number, number];
    readonly id: string;
}

function comparer<T>(a: Classee<T>, b: Classee<T>): number {
    for (let niveau = 0; niveau < 3; niveau += 1) {
        const ecart = (b.rang[niveau] ?? 0) - (a.rang[niveau] ?? 0);
        if (ecart !== 0) return ecart;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Tourne un groupe d'egalite de `decalage` places : le premier devient le dernier, `decalage` fois. */
function tourner<T>(groupe: readonly T[], decalage: number): T[] {
    if (groupe.length < 2) return [...groupe];
    const pas = decalage % groupe.length;
    return [...groupe.slice(pas), ...groupe.slice(0, pas)];
}

/**
 * L'ordre a un instant donne. `parametresDe` dit ou lire l'epinglage, la priorite et les creneaux
 * dans la forme que l'appelant manipule — la ligne de base cote console, le contrat cote application.
 */
export function ordonner<T>(annonces: readonly T[], instant: Date, parametresDe: (annonce: T) => ParametresDOrdre): T[] {
    const paris = instantDeParis(instant);
    const heure = Math.floor(instant.getTime() / MS_PAR_HEURE);
    const classees = annonces.map((annonce): Classee<T> => {
        const parametres = parametresDe(annonce);
        const rang: readonly [number, number, number] = [
            parametres.epinglee ? 1 : 0,
            creneauActif(parametres.creneaux, paris) ? 1 : 0,
            parametres.priorite,
        ];
        return { annonce, cle: rang.join('|'), rang, id: parametres.id };
    }).sort(comparer);

    const resultat: T[] = [];
    let groupe: T[] = [];
    let cleDuGroupe: string | null = null;
    for (const classee of classees) {
        if (cleDuGroupe !== null && classee.cle !== cleDuGroupe) {
            resultat.push(...tourner(groupe, heure));
            groupe = [];
        }
        cleDuGroupe = classee.cle;
        groupe.push(classee.annonce);
    }
    resultat.push(...tourner(groupe, heure));
    return resultat;
}
