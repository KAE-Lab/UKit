/**
 * Ou manger entre deux cours (docs/phase-8/6-intelligence.md) : le trou de midi, les restaurants
 * ouverts a ce moment pres du batiment du cours suivant, et ce qui se dit de chacun. Pur : les
 * restaurants, les menus et ce que la communaute signale arrivent deja lus (OuMangerService.ts).
 *
 * Une suggestion, pas un classement : les restaurants se rangent par distance au batiment, que la
 * carte affiche, et rien d'autre ne pese. Ce qui en ecarte un se dit dans la specification : trop
 * loin, ferme a cette heure-la selon sa source, ou ferme aujourd'hui selon l'equipe ou la communaute.
 */

import { creneauxDeService, jourOuvre, type CreneauDeService } from '../../Campus/communaute/service';
import { getDistanceInKm } from '../../Campus/services/distance';
import type { CrousDayMenu } from '../../Campus/services/CrousMapping';
import { trousDuJour, type ElementDuJour, type Plage } from './carteDuJour';

/** Les heures du dejeuner, en minutes depuis minuit : un trou compte pour midi par sa part entre elles. */
export const MIDI: Plage = { debut: 11 * 60 + 30, fin: 14 * 60 };
/** La part d'un trou entre ces heures qui laisse le temps d'aller manger et de revenir. */
export const TROU_DE_MIDI_MINIMAL = 45;
/** Un service qui ne recouvre pas la fenetre d'au moins ceci ne laisse pas le temps d'un repas. */
export const REPAS_MINIMAL = 30;
/** Au-dela, l'aller et le retour mangent le trou : un quart d'heure de marche de chaque cote. */
export const RAYON_DE_MIDI_KM = 1;
/** Deux suggestions : la plus proche, et de quoi choisir. */
export const SUGGESTIONS = 2;

export interface TrouDeMidi<T> {
    /** La part du trou entre 11 h 30 et 14 h : ce que la carte propose. */
    readonly fenetre: Plage;
    /** Le premier cours apres le trou ; son batiment est le lieu de reference. `null` sans cours apres. */
    readonly coursSuivant: T | null;
}

/**
 * Le premier trou dont la part de midi dure `TROU_DE_MIDI_MINIMAL` ou plus, ou `null`. Le cours suivant
 * est le premier **cours** apres le trou : un rendez-vous du telephone n'a pas de batiment.
 */
export function trouDeMidi<T extends ElementDuJour>(elements: readonly T[]): TrouDeMidi<T> | null {
    for (const trou of trousDuJour(elements)) {
        const debut = Math.max(trou.debut, MIDI.debut);
        const fin = Math.min(trou.fin, MIDI.fin);
        if (fin - debut < TROU_DE_MIDI_MINIMAL) continue;
        return { fenetre: { debut, fin }, coursSuivant: trou.suivants.find((e) => e.source !== 'telephone') ?? null };
    }
    return null;
}

/**
 * Le creneau du service qui recouvre la fenetre d'au moins `REPAS_MINIMAL`, le jour donne (0 dimanche),
 * ou `null` : un jour hors de la portee lue, des horaires illisibles, un service qui ne tombe pas la.
 */
export function serviceDuMidi(lignes: readonly string[], jourDeLaSemaine: number, fenetre: Plage): CreneauDeService | null {
    if (!jourOuvre(lignes, jourDeLaSemaine)) return null;
    let meilleur: { creneau: CreneauDeService; recouvrement: number } | null = null;
    for (const creneau of creneauxDeService(lignes)) {
        const recouvrement = Math.min(creneau.fin, fenetre.fin) - Math.max(creneau.debut, fenetre.debut);
        if (recouvrement >= REPAS_MINIMAL && (meilleur === null || recouvrement > meilleur.recouvrement)) meilleur = { creneau, recouvrement };
    }
    return meilleur?.creneau ?? null;
}

/** Ce que le choix lit d'un restaurant. Un `CrousRestaurant` en est un. */
export interface RestaurantDeMidi {
    readonly id: string;
    readonly lat: number;
    readonly lon: number;
    readonly openingLines: readonly string[];
}

export interface Lieu {
    readonly lat: number;
    readonly lng: number;
}

export interface Choix<R> {
    readonly restaurant: R;
    readonly distanceKm: number;
    readonly service: CreneauDeService;
}

/**
 * Les restaurants a proposer, du plus proche au plus lointain : a moins de `RAYON_DE_MIDI_KM` du lieu,
 * un service pendant la fenetre, et pas ferme aujourd'hui (`fermes`, les identifiants que la communaute
 * ou l'equipe disent fermes).
 */
export function choisirLesRestaurants<R extends RestaurantDeMidi>(
    restaurants: readonly R[],
    demande: { readonly fenetre: Plage; readonly lieu: Lieu; readonly jourDeLaSemaine: number; readonly fermes: ReadonlySet<string> },
): Choix<R>[] {
    const choix: Choix<R>[] = [];
    for (const restaurant of restaurants) {
        if (!Number.isFinite(restaurant.lat) || !Number.isFinite(restaurant.lon) || demande.fermes.has(restaurant.id)) continue;
        const distanceKm = getDistanceInKm(demande.lieu.lat, demande.lieu.lng, restaurant.lat, restaurant.lon);
        if (distanceKm > RAYON_DE_MIDI_KM) continue;
        const service = serviceDuMidi(restaurant.openingLines, demande.jourDeLaSemaine, demande.fenetre);
        if (service !== null) choix.push({ restaurant, distanceKm, service });
    }
    return choix.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, SUGGESTIONS);
}

/**
 * Le plat qui dit ce qu'on mange a midi : le premier de la categorie dont le nom dit « plat », a
 * defaut le premier de la premiere categorie du midi. Une entree ne dit pas ce qu'on mange.
 */
export function platPrincipal(menu: CrousDayMenu | undefined): string | null {
    if (menu === undefined) return null;
    const categories = menu.midi.filter((categorie) => categorie.dishes.some((plat) => plat.trim() !== ''));
    const principale = categories.find((categorie) => /\bplats?\b|\bchaud/i.test(categorie.name)) ?? categories[0];
    const plat = principale?.dishes.find((un) => un.trim() !== '' && !un.trim().endsWith(':'));
    return plat === undefined ? null : plat.replace(/\s+/g, ' ').trim();
}
