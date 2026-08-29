/**
 * Ce que ces cas gardent, c'est la distinction « rien a signaler » / « on ne sait pas ».
 *
 * Elle ne se voit pas a la relecture et elle coute une phrase fausse a l'ecran quand on la prend a
 * l'envers : « aucun message non lu » affiche sur une lecture qui a echoue est exactement la donnee
 * fausse qui a l'air juste que la Phase 6 supprime.
 */

import { describe, expect, it } from 'vitest';

import { projeterWidget, valeurFraiche } from './projection';

const LU_LE = '2026-08-28T10:00:00.000Z';

describe('projeterWidget', () => {
    it('rend le nombre quand la source en donne un', () => {
        expect(projeterWidget({ repere: 'Réception (3)', nombre: 3 }, LU_LE).nombre).toBe(3);
    });

    it('rend zero quand le repere existe sans nombre : la source a repondu', () => {
        expect(projeterWidget({ repere: 'Réception', nombre: null }, LU_LE).nombre).toBe(0);
    });

    it('rend null sans repere : on ne sait pas, et ce n est pas zero', () => {
        expect(projeterWidget({ repere: '', nombre: null }, LU_LE).nombre).toBeNull();
        expect(projeterWidget({}, LU_LE).nombre).toBeNull();
    });

    it('accepte zero comme un vrai nombre lu', () => {
        expect(projeterWidget({ repere: 'Chronologie', nombre: 0 }, LU_LE).nombre).toBe(0);
    });

    it('ignore un nombre non fini plutot que de l afficher', () => {
        expect(projeterWidget({ repere: 'Chronologie', nombre: Number.NaN }, LU_LE).nombre).toBe(0);
    });

    it('prend le premier element non vide d une liste de details', () => {
        const valeur = projeterWidget(
            { repere: 'Chronologie', nombre: 2, detail: ['', '  ', 'Devoir de calcul'] },
            LU_LE,
        );
        expect(valeur.detail).toBe('Devoir de calcul');
    });

    it('rend un detail nul plutot qu une chaine vide', () => {
        expect(projeterWidget({ repere: 'x', detail: [] }, LU_LE).detail).toBeNull();
        expect(projeterWidget({ repere: 'x', detail: '   ' }, LU_LE).detail).toBeNull();
    });

    it('reporte l heure telle qu on la lui donne, sans jamais la lire elle-meme', () => {
        expect(projeterWidget({ repere: 'x' }, LU_LE).luLe).toBe(LU_LE);
    });
});

describe('valeurFraiche', () => {
    const maintenant = Date.parse('2026-08-28T12:00:00.000Z');
    const valeur = (luLe: string) => ({ nombre: 1, detail: null, luLe });

    it('accepte une lecture plus recente que la peremption', () => {
        expect(valeurFraiche(valeur('2026-08-28T11:50:00.000Z'), 20, maintenant)).toBe(true);
    });

    it('refuse une lecture plus vieille que la peremption', () => {
        expect(valeurFraiche(valeur('2026-08-28T11:00:00.000Z'), 20, maintenant)).toBe(false);
    });

    it('refuse une valeur absente ou une date illisible', () => {
        expect(valeurFraiche(undefined, 20, maintenant)).toBe(false);
        expect(valeurFraiche(valeur('jamais'), 20, maintenant)).toBe(false);
    });

    it('refuse une lecture datee du futur : une horloge qui recule ne fige pas le widget', () => {
        expect(valeurFraiche(valeur('2026-08-28T13:00:00.000Z'), 20, maintenant)).toBe(false);
    });
});
