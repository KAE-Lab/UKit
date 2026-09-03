/**
 * La memoire « vu » des messages de service, sur l'appareil.
 *
 * Un ensemble de cles dans AsyncStorage — pas dans le trousseau : ce n'est pas une donnee
 * personnelle, c'est un signet. Il est **par appareil, pas par compte**, parce qu'il n'y a pas de
 * compte : reinstaller, ou reinitialiser l'application, revoit les messages actifs, et c'est correct.
 *
 * Il ne s'elague que contre une **reponse reseau reussie**, jamais contre le cache : le cache peut
 * etre en retard, et une cle elaguee a tort ferait revenir un message deja ferme.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_CACHE = 'messages-vus@1';

let vus: Set<string> = new Set();
/**
 * La memoire a-t-elle ete lue depuis le disque ? Tant que non, elle ne s'ecrit pas : un `marquerVu`
 * ou un `elaguerVus` joue avant `chargerVus` ecraserait la memoire persistee par un ensemble vide.
 * C'est exactement le defaut vu sur appareil le 2026-09-03 — trois messages fermes qui revenaient a
 * chaque vraie relance, parce que le demarrage chargeait le cache des messages sans relire les vus.
 */
let chargee = false;

function lire(brut: string | null): Set<string> {
    if (brut === null) return new Set();
    try {
        const contenu = JSON.parse(brut);
        return new Set(Array.isArray(contenu) ? contenu.filter((cle): cle is string => typeof cle === 'string') : []);
    } catch {
        // Un signet illisible se jette : au pire, un message deja ferme revient une fois.
        return new Set();
    }
}

async function ecrire(): Promise<void> {
    try {
        await AsyncStorage.setItem(CLE_CACHE, JSON.stringify([...vus]));
    } catch (erreur) {
        console.warn(`[messages] memoire des vus non ecrite : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/** Les cles vues, telles que le module les connait. Vide tant que `chargerVus` n'a pas ete appele. */
export function vusConnus(): ReadonlySet<string> {
    return vus;
}

/** Relit la memoire depuis le disque. Joue une fois, au demarrage ; les ecritures l'attendent. */
export async function chargerVus(): Promise<ReadonlySet<string>> {
    try {
        vus = lire(await AsyncStorage.getItem(CLE_CACHE));
    } catch (erreur) {
        console.warn(`[messages] memoire des vus illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
    chargee = true;
    return vus;
}

export async function marquerVu(cle: string): Promise<void> {
    if (!chargee) await chargerVus();
    if (vus.has(cle)) return;
    vus = new Set([...vus, cle]);
    await ecrire();
}

/** Ne garde que les cles encore publiees. A n'appeler qu'apres une lecture reseau qui a abouti. */
export async function elaguerVus(clesPubliees: ReadonlySet<string>): Promise<void> {
    if (!chargee) await chargerVus();
    const gardees = [...vus].filter((cle) => clesPubliees.has(cle));
    if (gardees.length === vus.size) return;
    vus = new Set(gardees);
    await ecrire();
}

/** Tout oublier : la reinitialisation, et le menu de developpement. */
export async function oublierVus(): Promise<void> {
    vus = new Set();
    chargee = true;
    try {
        await AsyncStorage.removeItem(CLE_CACHE);
    } catch (erreur) {
        console.warn(`[messages] memoire des vus non effacee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}
