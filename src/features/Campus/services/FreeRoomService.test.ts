/**
 * Ce que le rangement par etage doit tenir.
 *
 * La convention — le chiffre des centaines du numero de salle donne l'etage — vaut pour tout le
 * campus, mais elle ne se lit que dans le nom **nettoye** : `fullName` commence par le code du
 * batiment (« A28 - Salle 001 »), dont les chiffres rangeraient tout au rez-de-chaussee. Les noms
 * de ces sondes sont ceux que le nettoyage de `extractBuildingsFromRooms` produit reellement.
 */

import { describe, expect, it } from 'vitest';

import { avecDistances, etageDeSalle, grouperParEtage, type BuildingInfo, type FreeRoomSlot } from './FreeRoomService';

const creneau = (name: string, durationMinutes: number): FreeRoomSlot => ({
    room: { id: name, name, fullName: `A28 - ${name}` },
    availableUntil: '18:00',
    durationMinutes,
});

describe('etageDeSalle', () => {
    it('lit le chiffre des centaines, zeros de tete compris', () => {
        expect(etageDeSalle('Salle 003')).toBe(0);
        expect(etageDeSalle('Salle 103')).toBe(1);
        expect(etageDeSalle('203')).toBe(2);
    });

    it('accepte un numero court ou prefixe d une lettre', () => {
        expect(etageDeSalle('Salle 12')).toBe(0);
        expect(etageDeSalle('Salle A101')).toBe(1);
    });

    it('rend null pour une salle sans numero', () => {
        expect(etageDeSalle('Amphi Duhem')).toBeNull();
    });
});

describe('grouperParEtage', () => {
    it('ordonne du plus bas au plus haut, salles sans numero en dernier', () => {
        const groupes = grouperParEtage([
            creneau('Salle 204', 60),
            creneau('Amphi Duhem', 240),
            creneau('Salle 004', 120),
            creneau('Salle 104', 90),
        ]);
        expect(groupes.map((g) => g.etage)).toEqual([0, 1, 2, null]);
    });

    it('conserve l ordre d arrivee dans chaque etage', () => {
        const groupes = grouperParEtage([
            creneau('Salle 010', 180),
            creneau('Salle 002', 120),
            creneau('Salle 007', 60),
        ]);
        expect(groupes).toHaveLength(1);
        expect(groupes[0].slots.map((s) => s.room.name)).toEqual(['Salle 010', 'Salle 002', 'Salle 007']);
    });

    it('rend une liste vide pour une liste vide', () => {
        expect(grouperParEtage([])).toEqual([]);
    });
});

describe('avecDistances', () => {
    const cache: BuildingInfo[] = [
        { id: 'A28', name: 'A28', rooms: [], lat: 44.8066, lng: -0.6053, distance: 0.36 },
        { id: 'sans', name: 'Sans coordonnees', rooms: [] },
    ];

    it('ne laisse aucune distance sans position, meme celle qu un calcul precedent avait posee', () => {
        expect(avecDistances(cache).map((batiment) => batiment.distance)).toEqual([undefined, undefined]);
    });

    it('calcule depuis la position, et laisse sans distance un batiment sans coordonnees', () => {
        const [a28, sans] = avecDistances(cache, 44.8066, -0.6053);
        expect(a28.distance).toBe(0);
        expect(sans.distance).toBeUndefined();
    });

    it('rend des copies : le referentiel partage ne change pas', () => {
        avecDistances(cache, 44.9, -0.5);
        expect(cache[0].distance).toBe(0.36);
    });
});
