/**
 * La liste des tables journalisees couvre toute ressource de la console qui s'ecrit, et rien de ce
 * qui est declare sans journal.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { TABLES_JOURNALISEES, TABLES_SANS_JOURNAL } from './journal';
import { RESSOURCES } from './tables';

test('chaque ressource qui s ecrit est journalisee, ou declaree sans journal', () => {
    for (const ressource of RESSOURCES) {
        const journalisee = TABLES_JOURNALISEES.includes(ressource.table);
        const declaree = TABLES_SANS_JOURNAL.includes(ressource.table);
        expect(journalisee || declaree, ressource.table).toBe(true);
        expect(journalisee && declaree, ressource.table).toBe(false);
    }
});

test('les tables journalisees sont uniques', () => {
    expect(new Set(TABLES_JOURNALISEES).size).toBe(TABLES_JOURNALISEES.length);
});
