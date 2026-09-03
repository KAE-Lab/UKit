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

    it('refuse une chaine non fermee plutot que de lire jusqu au bout du fichier', () => {
        expect(() => lireInsertionsEtablissements(insert("'a', 'Alpha, 0"))).toThrow(/non fermee/);
    });

    it('refuse un tuple dont le nombre de valeurs ne suit pas les colonnes', () => {
        expect(() => lireInsertionsEtablissements(insert("'a', 'Alpha'"))).toThrow(/colonnes pour/);
    });
});
