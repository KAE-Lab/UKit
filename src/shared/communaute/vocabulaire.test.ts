/**
 * Le vocabulaire de l'application et celui de la base s'accordent : chaque sujet de `SUJETS` est insere
 * dans `public.sujets` par une migration, avec la meme famille, les memes valeurs et la meme forme, et la
 * vue lisible (schema.sql) porte le meme bloc. Un sujet ajoute d'un seul cote serait propose par l'ecran
 * et refuse par la base (`sujet_inconnu`), ou l'inverse — la garantie de mesure/migration.test.ts.
 *
 * Et la forme : ce que l'application juge permis, la base le juge aussi, sur les memes exemples.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { cibleDuLieu, FORME_HORAIRES, FORME_PLAT, SUJETS, sujetDeLieu, sujetsDuDomaine, valeurPermise } from './vocabulaire';

const MIGRATIONS = 'supabase/migrations';
const SCHEMA = 'supabase/schema.sql';

interface Ligne { sujet: string; domaine: string; famille: string; valeurs: string[] | null; forme: string | null }

/** Les tuples du bloc `insert into public.sujets` d'un fichier SQL, un par ligne. */
function sujetsInseres(sql: string): Ligne[] {
    const lignes: Ligne[] = [];
    for (const bloc of sql.matchAll(/insert into public\.sujets \(sujet, nature, domaine, famille, valeurs, forme, description\) values[\s\S]*?on conflict/g)) {
        for (const t of bloc[0].matchAll(/^\s*\('([a-z._]+)',\s*'signalement',\s*'([a-z_]+)',\s*'([a-z]+)',\s*(null|'\{[a-z_,]+\}'),\s*(null|'(?:[^']|'')*'),/gm)) {
            lignes.push({
                sujet: t[1], domaine: t[2], famille: t[3],
                valeurs: t[4] === 'null' ? null : t[4].slice(2, -2).split(','),
                forme: t[5] === 'null' ? null : t[5].slice(1, -1).replace(/''/g, "'"),
            });
        }
    }
    return lignes;
}

function desMigrations(): Ligne[] {
    return readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
        .flatMap((f) => sujetsInseres(readFileSync(join(MIGRATIONS, f), 'utf8')));
}

function attendues(): Ligne[] {
    return SUJETS.map((s) => ({ sujet: s.sujet, domaine: s.domaine, famille: s.famille, valeurs: s.valeurs === null ? null : [...s.valeurs], forme: s.forme }));
}

describe('le vocabulaire et la base', () => {
    test('chaque sujet est insere par une migration, a l identique', () => {
        const migrations = new Map(desMigrations().map((l) => [l.sujet, l]));
        for (const a of attendues()) expect(migrations.get(a.sujet)).toEqual(a);
    });

    test('la vue lisible porte le meme vocabulaire', () => {
        expect(sujetsInseres(readFileSync(SCHEMA, 'utf8'))).toEqual(attendues());
    });

    test('un sujet par nom, et chacun dans son domaine', () => {
        expect(new Set(SUJETS.map((s) => s.sujet)).size).toBe(SUJETS.length);
        for (const s of SUJETS) expect(s.sujet.startsWith(`${s.domaine}.`)).toBe(true);
        expect(sujetsDuDomaine('bibliotheque').map((s) => s.sujet)).toContain('bibliotheque.ambiance');
        expect(sujetDeLieu('restaurant.attente')?.famille).toBe('direct');
        expect(sujetDeLieu('inconnu')).toBeUndefined();
    });

    test('la normale est une valeur du sujet', () => {
        for (const s of SUJETS) if (s.normale !== null) expect(s.valeurs).toContain(s.normale);
    });
});

describe('les valeurs permises', () => {
    const horaires = sujetDeLieu('restaurant.horaires')!;
    const plat = sujetDeLieu('restaurant.plat')!;
    const ferme = sujetDeLieu('restaurant.ferme')!;

    test('une liste', () => {
        expect(valeurPermise(ferme, 'oui')).toBe(true);
        expect(valeurPermise(ferme, 'ferme')).toBe(false);
    });

    test('des horaires corriges', () => {
        expect(valeurPermise(horaires, 'a41f09c2|midi=1130-1345,soir=ferme')).toBe(true);
        expect(valeurPermise(horaires, 'a41f09c2|source')).toBe(true);
        expect(valeurPermise(horaires, 'a41f09c2|jour=0800-2000')).toBe(true);
        expect(valeurPermise(horaires, 'a41f09c2|midi=2460-0100')).toBe(false);
        expect(valeurPermise(horaires, 'a41f09c2|')).toBe(false);
        expect(valeurPermise(horaires, 'A41F09C2|source')).toBe(false);
        expect(valeurPermise(horaires, 'a41f09c2|midi=1130-1345,soir=ferme,jour=ferme,midi=ferme')).toBe(false);
    });

    test('un plat', () => {
        expect(valeurPermise(plat, 'Poulet basquaise, riz')).toBe(true);
        expect(valeurPermise(plat, 'ligne\nsuivante')).toBe(false);
        expect(valeurPermise(plat, 'x'.repeat(121))).toBe(false);
    });

    test('les deux formes sont celles de la migration', () => {
        expect(FORME_PLAT).toBe('^[^[:cntrl:]]{1,120}$');
        expect(FORME_HORAIRES).toContain('[|](source|');
    });
});

describe('la cible d un lieu', () => {
    test('un batiment porte son etablissement', () => {
        expect(cibleDuLieu('batiment', 'A28', 'bordeaux')).toBe('bordeaux/A28');
        expect(cibleDuLieu('batiment', 'A28')).toBeNull();
        expect(cibleDuLieu('batiment', 'Bâtiment B', 'bordeaux')).toBeNull();
    });

    test('les autres lieux, l identifiant de leur source', () => {
        expect(cibleDuLieu('restaurant', '21')).toBe('21');
        expect(cibleDuLieu('bibliotheque', '1234-abc')).toBe('1234-abc');
        expect(cibleDuLieu('restaurant', '')).toBeNull();
    });
});
