/**
 * La fusion des evenements du telephone avec les cours : le tri, les colonnes, les bandeaux.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import type { PlanningEvent, PlanningWeekDay } from './PlanningAssembly';
import { estDuTelephone, fusionnerJour, fusionnerSemaine, joursDeLaSemaine, separerJourneeEntiere } from './FusionTelephone';

function cours(subject: string, starttime: string, patch: Partial<PlanningEvent> = {}): PlanningEvent {
    return {
        id: subject, style: '', color: 'default', schedule: starttime, starttime, endtime: '', date: { start: '', end: '' },
        subject, description: '', category: '', group: '', ...patch,
    };
}

test('les jours de la semaine viennent de l index de colonne, lundi a samedi', () => {
    const jours = joursDeLaSemaine({ week: 37, year: 2026 });
    expect(jours.map((jour) => jour.format('YYYY-MM-DD'))).toEqual([
        '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12',
    ]);
});

test('une journee fusionnee est triee par heure, et rien ne change sans telephone', () => {
    const liste = [cours('Algo', '10:00'), cours('Maths', '08:00')];
    expect(fusionnerJour(liste, undefined)).toBe(liste);
    expect(fusionnerJour(liste, [])).toBe(liste);
    const fusion = fusionnerJour(liste, [cours('Dentiste', '09:00', { source: 'telephone' })]);
    expect(fusion.map((e) => e.subject)).toEqual(['Maths', 'Dentiste', 'Algo']);
    expect(liste).toHaveLength(2);
});

test('une semaine recoit chaque jour dans sa colonne, les autres colonnes restent les memes objets', () => {
    const semaine: PlanningWeekDay[] = Array.from({ length: 6 }, (_, i) => ({ dayNumber: String(i + 1), dayTimestamp: 0, courses: [] }));
    const telephone = new Map([['2026-09-09', [cours('Dentiste', '09:00', { source: 'telephone' })]]]);
    const fusion = fusionnerSemaine(semaine, joursDeLaSemaine({ week: 37, year: 2026 }), telephone);
    expect(fusion[2].courses.map((e) => e.subject)).toEqual(['Dentiste']);
    expect(fusion[0]).toBe(semaine[0]);
    expect(fusionnerSemaine(semaine, [], new Map())).toBe(semaine);
});

test('les journees entieres se separent des horaires', () => {
    const { bandeaux, horaires } = separerJourneeEntiere([cours('Ferie', '', { journeeEntiere: true }), cours('Maths', '08:00')]);
    expect(bandeaux.map((e) => e.subject)).toEqual(['Ferie']);
    expect(horaires.map((e) => e.subject)).toEqual(['Maths']);
    expect(estDuTelephone(cours('Maths', '08:00'))).toBe(false);
    expect(estDuTelephone(cours('Dentiste', '09:00', { source: 'telephone' }))).toBe(true);
});
