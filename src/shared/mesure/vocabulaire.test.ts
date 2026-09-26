/**
 * Le vocabulaire : chaque evenement porte une granularite, et sa cle a une forme — rien d'autre ne
 * passe. C'est la garantie, cote appareil, qu'aucun texte saisi ne devient un compteur.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { CLE_MAX, CLES_ONGLET, cleValide, estUnEvenement, EVENEMENTS, ONGLETS } from './vocabulaire';

test('chaque evenement porte une granularite et un validateur', () => {
    for (const description of Object.values(EVENEMENTS)) {
        expect(['heure', 'jour']).toContain(description.granularite);
        expect(typeof description.cle).toBe('function');
    }
    expect(estUnEvenement('session')).toBe(true);
    expect(estUnEvenement('recherche')).toBe(false);
    expect(estUnEvenement(42)).toBe(false);
});

test('les evenements sans cle n acceptent que la chaine vide', () => {
    expect(cleValide('session', '')).toBe(true);
    expect(cleValide('session', 'x')).toBe(false);
    expect(cleValide('planning.jour', '')).toBe(true);
    expect(cleValide('planning.semaine', 'jour')).toBe(false);
});

test('les cles enumerees sont fermees', () => {
    expect(cleValide('onglet.vu', 'planning')).toBe(true);
    expect(cleValide('onglet.vu', 'Planning')).toBe(false);
    expect(cleValide('scolarite.connexion', 'ok')).toBe(true);
    expect(cleValide('scolarite.connexion', 'timeout')).toBe(false);
    expect(cleValide('reglage.theme', 'dark')).toBe(true);
    expect(cleValide('reglage.langue', 'de')).toBe(false);
    expect(cleValide('reglage.synchro', 'off')).toBe(true);
    expect(cleValide('reglage.notifications', 'rappels:on')).toBe(true);
    expect(cleValide('reglage.notifications', 'rappels')).toBe(false);
});

test('un identifiant de contenu passe, un texte saisi non', () => {
    expect(cleValide('annonce.impression', '3f2c9b6e-1a4d-4c8e-9b7a-0d1e2f3a4b5c')).toBe(true);
    expect(cleValide('resto.ouverture', '21')).toBe(true);
    expect(cleValide('salles.ouverture', 'A28')).toBe(true);
    expect(cleValide('annonce.ouverture', 'bonjour tout le monde')).toBe(false);
    expect(cleValide('annonce.action', '')).toBe(false);
    expect(cleValide('bu.ouverture', 'a'.repeat(CLE_MAX))).toBe(true);
    expect(cleValide('bu.ouverture', 'a'.repeat(CLE_MAX + 1))).toBe(false);
});

test('un echec de source est un hote et une famille', () => {
    expect(cleValide('source.echec', 'celcat.u-bordeaux.fr:unavailable')).toBe(true);
    expect(cleValide('source.echec', 'localhost:8787:unavailable')).toBe(true);
    expect(cleValide('source.echec', 'ukit.celcat.jour:rejected')).toBe(true);
    expect(cleValide('source.echec', 'unavailable')).toBe(false);
    expect(cleValide('source.echec', 'Celcat.U-Bordeaux.fr:unavailable')).toBe(false);
});

test('chaque onglet de la barre a sa cle', () => {
    expect([...Object.values(ONGLETS)].sort()).toEqual([...CLES_ONGLET].sort());
    expect(Object.keys(ONGLETS)).toEqual(['PlanningTab', 'CampusTab', 'ScolariteTab', 'SettingsTab']);
});
