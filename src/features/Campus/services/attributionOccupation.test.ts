/**
 * Ce que l'attribution d'un run groupe doit tenir.
 *
 * Une erreur ici ne se voit pas a l'ecran : une salle privee de ses cours passe pour libre, et un
 * batiment prive de ses vacances reste ouvert. Les descriptions passent par `projeterOccupation`,
 * comme dans le service : c'est la forme decodee que la regle lit.
 */

import { describe, expect, it } from 'vitest';

import { projeterOccupation } from './CampusApiMapping';
import { attribuerOccupation } from './attributionOccupation';

/** Des libelles reels, tels que `ukit.celcat.salles` les rend. */
const S005 = { id: 'CREMI - Bât. A28 Salle 005', fullName: 'CREMI - Bât. A28 Salle 005 (CREMI - Bât. A28 Salle 005)' };
const S101 = { id: 'CREMI - Bât. A28 Salle 101', fullName: 'CREMI - Bât. A28 Salle 101 (CREMI - Bât. A28 Salle 101)' };
const S102 = { id: 'CREMI - Bât. A28 Salle 102', fullName: 'CREMI - Bât. A28 Salle 102 (CREMI - Bât. A28 Salle 102)' };

function evenement(id: string, description: string, categorie = 'TD Machine') {
    return projeterOccupation({ id, debut: '2026-09-22T08:00:00', fin: '2026-09-22T10:50:00', categorie, description });
}

function idsParSalle(resultat: ReturnType<typeof attribuerOccupation>): Record<string, string[]> {
    return Object.fromEntries(resultat.salles.map((salle) => [salle.roomId, salle.events.map((e) => e.id)]));
}

describe('attribuerOccupation', () => {
    it('reconnait la salle d une description reelle, entites HTML et sauts de ligne de Celcat compris', () => {
        // La fixture de sondes/mesures/test_comparaison.py : `B&#226;t.` avait d'abord fait conclure
        // qu'aucune description ne nommait sa salle.
        const cours = evenement('e1', 'TD Machine\r\n\r\n<br />\r\n\r\nINF1CIB1\r\n\r\n<br />\r\n\r\nCREMI - B&#226;t. A28 Salle 005\r\n');

        const resultat = attribuerOccupation([S005, S101], [cours]);

        expect(idsParSalle(resultat)).toEqual({ [S005.id]: ['e1'], [S101.id]: [] });
        expect(resultat.ecartes).toBe(0);
    });

    it('lit le libelle entier comme sans sa parenthese, aux blancs et a la casse pres', () => {
        const a101 = { id: '1', fullName: 'A28 - Salle 101 (CREMI)' };
        const a102 = { id: '2', fullName: 'A28 - Salle 102' };
        // La double espace hors de la parenthese : dedans, elle serait retiree avec elle et la
        // normalisation du libelle ne serait pas eprouvee.
        const salleDoubleEspace = { id: '3', fullName: 'A1/  Salle 25 (A1/ Salle 25 - Cours/TD)' };

        const resultat = attribuerOccupation(
            [a101, a102, salleDoubleEspace],
            [
                evenement('e1', 'Cours\n\nA28 - Salle 101'),
                evenement('e2', 'TP a28 - salle 101 (CREMI) et A28   -   Salle 102'),
                evenement('e3', 'TD;A1/ Salle 25;DUPONT Jean'),
            ],
        );

        expect(idsParSalle(resultat)).toEqual({ 1: ['e1', 'e2'], 2: ['e2'], 3: ['e3'] });
    });

    it('rend un cours multi-salles a chacune des salles qu il nomme', () => {
        const tp = evenement('tp', 'TD Machine\r\n\r\n<br />\r\n\r\nCREMI - B&#226;t. A28 Salle 101, CREMI - B&#226;t. A28 Salle 102\r\n');
        const examen = evenement('ex', 'Examen\r\n\r\n<br />\r\n\r\nCREMI - B&#226;t. A28 Salle 005, CREMI - B&#226;t. A28 Salle 101, CREMI - B&#226;t. A28 Salle 102');

        const resultat = attribuerOccupation([S005, S101, S102], [tp, examen]);

        expect(idsParSalle(resultat)).toEqual({ [S005.id]: ['ex'], [S101.id]: ['tp', 'ex'], [S102.id]: ['tp', 'ex'] });
    });

    it('donne les vacances a toutes les salles, pour que le batiment reste ferme', () => {
        // Celles du 2025-10-27, telles que Celcat les sert : aucune salle nommee, pas d'heure de fin.
        const vacances = projeterOccupation({
            id: 'v',
            debut: '2025-10-27T08:00:00',
            fin: null,
            categorie: 'Vacances',
            description: 'Vacances\r\n\r\n<br />\r\n\r\n44\r\n',
        });

        const resultat = attribuerOccupation([S005, S101], [vacances]);

        expect(resultat.salles.every((salle) => salle.events.length === 1 && salle.events[0].isVacances)).toBe(true);
        expect(resultat.ecartes).toBe(0);
    });

    it('ecarte et compte un evenement qui ne nomme aucune salle du lot', () => {
        const ailleurs = evenement('a', 'Cours;Amphi A22');
        const autreSalle = evenement('b', 'TP;CREMI - B&#226;t. A28 Salle 208');

        const resultat = attribuerOccupation([S005, S101], [ailleurs, autreSalle]);

        expect(idsParSalle(resultat)).toEqual({ [S005.id]: [], [S101.id]: [] });
        expect(resultat.ecartes).toBe(2);
    });

    it('rend une entree par salle, dans l ordre recu, chacune ok, meme sans evenement', () => {
        const resultat = attribuerOccupation([S101, S005], []);

        expect(resultat.salles).toEqual([
            { roomId: S101.id, ok: true, events: [] },
            { roomId: S005.id, ok: true, events: [] },
        ]);
        expect(resultat.ecartes).toBe(0);
    });
});
