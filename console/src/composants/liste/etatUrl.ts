/**
 * L'etat d'une liste dans l'URL : la recherche, la page, la taille de page, le tri, les filtres.
 * `#/annonces?q=soiree&page=2&tri=titre&f.active=true` se recharge, se partage, et survit a
 * l'ouverture d'une ligne. Pur, joue par etatUrl.test.ts.
 *
 * Un filtre absent prend sa valeur par defaut (les retours ouverts) ; present et vide, il est leve.
 */

import type { EtatDeTable } from '../../lib/requete';

export const TAILLES_DE_PAGE: readonly number[] = [25, 50, 100];
export const TAILLE_PAR_DEFAUT = 50;

export type Defauts = Readonly<Record<string, string | readonly string[]>>;

function lireTri(valeur: string | null): EtatDeTable['sorting'] {
    if (valeur === null || valeur === '') return [];
    const desc = valeur.endsWith('.desc');
    const id = desc ? valeur.slice(0, -'.desc'.length) : valeur;
    return id === '' ? [] : [{ id, desc }];
}

function lireFiltre(brut: string | null, defaut: string | readonly string[] | undefined): unknown {
    if (brut === null) return defaut ?? '';
    if (brut === '') return '';
    return brut.includes(',') ? brut.split(',').filter((v) => v !== '') : brut;
}

export function etatDepuisParams(params: URLSearchParams, filtres: readonly string[], defauts: Defauts = {}): EtatDeTable {
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
    const tailleBrute = Number.parseInt(params.get('taille') ?? '', 10);
    const pageSize = TAILLES_DE_PAGE.includes(tailleBrute) ? tailleBrute : TAILLE_PAR_DEFAUT;
    const columnFilters = filtres
        .map((id) => ({ id, value: lireFiltre(params.get(`f.${id}`), defauts[id]) }))
        .filter((f) => f.value !== '' && !(Array.isArray(f.value) && f.value.length === 0));
    return {
        sorting: lireTri(params.get('tri')),
        columnFilters,
        globalFilter: params.get('q') ?? '',
        pagination: { pageIndex: page - 1, pageSize },
    };
}

function meme(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** L'inverse : rien n'est ecrit quand la valeur est celle par defaut. */
export function paramsDepuisEtat(etat: EtatDeTable, filtres: readonly string[], defauts: Defauts = {}): URLSearchParams {
    const params = new URLSearchParams();
    if (etat.globalFilter.trim() !== '') params.set('q', etat.globalFilter);
    if (etat.pagination.pageIndex > 0) params.set('page', String(etat.pagination.pageIndex + 1));
    if (etat.pagination.pageSize !== TAILLE_PAR_DEFAUT) params.set('taille', String(etat.pagination.pageSize));
    const tri = etat.sorting[0];
    if (tri !== undefined) params.set('tri', tri.desc ? `${tri.id}.desc` : tri.id);
    for (const id of filtres) {
        const valeur = etat.columnFilters.find((f) => f.id === id)?.value ?? '';
        const defaut = defauts[id] ?? '';
        if (meme(valeur, defaut)) continue;
        params.set(`f.${id}`, Array.isArray(valeur) ? valeur.join(',') : String(valeur));
    }
    return params;
}
