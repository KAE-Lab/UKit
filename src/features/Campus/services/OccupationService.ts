/**
 * L'occupation d'un batiment pour une journee : la couture entre le cache pur (occupationCache.ts) et
 * `ukit.celcat.occupation`.
 *
 * Memoire d'abord, puis le magasin si le lot est frais, sinon **un run pour tout le batiment** (jalon
 * 7-I) — ses evenements rendus a leurs salles par attributionOccupation.ts — et l'ecriture. Dans la
 * fenetre, les salles absentes ou en echec sont rejouees, en un run sur ce seul sous-ensemble. La cle
 * porte le jour affiche : une date simulee ne relit jamais l'occupation reelle, et TimeMockService
 * purge le prefixe au changement de date.
 *
 * L'echec est tout ou rien : un run en echec vaut pour toutes ses salles, n'est pas mis en cache
 * (estCachable) et se rejoue a l'ouverture suivante. Un run par salle en laissait reussir quelques-unes ;
 * c'est une limite ecrite (docs/features/campus-salles-libres.md), pas un defaut a contourner ici.
 *
 * Ouvrir la fiche d'un batiment est un geste : le run garde l'origine `utilisateur`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { attribuerOccupation } from './attributionOccupation';
import { CampusApiService } from './CampusApiService';
import type { BuildingInfo, RoomInfo } from './FreeRoomService';
import {
    cleOccupation,
    estCachable,
    estFraiche,
    fusionner,
    lireOccupation,
    sallesARelire,
    type CacheOccupation,
    type OccupationSalle,
} from './occupationCache';

const memoire = new Map<string, CacheOccupation>();

async function lireLeMagasin(cle: string): Promise<CacheOccupation | null> {
    const enMemoire = memoire.get(cle);
    if (enMemoire !== undefined) return enMemoire;
    try {
        const cache = lireOccupation(await AsyncStorage.getItem(cle));
        if (cache !== null) memoire.set(cle, cache);
        return cache;
    } catch {
        return null;
    }
}

async function ecrire(cle: string, cache: CacheOccupation): Promise<void> {
    memoire.set(cle, cache);
    try {
        await AsyncStorage.setItem(cle, JSON.stringify(cache));
    } catch (erreur) {
        console.warn('[salles] cache d occupation non ecrit', erreur);
    }
}

async function jouerLesSalles(batiment: string, salles: readonly RoomInfo[], jour: string): Promise<OccupationSalle[]> {
    // Sans salle, le corps n'en nommerait aucune : il n'y a rien a demander au serveur.
    if (salles.length === 0) return [];
    const resultat = await CampusApiService.fetchRoomsScheduleDay(salles.map((salle) => salle.id), jour);
    if (resultat.ok === false) return salles.map((salle) => ({ roomId: salle.id, ok: false, events: [] }));

    const attribution = attribuerOccupation(salles, resultat.events);
    if (__DEV__) {
        console.info(`[salles] occupation ${batiment} ${jour} : un run pour ${salles.length} salle(s), ${attribution.ecartes} evenement(s) sans salle ecarte(s)`);
    }
    return attribution.salles;
}

export async function occupationDuBatiment(batiment: BuildingInfo, jour: string): Promise<readonly OccupationSalle[]> {
    const cle = cleOccupation(batiment.name, jour);
    const roomIds = batiment.rooms.map((room) => room.id);
    const cache = await lireLeMagasin(cle);
    const maintenant = Date.now();

    if (cache !== null && estFraiche(cache, maintenant)) {
        const aRelire = sallesARelire(cache, roomIds);
        if (__DEV__) console.info(`[salles] occupation ${batiment.name} ${jour} : cache, ${aRelire.length} salle(s) rejouee(s)`);
        if (aRelire.length === 0) return cache.salles;
        const rejouees = await jouerLesSalles(batiment.name, batiment.rooms.filter((room) => aRelire.includes(room.id)), jour);
        const fusion = fusionner(cache, rejouees);
        if (estCachable(rejouees)) await ecrire(cle, fusion);
        return fusion.salles;
    }

    const salles = await jouerLesSalles(batiment.name, batiment.rooms, jour);
    if (estCachable(salles)) await ecrire(cle, { horodatage: maintenant, salles });
    return salles;
}
