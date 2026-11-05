/** Ce que l'agenda de la semaine doit tenir : la bonne date, le bon etat, les bons jours, les cours tries. */

import { describe, expect, it } from 'vitest';
import moment from 'moment';

import { coursDuJour, dateDuJour, etatDuJour, jourAffiche } from './agenda';
import type { PlanningEvent } from './PlanningAssembly';

const cours = (id: string, debut: string, categorie = 'TD', journeeEntiere = false) => ({
    id, starttime: debut, endtime: '18:00', category: categorie, journeeEntiere,
    date: { start: `2026-11-02T${debut}:00`, end: '2026-11-02T18:00:00' },
} as unknown as PlanningEvent);

describe('agenda de la semaine', () => {
    it('lit la date d un jour dans ses champs, puis dans son premier cours, puis dans son rang', () => {
        expect(dateDuJour({ date: '2026-11-02' }).format('YYYY-MM-DD')).toBe('2026-11-02');
        expect(dateDuJour({ courses: [cours('a', '09:30')] }).format('YYYY-MM-DD')).toBe('2026-11-02');
        expect(dateDuJour({}, moment('2026-11-04')).format('YYYY-MM-DD')).toBe('2026-11-04');
    });

    it('situe un jour par rapport a aujourd hui', () => {
        const instant = new Date(2026, 10, 5, 14, 0);
        expect(etatDuJour(moment('2026-11-05'), instant)).toBe('aujourdhui');
        expect(etatDuJour(moment('2026-11-04'), instant)).toBe('passe');
        expect(etatDuJour(moment('2026-11-06'), instant)).toBe('avenir');
    });

    it('trie les cours par heure, retire les creneaux vides et masques, met les journees entieres a part', () => {
        const { bandeaux, horaires } = coursDuJour([
            cours('b', '14:00'), cours('vide', '08:00', 'nocourse'), cours('a', '09:30'),
            cours('masque', '11:00', 'masked'), cours('jour', '00:00', 'Evenement', true),
        ]);
        expect(horaires.map((c) => c.id)).toEqual(['a', 'b']);
        expect(bandeaux.map((c) => c.id)).toEqual(['jour']);
    });

    it('montre toujours les jours de semaine, le week-end seulement s il porte un cours', () => {
        expect(jourAffiche(moment('2026-11-02'), 0)).toBe(true);
        expect(jourAffiche(moment('2026-11-07'), 0)).toBe(false);
        expect(jourAffiche(moment('2026-11-07'), 2)).toBe(true);
    });
});
