/**
 * L'etat d'une liste fait l'aller-retour par l'URL, et un filtre par defaut s'y leve explicitement.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { etatDepuisParams, paramsDepuisEtat } from './etatUrl';

const FILTRES = ['etat', 'active'];
const DEFAUTS = { etat: ['nouveau', 'en_attente'] };

test('sans rien, les defauts : premiere page, taille 50, filtre par defaut', () => {
    const etat = etatDepuisParams(new URLSearchParams(''), FILTRES, DEFAUTS);
    expect(etat.pagination).toEqual({ pageIndex: 0, pageSize: 50 });
    expect(etat.columnFilters).toEqual([{ id: 'etat', value: ['nouveau', 'en_attente'] }]);
    expect(etat.sorting).toEqual([]);
    expect(paramsDepuisEtat(etat, FILTRES, DEFAUTS).toString()).toBe('');
});

test('un filtre present et vide leve le defaut, une liste se lit et s ecrit avec des virgules', () => {
    const etat = etatDepuisParams(new URLSearchParams('f.etat=&f.active=true&page=3&taille=100&tri=recu_le.desc&q=inspe'), FILTRES, DEFAUTS);
    expect(etat.columnFilters).toEqual([{ id: 'active', value: 'true' }]);
    expect(etat.pagination).toEqual({ pageIndex: 2, pageSize: 100 });
    expect(etat.sorting).toEqual([{ id: 'recu_le', desc: true }]);
    expect(etat.globalFilter).toBe('inspe');
    const params = paramsDepuisEtat(etat, FILTRES, DEFAUTS);
    expect(params.get('f.etat')).toBe('');
    expect(params.get('f.active')).toBe('true');
    expect(params.get('page')).toBe('3');
    expect(params.get('tri')).toBe('recu_le.desc');
    expect(etatDepuisParams(new URLSearchParams('f.etat=traite,refuse'), FILTRES, DEFAUTS).columnFilters).toEqual([{ id: 'etat', value: ['traite', 'refuse'] }]);
});

test('une page ou une taille illisibles retombent sur les defauts', () => {
    const etat = etatDepuisParams(new URLSearchParams('page=abc&taille=7&tri=.desc'), [], {});
    expect(etat.pagination).toEqual({ pageIndex: 0, pageSize: 50 });
    expect(etat.sorting).toEqual([]);
});
