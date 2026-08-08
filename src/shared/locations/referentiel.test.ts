/**
 * Ce que la surcouche du referentiel doit tenir.
 *
 * Le risque est unique et il est silencieux : une colonne nulle qui effacerait une coordonnee
 * embarquee. L'ecran n'afficherait alors ni erreur ni message — juste une carte au mauvais endroit,
 * ou pas de carte du tout. C'est exactement ce que la fusion champ par champ evite, et ce que ce
 * fichier verrouille.
 */

import { describe, expect, it } from 'vitest';

import { fusionner, projeterBatiment } from './referentiel';
import type { BatimentRow } from '../supabase/types';

const SOCLE = {
    A28: { lat: 44.807755, lng: -0.597381, freeAccess: true, image: 'embarque.jpg' },
    A0: { lat: 44.806872, lng: -0.599979 },
};

function ligne(partial: Partial<BatimentRow>): BatimentRow {
    return {
        code: 'A28',
        nom: 'A28',
        campus: null,
        latitude: null,
        longitude: null,
        acces_libre: false,
        horaires: null,
        image_url: null,
        ...partial,
    } as BatimentRow;
}

describe('projeterBatiment', () => {
    it('omet les colonnes nulles au lieu de les convertir', () => {
        expect(projeterBatiment(ligne({ latitude: 44.1, longitude: -0.5 }))).toEqual({
            lat: 44.1,
            lng: -0.5,
            freeAccess: false,
        });
    });

    it('porte les horaires tels que la base les stocke', () => {
        const ref = projeterBatiment(ligne({ horaires: { '1': { open: '08:00', close: '19:00' } } }));
        expect(ref.schedule).toEqual({ '1': { open: '08:00', close: '19:00' } });
    });

    it('ignore un visuel vide', () => {
        expect(projeterBatiment(ligne({ image_url: '' })).image).toBeUndefined();
    });
});

describe('fusionner', () => {
    it('corrige un champ sans toucher aux autres', () => {
        const fusion = fusionner(SOCLE, { A28: { image: 'publie.jpg' } });

        expect(fusion.A28).toEqual({
            lat: 44.807755,
            lng: -0.597381,
            freeAccess: true,
            image: 'publie.jpg',
        });
    });

    it('n efface jamais une valeur embarquee avec une colonne absente', () => {
        // La sonde du jalon : une ligne partielle en base ne doit pas faire disparaitre une carte.
        const fusion = fusionner(SOCLE, { A28: { freeAccess: false } });

        expect(fusion.A28.lat).toBe(44.807755);
        expect(fusion.A28.image).toBe('embarque.jpg');
        expect(fusion.A28.freeAccess).toBe(false);
    });

    it('laisse intact un lieu que la surcouche ne mentionne pas', () => {
        expect(fusionner(SOCLE, { A28: { lat: 1 } }).A0).toEqual(SOCLE.A0);
    });

    it('ajoute un lieu absent du socle', () => {
        // Ajouter est volontaire ici, alors que la livraison des Blueprints le refuse : un Blueprint
        // est de la donnee executable, un batiment est une coordonnee.
        const fusion = fusionner(SOCLE, { B99: { lat: 44.5, lng: -0.6 } });
        expect(fusion.B99).toEqual({ lat: 44.5, lng: -0.6 });
    });

    it('ne mute pas le socle', () => {
        fusionner(SOCLE, { A28: { image: 'publie.jpg' } });
        expect(SOCLE.A28.image).toBe('embarque.jpg');
    });
});
