/**
 * Le lecteur des `insert` du catalogue : ce qu'il doit lire, et ce qu'il doit refuser.
 *
 * Chaque cas est une forme que `supabase/etablissements.sql` emploie reellement — l'apostrophe
 * doublee de « l''espace », un commentaire porteur d'apostrophe entre deux valeurs, un JSON a
 * virgules et parentheses. Un lecteur qui en oublierait une comparerait le socle a une ligne fausse,
 * et le test de divergence mentirait dans le sens le plus dangereux : vert.
 */

import { describe, expect, it } from 'vitest';

import { lireInsertionsEtablissements } from './etablissementsSql';

const insert = (valeurs: string, colonnes = 'code, nom, ordre') =>
    `insert into public.etablissements (${colonnes}) values (${valeurs}) on conflict (code) do update set nom = excluded.nom;`;

describe('lireInsertionsEtablissements', () => {
    it('zippe les colonnes aux valeurs, une ligne par insert', () => {
        const sql = `${insert("'a', 'Alpha', 0")}\n${insert("'b', 'Beta', 1")}`;
        expect(lireInsertionsEtablissements(sql)).toEqual([
            { code: 'a', nom: 'Alpha', ordre: 0 },
            { code: 'b', nom: 'Beta', ordre: 1 },
        ]);
    });

    it('lit l apostrophe doublee comme une apostrophe', () => {
        expect(lireInsertionsEtablissements(insert("'a', 'l''espace « s''abonner »', 0"))[0].nom)
            .toBe("l'espace « s'abonner »");
    });

    it('saute un commentaire entre deux valeurs, meme porteur d une apostrophe', () => {
        const sql = insert("'a',\n    -- l'apostrophe d'un commentaire n'ouvre aucune chaine\n    'Alpha',\n    0");
        expect(lireInsertionsEtablissements(sql)[0]).toEqual({ code: 'a', nom: 'Alpha', ordre: 0 });
    });

    it('analyse un cast ::jsonb, virgules et parentheses comprises', () => {
        const sql = insert(
            "'a', '{\"motif\": \"([A-Z][0-9]+)\", \"separateurs\": [\" | \", \"/\"], \"depuis\": 2}'::jsonb, 0",
            'code, salles, ordre',
        );
        expect(lireInsertionsEtablissements(sql)[0].salles)
            .toEqual({ motif: '([A-Z][0-9]+)', separateurs: [' | ', '/'], depuis: 2 });
    });

    it('lit un tableau JSON, les booleens et null', () => {
        const sql = insert("'a', '[{\"lat\": 44.8, \"lng\": -0.5}]'::jsonb, true, null", 'code, points, actif, ville');
        expect(lireInsertionsEtablissements(sql)[0]).toEqual({
            code: 'a', points: [{ lat: 44.8, lng: -0.5 }], actif: true, ville: null,
        });
    });

    it('refuse un cast qu il ne connait pas plutot que de rendre la chaine brute', () => {
        expect(() => lireInsertionsEtablissements(insert("'a', 'x'::uuid, 0", 'code, id, ordre'))).toThrow(/cast inconnu/);
    });

    it('refuse une chaine non fermee plutot que de lire jusqu au bout du fichier', () => {
        expect(() => lireInsertionsEtablissements(insert("'a', 'Alpha, 0"))).toThrow(/non fermee/);
    });

    it('refuse un tuple dont le nombre de valeurs ne suit pas les colonnes', () => {
        expect(() => lireInsertionsEtablissements(insert("'a', 'Alpha'"))).toThrow(/colonnes pour/);
    });
});

/**
 * Le cast `::text[]`, celui des alias. Sans lui, le lecteur rendait le litteral en chaine brute, et la
 * projection n'y voyait aucun tableau. Le fichier n'emploie aujourd'hui que des elements entre
 * guillemets ; les echappements et les elements nus sont couverts parce que Postgres les accepte, et
 * qu'un lecteur qui les lirait autrement que lui ferait mentir le test du socle.
 */
describe('un litteral de tableau sous ::text[]', () => {
    const alias = (litteral: string) =>
        lireInsertionsEtablissements(insert(`'a', ${litteral}::text[], 0`, 'code, alias, ordre'))[0].alias;

    it('lit le tableau vide', () => {
        expect(alias("'{}'")).toEqual([]);
        expect(alias("'{ }'")).toEqual([]);
    });

    it('lit des elements entre guillemets, accents, virgules et accolades compris', () => {
        expect(alias(`'{"UB","Université de Bordeaux","Collège ST"}'`))
            .toEqual(['UB', 'Université de Bordeaux', 'Collège ST']);
        expect(alias(`'{"Talence, Pessac","{A28}"}'`)).toEqual(['Talence, Pessac', '{A28}']);
    });

    it('prend la barre oblique inverse pour un echappement, et l apostrophe doublee pour une apostrophe', () => {
        expect(alias(`'{"le \\"CREMI\\"","A\\\\B","l''école"}'`)).toEqual(['le "CREMI"', 'A\\B', "l'école"]);
    });

    it('rogne un element nu, et lit NULL nu comme le nul SQL', () => {
        expect(alias("'{ UB , Bordeaux INP,NULL, null}'")).toEqual(['UB', 'Bordeaux INP', null, null]);
        expect(alias(`'{"NULL"}'`)).toEqual(['NULL']);
    });

    it('refuse ce qu il ne sait pas lire plutot que de le lire faux', () => {
        expect(() => alias("'UB'")).toThrow(/tableau attendu/);
        expect(() => alias("'{{UB}}'")).toThrow(/illisible/);
        expect(() => alias("'{UB,}'")).toThrow(/illisible/);
        expect(() => alias(`'{"UB"x}'`)).toThrow(/illisible/);
    });

    it('refuse un element nu fait de blancs seuls, que Postgres refuse aussi', () => {
        expect(() => alias("'{ , UB}'")).toThrow(/illisible/);
        expect(() => alias("'{UB, ,x}'")).toThrow(/illisible/);
        expect(() => alias("'{UB,  }'")).toThrow(/illisible/);
    });
});
