/**
 * La file des mesures, pure : ce qu'une ligne porte, comment deux lignes se fusionnent, ce que la
 * memoire relit, et comment la file se decoupe et se borne avant de partir.
 *
 * Une ligne est un compteur : un evenement du vocabulaire, une cle courte, un jour — et une heure
 * pour les evenements qui la portent —, un campus, une version, une plateforme, le statut de testeur,
 * et un nombre. Rien d'autre (docs/mesure.md). Le meme compteur, compte deux fois, ne fait qu'une
 * ligne dont `n` monte : c'est la fusion par identite, la meme que le `on conflict` de la base.
 *
 * L'heure et le contexte sont recus en parametre, comme `Temps.ts` le fait pour l'heure : la couture
 * (index.ts) vient les chercher, et ce module reste jouable sous vitest.
 */

import type { Plateforme } from '../ciblage/ciblage';
import { EVENEMENTS, estUnEvenement, type Evenement } from './vocabulaire';

export interface LigneDeMesure {
    /** `AAAA-MM-JJ`, en heure locale de l'appareil. */
    readonly jour: string;
    /** `-1` pour le jour entier ; `0` a `23` pour les evenements a l'heure. */
    readonly heure: number;
    readonly evenement: Evenement;
    readonly cle: string;
    readonly campus: string;
    readonly version: string;
    readonly plateforme: Plateforme;
    readonly testeur: boolean;
    readonly n: number;
}

/** Ce que l'appareil sait de lui-meme quand il compte : la part stable d'une ligne. */
export interface ContexteDeMesure {
    readonly campus: string;
    readonly version: string;
    readonly plateforme: Plateforme;
    readonly testeur: boolean;
}

/** Au-dela, les jours les plus anciens partent : une file qui ne part jamais ne doit pas grossir sans fin. */
export const LIGNES_MAX = 500;
/** La taille d'un lot : celle que `compter` accepte (supabase/fonctions.sql). */
export const TAILLE_LOT = 200;

const FORME_JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Le jour et l'heure locaux d'un instant, tels que la mesure les range. */
export function jourEtHeure(date: Date): { jour: string; heure: number } {
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return { jour: `${date.getFullYear()}-${mois}-${jour}`, heure: date.getHours() };
}

/** La ligne d'un geste : la granularite de l'evenement decide si l'heure est gardee. */
export function ligneDe(evenement: Evenement, cle: string, contexte: ContexteDeMesure, date: Date, n = 1): LigneDeMesure {
    const { jour, heure } = jourEtHeure(date);
    return {
        jour,
        heure: EVENEMENTS[evenement].granularite === 'heure' ? heure : -1,
        evenement,
        cle,
        campus: contexte.campus,
        version: contexte.version,
        plateforme: contexte.plateforme,
        testeur: contexte.testeur,
        n,
    };
}

/** L'identite d'une ligne : tout sauf `n` — la cle du `on conflict` de la base. */
export function identiteDeLigne(ligne: LigneDeMesure): string {
    return [ligne.jour, ligne.heure, ligne.evenement, ligne.cle, ligne.campus, ligne.version, ligne.plateforme, ligne.testeur].join('|');
}

/** Ajoute une ligne a la file : la meme identite fait monter `n`, une autre s'ajoute. Rend une file neuve. */
export function fusionner(file: readonly LigneDeMesure[], ligne: LigneDeMesure): LigneDeMesure[] {
    const identite = identiteDeLigne(ligne);
    let trouvee = false;
    const fusionnee = file.map((existante) => {
        if (identiteDeLigne(existante) !== identite) return existante;
        trouvee = true;
        return { ...existante, n: existante.n + ligne.n };
    });
    return trouvee ? fusionnee : [...fusionnee, ligne];
}

function estUnInstant(l: Record<string, unknown>): boolean {
    return typeof l.jour === 'string' && FORME_JOUR.test(l.jour)
        && typeof l.heure === 'number' && Number.isInteger(l.heure) && l.heure >= -1 && l.heure <= 23;
}

function estUnContexte(l: Record<string, unknown>): boolean {
    return typeof l.campus === 'string' && typeof l.version === 'string'
        && (l.plateforme === 'ios' || l.plateforme === 'android') && typeof l.testeur === 'boolean';
}

function estUneLigne(valeur: unknown): valeur is LigneDeMesure {
    if (typeof valeur !== 'object' || valeur === null) return false;
    const l = valeur as Record<string, unknown>;
    return estUnInstant(l) && estUnEvenement(l.evenement) && typeof l.cle === 'string' && estUnContexte(l)
        && typeof l.n === 'number' && Number.isInteger(l.n) && l.n >= 1;
}

/** La file relue depuis le disque, defensive : une file illisible vaut une file vide, une ligne fausse est ecartee. */
export function lireFile(brut: string | null): LigneDeMesure[] {
    if (brut === null) return [];
    try {
        const contenu: unknown = JSON.parse(brut);
        return Array.isArray(contenu) ? contenu.filter(estUneLigne) : [];
    } catch {
        return [];
    }
}

/** Les lots a envoyer, dans l'ordre de la file. */
export function lots(file: readonly LigneDeMesure[]): LigneDeMesure[][] {
    const resultat: LigneDeMesure[][] = [];
    for (let debut = 0; debut < file.length; debut += TAILLE_LOT) {
        resultat.push(file.slice(debut, debut + TAILLE_LOT));
    }
    return resultat;
}

/** Borne la file : au-dela de LIGNES_MAX, les lignes des jours les plus anciens partent d'abord. */
export function borner(file: readonly LigneDeMesure[]): LigneDeMesure[] {
    if (file.length <= LIGNES_MAX) return [...file];
    // Un tri stable par jour : a jour egal, l'ordre de comptage est garde.
    const parAnciennete = [...file].sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
    return parAnciennete.slice(parAnciennete.length - LIGNES_MAX);
}

/** Retire de la file ce que la base vient d'accepter, en gardant ce qui a ete compte pendant l'envoi. */
export function soustraire(file: readonly LigneDeMesure[], envoyees: readonly LigneDeMesure[]): LigneDeMesure[] {
    const parties = new Map<string, number>();
    for (const ligne of envoyees) {
        const identite = identiteDeLigne(ligne);
        parties.set(identite, (parties.get(identite) ?? 0) + ligne.n);
    }
    const restante: LigneDeMesure[] = [];
    for (const ligne of file) {
        const reste = ligne.n - (parties.get(identiteDeLigne(ligne)) ?? 0);
        if (reste <= 0) continue;
        restante.push(reste === ligne.n ? ligne : { ...ligne, n: reste });
    }
    return restante;
}

/** La reponse de `compter`, relue defensivement : la base rend `{ comptes, rejetes }`, deux entiers. */
export function lireReponse(data: unknown): { comptes: number; rejetes: number } | null {
    if (typeof data !== 'object' || data === null) return null;
    const { comptes, rejetes } = data as { comptes?: unknown; rejetes?: unknown };
    return typeof comptes === 'number' && typeof rejetes === 'number' ? { comptes, rejetes } : null;
}
