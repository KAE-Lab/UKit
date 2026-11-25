import { describe, expect, test } from 'vitest';

import { ajouterAuParcours, echecsAJoindre, FRAICHEUR_DES_ECHECS_MS, parcoursAJoindre, TAILLE_DES_ECHECS, TAILLE_DU_PARCOURS } from './journalDeSession';

describe('le parcours de la session', () => {
    test('un ecran repete ne s\'ajoute pas, le plus ancien sort', () => {
        let parcours: string[] = [];
        for (const ecran of ['PlanningTab', 'PlanningTab', 'CampusTab', '']) parcours = ajouterAuParcours(parcours, ecran);
        expect(parcours).toEqual(['PlanningTab', 'CampusTab']);
        for (let i = 0; i < TAILLE_DU_PARCOURS + 3; i++) parcours = ajouterAuParcours(parcours, `Ecran${i}`);
        expect(parcours).toHaveLength(TAILLE_DU_PARCOURS);
        expect(parcours[parcours.length - 1]).toBe(`Ecran${TAILLE_DU_PARCOURS + 2}`);
    });

    test('joint sans les ecrans du formulaire, ni les repetitions que leur retrait rapproche', () => {
        expect(parcoursAJoindre(['CampusTab', 'Retour', 'CampusTab', 'MesRetours', 'Retour', 'SettingsTab', 'Crous']))
            .toEqual(['CampusTab', 'SettingsTab', 'Crous']);
        expect(parcoursAJoindre(['Retour', 'MesRetours'])).toEqual([]);
    });
});

describe('les echecs a joindre', () => {
    const maintenant = Date.parse('2026-11-25T12:00:00Z');

    test('les plus recents, une fois chacun, en minutes, sans les vieux ni les futurs', () => {
        const liste = [
            { hote: 'edt.u-bordeaux.fr', famille: 'unavailable', at: maintenant - 10 * 60_000 },
            { hote: 'api.croustillant.menu', famille: 'rejected', at: maintenant - FRAICHEUR_DES_ECHECS_MS - 1 },
            { hote: 'edt.u-bordeaux.fr', famille: 'unavailable', at: maintenant - 2 * 60_000 },
            { hote: 'webapi.affluences.com', famille: 'data', at: maintenant + 60_000 },
        ];
        expect(echecsAJoindre(liste, maintenant)).toEqual([{ hote: 'edt.u-bordeaux.fr', famille: 'unavailable', minutes: 2 }]);
    });

    test('cinq au plus', () => {
        const liste = Array.from({ length: 9 }, (_, i) => ({ hote: `hote${i}.fr`, famille: 'data', at: maintenant - i * 1000 }));
        expect(echecsAJoindre(liste, maintenant)).toHaveLength(TAILLE_DES_ECHECS);
    });
});
