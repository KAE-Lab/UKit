/**
 * Les coordonnees collees : les formes reconnues, et celles qu'on refuse de deviner.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { lienOpenStreetMap, lireCoordonnees } from './coordonnees';

const FOYER = { lat: 44.80581, lng: -0.6041 };

test('le couple copie depuis Google Maps, avec ou sans espace', () => {
    expect(lireCoordonnees('44.80581, -0.60410')).toEqual(FOYER);
    expect(lireCoordonnees('  44.80581,-0.60410 ')).toEqual(FOYER);
    expect(lireCoordonnees('44.80581 -0.60410')).toEqual(FOYER);
    expect(lireCoordonnees('44.80581; -0.60410')).toEqual(FOYER);
});

test('deux nombres a la francaise, separes sans ambiguite', () => {
    expect(lireCoordonnees('44,80581 ; -0,60410')).toEqual(FOYER);
    expect(lireCoordonnees('44,80581, -0,60410')).toEqual(FOYER);
    expect(lireCoordonnees('44,80581 -0,60410')).toEqual(FOYER);
});

test('les adresses de carte portent le point', () => {
    expect(lireCoordonnees('https://www.google.com/maps/place/Foyer/@44.80581,-0.6041,17z/data=!3m1')).toEqual(FOYER);
    expect(lireCoordonnees('https://www.openstreetmap.org/#map=18/44.80581/-0.60410')).toEqual(FOYER);
    expect(lireCoordonnees('https://www.openstreetmap.org/?mlat=44.80581&mlon=-0.60410#map=18/44.8/-0.6')).toEqual(FOYER);
    expect(lireCoordonnees('https://maps.google.com/?q=44.80581,-0.60410')).toEqual(FOYER);
    // Une fiche de lieu : le repere, pas le centre de la vue.
    expect(lireCoordonnees('https://www.google.com/maps/place/Foyer/@44.8,-0.6,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d44.80581!4d-0.6041')).toEqual(FOYER);
});

test('une forme ambigue ou hors de la Terre ne devine rien', () => {
    expect(lireCoordonnees('44,80581,-0,60410')).toBeNull();
    expect(lireCoordonnees('44.8')).toBeNull();
    expect(lireCoordonnees('95.1, 10')).toBeNull();
    expect(lireCoordonnees('44.8, 190')).toBeNull();
    expect(lireCoordonnees('Place de la Victoire')).toBeNull();
    expect(lireCoordonnees('')).toBeNull();
});

test('le lien de verification ouvre OpenStreetMap sur le point', () => {
    expect(lienOpenStreetMap(FOYER)).toBe('https://www.openstreetmap.org/?mlat=44.80581&mlon=-0.6041#map=18/44.80581/-0.6041');
});
