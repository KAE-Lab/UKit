import { describe, expect, test } from 'vitest';

import { echecLisible, lireReponses, rangeesDuContexte, reponseValide } from './natif';

describe('le contexte joint d\'un retour de l\'application', () => {
    test('chaque bloc garde se lit, dans l\'ordre de l\'ecran ; un bloc retire manque', () => {
        const rangees = rangeesDuContexte({
            version: '7.0.0', appareil: 'Pixel 7', systeme: 'Android 15', langue: 'fr', theme: 'dark', onglet: 'Settings', reseau: 'hors_ligne',
            erreur: { famille: 'unavailable' }, echecs: [{ hote: 'api.croustillant.menu', famille: 'rejected', minutes: 3 }],
            parcours: ['CampusTab', 'CrousMenu'],
        });
        expect(rangees).toEqual([
            { intitule: 'Version', valeur: '7.0.0' },
            { intitule: 'Appareil et système', valeur: 'Pixel 7, Android 15' },
            { intitule: 'Langue et thème', valeur: 'fr, sombre' },
            { intitule: 'Onglet de départ', valeur: 'Réglages' },
            { intitule: 'Réseau', valeur: 'hors ligne' },
            { intitule: 'Erreur affichée', valeur: 'service indisponible' },
            { intitule: 'Derniers échecs de source', valeur: 'api.croustillant.menu, réponse inattendue, il y a 3 min' },
            { intitule: 'Écrans parcourus', valeur: 'CampusTab › CrousMenu' },
        ]);
        expect(rangeesDuContexte(null)).toEqual([]);
        expect(echecLisible({ hote: 'x' })).toBeNull();
    });
});

describe('les reponses', () => {
    test('dans l\'ordre de lecture, sans ligne hors forme', () => {
        expect(lireReponses([
            { id: 'b', texte: 'Deuxieme', cree_le: '2026-11-25T12:00:00Z' },
            { id: 'a', texte: 'Premiere', cree_le: '2026-11-25T11:00:00Z' },
            { id: 'c', texte: 3, cree_le: '2026-11-25T13:00:00Z' },
        ]).map((r) => r.id)).toEqual(['a', 'b']);
        expect(reponseValide('  ')).toBe(false);
        expect(reponseValide('Merci, corrigé dans la 7.0.1.')).toBe(true);
        expect(reponseValide('x'.repeat(2001))).toBe(false);
    });
});
