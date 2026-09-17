/**
 * L'occupation d'un batiment pour une journee : la couture entre le cache pur (occupationCache.ts) et
 * les runs de `ukit.celcat.occupation`.
 *
 * Memoire d'abord, puis le magasin si le lot est frais, sinon les runs — **une salle par run**, comme
 * avant (CampusApiService), lances en parallele — et l'ecriture. Dans la fenetre, seules les salles
 * absentes ou en echec sont rejouees. La cle porte le jour affiche : une date simulee ne relit jamais
 * l'occupation reelle, et TimeMockService purge le prefixe au changement de date.
 *
 * Ouvrir la fiche d'un batiment est un geste : les runs gardent l'origine `utilisateur`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CampusApiService } from './CampusApiService';
import type { BuildingInfo } from './FreeRoomService';
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

async function jouerLesSalles(roomIds: readonly string[], jour: string): Promise<OccupationSalle[]> {
    return Promise.all(roomIds.map(async (roomId) => {
        const resultat = await CampusApiService.fetchRoomsScheduleDay([roomId], jour);
        return resultat.ok === false ? { roomId, ok: false, events: [] } : { roomId, ok: true, events: resultat.events };
    }));
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
        const rejouees = await jouerLesSalles(aRelire, jour);
        const fusion = fusionner(cache, rejouees);
        if (estCachable(rejouees)) await ecrire(cle, fusion);
        return fusion.salles;
    }

    const salles = await jouerLesSalles(roomIds, jour);
    if (estCachable(salles)) await ecrire(cle, { horodatage: maintenant, salles });
    return salles;
}
