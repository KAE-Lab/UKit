/**
 * Entre la saisie et la ligne : ce que le formulaire montre, et ce que la base recoit.
 *
 * Pur — aucun DOM — pour que les regles se verifient sous vitest (conversion.test.ts) : une chaine
 * vide qui devient `null` sauf la ou elle est une valeur, une date locale qui redevient UTC, un JSON
 * qui refuse de partir illisible, une version qui refuse de partir hors forme.
 */

import { depuisSaisie, versSaisie } from '../lib/dates';
import type { Champ } from './descripteurs';

export type Saisie = string | boolean | readonly string[];

const FORME_VERSION = /^\d+\.\d+\.\d+$/;
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La valeur d'une ligne, telle que le formulaire la montre. */
export function versSaisieDuChamp(champ: Champ, valeur: unknown): Saisie {
    switch (champ.type.type) {
        case 'booleen':
            return valeur === true;
        case 'date':
            return versSaisie(valeur);
        case 'json':
            return valeur === null || valeur === undefined ? '' : JSON.stringify(valeur, null, 2);
        case 'etablissements':
            return Array.isArray(valeur) ? valeur.filter((code): code is string => typeof code === 'string') : [];
        case 'nombre':
            return typeof valeur === 'number' ? String(valeur) : '';
        default:
            return typeof valeur === 'string' ? valeur : (valeur === null || valeur === undefined ? '' : String(valeur));
    }
}

export type Conversion = { readonly ok: true; readonly valeur: unknown } | { readonly ok: false; readonly erreur: string };

function ok(valeur: unknown): Conversion {
    return { ok: true, valeur };
}

function erreur(message: string): Conversion {
    return { ok: false, erreur: message };
}

function obligatoireOuNul(champ: Champ): Conversion {
    return champ.obligatoire === true ? erreur('Obligatoire.') : ok(null);
}

function texte(champ: Champ, saisie: Saisie): Conversion {
    const propre = String(saisie).trim();
    if (propre === '') return champ.obligatoire === true ? erreur('Obligatoire.') : ok(champ.videEstValeur === true ? '' : null);
    return ok(propre);
}

function nombre(champ: Champ, saisie: Saisie): Conversion {
    const brut = String(saisie).trim();
    if (brut === '') return obligatoireOuNul(champ);
    const valeur = Number(brut);
    return Number.isFinite(valeur) ? ok(valeur) : erreur('Un nombre est attendu.');
}

function date(champ: Champ, saisie: Saisie): Conversion {
    const brut = String(saisie);
    if (brut === '') return obligatoireOuNul(champ);
    const iso = depuisSaisie(brut);
    return iso === null ? erreur('Une date est attendue.') : ok(iso);
}

function json(champ: Champ, saisie: Saisie): Conversion {
    const brut = String(saisie).trim();
    if (brut === '') return obligatoireOuNul(champ);
    try {
        return ok(JSON.parse(brut));
    } catch {
        return erreur('Ce n’est pas du JSON valide.');
    }
}

function version(_champ: Champ, saisie: Saisie): Conversion {
    const brut = String(saisie).trim();
    if (brut === '') return ok(null);
    return FORME_VERSION.test(brut) ? ok(brut) : erreur('La forme est X.Y.Z, par exemple 6.1.0.');
}

function uuid(champ: Champ, saisie: Saisie): Conversion {
    const brut = String(saisie).trim().toLowerCase();
    if (brut === '') return obligatoireOuNul(champ);
    return FORME_UUID.test(brut) ? ok(brut) : erreur('Un identifiant de la forme 574c8942-3502-413a-937e-d1818c5e352b est attendu.');
}

function choix(champ: Champ, saisie: Saisie): Conversion {
    const brut = String(saisie);
    if (brut === '') return champ.obligatoire === true ? erreur('Obligatoire.') : ok(null);
    return ok(brut);
}

function etablissements(_champ: Champ, saisie: Saisie): Conversion {
    const codes = Array.isArray(saisie) ? saisie : [];
    return ok(codes.length === 0 ? null : codes);
}

/** Un convertisseur par type ; le texte est le repli des types qui se saisissent en clair. */
const CONVERTISSEURS: Record<string, (champ: Champ, saisie: Saisie) => Conversion> = {
    booleen: (_champ, saisie) => ok(saisie === true),
    etablissements,
    nombre,
    date,
    json,
    version,
    uuid,
    choix,
};

/** La valeur que la base recoit, ou l'erreur a montrer sous le champ. */
export function versLigneDuChamp(champ: Champ, saisie: Saisie): Conversion {
    return (CONVERTISSEURS[champ.type.type] ?? texte)(champ, saisie);
}
