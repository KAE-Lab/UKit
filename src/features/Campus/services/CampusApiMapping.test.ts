/**
 * Ce que la projection des salles doit tenir.
 *
 * Deux choses se cassent sans bruit ici : la **correspondance textuelle** d'une salle vers son
 * batiment, qui decide de tout l'ecran des salles libres, et le traitement d'un evenement de
 * vacances, qui n'a pas d'heure de fin et qui est pourtant ce qui declare un batiment ferme.
 */

import { describe, expect, it } from 'vitest';

import { extractBuildingsFromRooms, occupationDuJour, projeterOccupation, projeterSalles } from './CampusApiMapping';

/** Des salles reelles, recopiees d'une reponse du serveur de l'universite. */
const SALLES = [
    { id: 'CREMI - Bât. A28 Salle 005', libelle: 'CREMI - Bât. A28 Salle 005 (CREMI - Bât. A28 Salle 005)' },
    { id: 'A1/ Salle 25', libelle: 'A1/ Salle 25 (A1/ Salle 25  - Cours/TD)' },
    { id: 'x', libelle: 'x' },
];

describe('projeterSalles', () => {
    it('ecarte les libelles trop courts et garde le libelle complet comme nom', () => {
        const salles = projeterSalles(SALLES);

        expect(salles).toHaveLength(2);
        expect(salles[0]).toEqual({
            id: 'CREMI - Bât. A28 Salle 005',
            name: 'CREMI - Bât. A28 Salle 005 (CREMI - Bât. A28 Salle 005)',
        });
    });
});

describe('projeterOccupation', () => {
    it('traite une fin nulle comme une date invalide, pas comme maintenant', () => {
        // Les vacances arrivent en journee entiere, `end` a `null`. `moment(undefined)` vaudrait
        // *maintenant* et rendrait la salle occupee a l'heure ou l'ecran s'ouvre.
        const evenement = projeterOccupation({
            id: '1',
            debut: '2025-10-27T08:00:00',
            fin: null,
            categorie: 'Vacances',
            description: 'Vacances\r\n\r\n<br />\r\n\r\n44\r\n',
        });

        expect(evenement.starttime).toBe('08:00');
        expect(evenement.endtime).toBe('Invalid date');
        expect(evenement.date.end).toBeNull();
        expect(evenement.isVacances).toBe(true);
    });

    it('detecte les vacances par la categorie ou par la description', () => {
        // La source utilise les deux : ne lire que la categorie laisserait un batiment ouvert un jour
        // ou il est ferme.
        expect(projeterOccupation({ categorie: 'Vacances', description: '' }).isVacances).toBe(true);
        expect(projeterOccupation({ categorie: 'Ferie', description: 'Vacances de Noel' }).isVacances).toBe(true);
        expect(projeterOccupation({ categorie: 'TD', description: 'A28' }).isVacances).toBe(false);
    });
});

describe('occupationDuJour', () => {
    it('refiltre sur la date exacte, parce que le serveur deborde', () => {
        // Mesure du 2026-08-09 : une journee demandee rend aussi le lendemain sur les evenements de
        // vacances, qui s'etalent. Sans ce filtre, un batiment serait ferme la veille de la fermeture.
        const brutes = [
            { id: '1', debut: '2025-10-27T08:00:00', fin: null, categorie: 'Vacances', description: '' },
            { id: '2', debut: '2025-10-28T08:00:00', fin: null, categorie: 'Vacances', description: '' },
        ];

        expect(occupationDuJour(brutes, '2025-10-27')).toHaveLength(1);
        expect(occupationDuJour(brutes, '2025-10-27')[0].id).toBe('1');
    });
});

describe('extractBuildingsFromRooms', () => {
    it('rattache les salles au batiment et ne garde que le numero', () => {
        // `A28` est la seule cle du referentiel portant `freeAccess: true` — voir
        // docs/features/campus-salles-libres.md.
        const batiments = extractBuildingsFromRooms([
            { id: '1', name: 'CREMI - Bât. A28 Salle 005 (Informatique)' },
            { id: '2', name: 'A1/ Salle 25' },
        ]);

        expect(batiments).toHaveLength(1);
        expect(batiments[0].name).toBe('A28');
        expect(batiments[0].id).toBe('bat_a28');
        expect(batiments[0].rooms).toHaveLength(1);
        // Le suffixe entre parentheses saute, puis le nom est tronque a partir de « salle ».
        expect(batiments[0].rooms[0].name).toBe('Salle 005');
        expect(batiments[0].rooms[0].fullName).toBe('CREMI - Bât. A28 Salle 005 (Informatique)');
    });

    it('ignore les salles « en attente » et les batiments sans salle', () => {
        expect(extractBuildingsFromRooms([{ id: '1', name: 'A28 - en attente' }])).toHaveLength(0);
        expect(extractBuildingsFromRooms([])).toHaveLength(0);
    });

    it('porte les horaires du referentiel, indexes par jour', () => {
        const batiment = extractBuildingsFromRooms([{ id: '1', name: 'CREMI - Bât. A28 Salle 005' }])[0];

        // Le champ etait declare `string | null` et ne l'a jamais ete : l'ecran le lit comme un
        // dictionnaire. Le type ment moins depuis le jalon 6-E.
        expect(batiment.schedule).toBeTypeOf('object');
        expect(batiment.campus).toBeTypeOf('string');
    });
});
