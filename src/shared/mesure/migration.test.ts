/**
 * Le vocabulaire de l'application et celui de la base s'accordent : chaque evenement d'`EVENEMENTS`
 * est insere dans `evenements_connus` par une migration, et la vue lisible (schema.sql) porte le meme
 * ensemble que les migrations. Sans cette garantie, un evenement ajoute d'un seul cote serait compte
 * par l'appareil et rejete par la base, en silence — la meme garantie que regles.test.ts pour le
 * ciblage recopie dans la fonction d'envoi.
 *
 * Un sous-ensemble et non une egalite : un evenement retire du vocabulaire de l'application garde sa
 * ligne tant que des versions installees l'envoient (docs/mesure.md).
 *
 *     npm test
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { EVENEMENTS } from './vocabulaire';

// Relatif a la racine du depot, ou vitest est lance : la meme convention que socle.test.ts.
const MIGRATIONS = 'supabase/migrations';
const SCHEMA = 'supabase/schema.sql';

/** Les evenements inseres dans `evenements_connus` par un fichier SQL : un tuple `('evenement', …)` par ligne, dans le bloc d'insertion. */
function evenementsInseres(sql: string): string[] {
    const evenements: string[] = [];
    for (const bloc of sql.matchAll(/insert into public\.evenements_connus[\s\S]*?;/g)) {
        for (const tuple of bloc[0].matchAll(/^\s*\('([^']+)',/gm)) evenements.push(tuple[1]);
    }
    return evenements;
}

function evenementsDesMigrations(): string[] {
    return readdirSync(MIGRATIONS)
        .filter((fichier) => fichier.endsWith('.sql'))
        .sort()
        .flatMap((fichier) => evenementsInseres(readFileSync(join(MIGRATIONS, fichier), 'utf8')));
}

test('chaque evenement du vocabulaire est connu de la base par une migration', () => {
    const connus = evenementsDesMigrations();
    expect(connus.length).toBeGreaterThan(0);
    for (const evenement of Object.keys(EVENEMENTS)) {
        expect(connus, `${evenement} manque dans ${MIGRATIONS}`).toContain(evenement);
    }
});

test('la vue lisible porte les memes evenements que les migrations', () => {
    const migrations = [...new Set(evenementsDesMigrations())].sort();
    const schema = [...new Set(evenementsInseres(readFileSync(SCHEMA, 'utf8')))].sort();
    expect(schema).toEqual(migrations);
});
