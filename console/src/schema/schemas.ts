/**
 * Entre la saisie et la ligne, en zod : ce que le formulaire montre (`versSaisieDuChamp`), et ce que
 * la base recoit (le schema derive du descripteur, joue par react-hook-form).
 *
 * Pur — aucun DOM — pour que les regles se verifient sous vitest (schemas.test.ts) : une chaine vide
 * qui devient `null` sauf la ou elle est une valeur, une date locale qui redevient UTC, un JSON qui
 * refuse de partir illisible, une version qui refuse de partir hors forme, et une valeur hors liste
 * — une plateforme `tv` posee par psql, un code de campus absent du catalogue — qui refuse de
 * repartir telle quelle en nommant ce qu'il faut corriger (defauts 5 et 6 du jalon 7-E).
 */

import { z } from 'zod';

import { depuisSaisie, versSaisie } from '../lib/dates';
import type { Champ, Descripteur } from './descripteurs';

export type Saisie = string | boolean | readonly string[];
export type Saisies = Record<string, Saisie>;
export type SchemaDeChamp = z.ZodType<unknown, Saisie>;

const FORME_VERSION = /^\d+\.\d+\.\d+$/;
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBLIGATOIRE = 'Obligatoire.';

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
        case 'cases':
            return Array.isArray(valeur) ? valeur.filter((code): code is string => typeof code === 'string') : [];
        case 'nombre':
            return typeof valeur === 'number' ? String(valeur) : '';
        default:
            return typeof valeur === 'string' ? valeur : (valeur === null || valeur === undefined ? '' : String(valeur));
    }
}

/** Ce que le formulaire dit d'une ligne — ou des defauts d'une ligne neuve. */
export function saisiesDe(descripteur: Descripteur, ligne: Ligne | null): Saisies {
    return Object.fromEntries(descripteur.champs.map((champ) => [
        champ.nom,
        versSaisieDuChamp(champ, ligne === null ? (typeof champ.defaut === 'function' ? (champ.defaut as () => unknown)() : champ.defaut) : ligne[champ.nom]),
    ]));
}

type Ligne = Record<string, unknown>;

/** Une saisie textuelle, nettoyee ; ce qui n'est pas une chaine se lit vide. */
const texteSaisi = z.custom<Saisie>().transform((saisie) => (typeof saisie === 'string' ? saisie.trim() : ''));
const listeSaisie = z.custom<Saisie>().transform((saisie): readonly string[] => (Array.isArray(saisie) ? saisie.filter((v): v is string => typeof v === 'string') : []));

function vide(champ: Champ): SchemaDeChamp {
    return texteSaisi.transform((brut, ctx) => {
        if (brut !== '') return brut;
        if (champ.obligatoire === true) { ctx.addIssue({ code: 'custom', message: OBLIGATOIRE }); return z.NEVER; }
        return champ.videEstValeur === true ? '' : null;
    });
}

function nombre(champ: Champ): SchemaDeChamp {
    return vide(champ).transform((valeur, ctx) => {
        if (typeof valeur !== 'string' || valeur === '') return valeur;
        const n = Number(valeur);
        if (!Number.isFinite(n)) { ctx.addIssue({ code: 'custom', message: 'Un nombre est attendu.' }); return z.NEVER; }
        return n;
    });
}

function date(champ: Champ): SchemaDeChamp {
    return vide(champ).transform((valeur, ctx) => {
        if (typeof valeur !== 'string' || valeur === '') return valeur;
        const iso = depuisSaisie(valeur);
        if (iso === null) { ctx.addIssue({ code: 'custom', message: 'Une date est attendue.' }); return z.NEVER; }
        return iso;
    });
}

function json(champ: Champ): SchemaDeChamp {
    return vide(champ).transform((valeur, ctx) => {
        if (typeof valeur !== 'string' || valeur === '') return valeur;
        try {
            return JSON.parse(valeur) as unknown;
        } catch {
            ctx.addIssue({ code: 'custom', message: 'Ce n’est pas du JSON valide.' });
            return z.NEVER;
        }
    });
}

function version(): SchemaDeChamp {
    return texteSaisi.transform((brut, ctx) => {
        if (brut === '') return null;
        if (!FORME_VERSION.test(brut)) { ctx.addIssue({ code: 'custom', message: 'La forme est X.Y.Z, par exemple 6.1.0.' }); return z.NEVER; }
        return brut;
    });
}

function uuid(champ: Champ): SchemaDeChamp {
    return vide(champ).transform((valeur, ctx) => {
        if (typeof valeur !== 'string' || valeur === '') return valeur;
        const propre = valeur.toLowerCase();
        if (!FORME_UUID.test(propre)) { ctx.addIssue({ code: 'custom', message: 'Un identifiant de la forme 574c8942-3502-413a-937e-d1818c5e352b est attendu.' }); return z.NEVER; }
        return propre;
    });
}

/** Une valeur hors des options ne repart pas : la base la refuserait par son `check`, autant nommer ce qu'il faut changer. */
function choix(champ: Champ): SchemaDeChamp {
    const options = champ.type.type === 'choix' ? champ.type.options.map((option) => option.valeur) : [];
    return texteSaisi.transform((brut, ctx) => {
        if (brut === '') {
            if (champ.obligatoire === true) { ctx.addIssue({ code: 'custom', message: OBLIGATOIRE }); return z.NEVER; }
            return null;
        }
        if (!options.includes(brut)) { ctx.addIssue({ code: 'custom', message: `Valeur hors liste : « ${brut} ». Choisis-en une autre.` }); return z.NEVER; }
        return brut;
    });
}

function cases(champ: Champ): SchemaDeChamp {
    const options = champ.type.type === 'cases' ? champ.type.options.map((option) => option.valeur) : [];
    return listeSaisie.transform((valeurs, ctx) => {
        const inconnue = valeurs.find((valeur) => !options.includes(valeur));
        if (inconnue !== undefined) { ctx.addIssue({ code: 'custom', message: `Valeur inconnue : « ${inconnue} ». Décoche-la.` }); return z.NEVER; }
        return valeurs.length === 0 ? null : [...valeurs];
    });
}

/** Aucun code coche vaut tous ; un code absent du catalogue ne repart pas, quand le catalogue est connu. */
function etablissements(codesConnus: readonly string[] | null): SchemaDeChamp {
    return listeSaisie.transform((codes, ctx) => {
        if (codesConnus !== null) {
            const inconnu = codes.find((code) => !codesConnus.includes(code));
            if (inconnu !== undefined) { ctx.addIssue({ code: 'custom', message: `Code absent du catalogue : « ${inconnu} ». Décoche-le.` }); return z.NEVER; }
        }
        return codes.length === 0 ? null : [...codes];
    });
}

const booleen: SchemaDeChamp = z.custom<Saisie>().transform((saisie) => saisie === true);

export interface ContexteDeSchema {
    /** Les codes du catalogue ; `null` quand il n'a pas repondu, et la verification est alors sautee. */
    readonly etablissements: readonly string[] | null;
}

/** Le schema d'un champ ; le texte est le repli des types qui se saisissent en clair. */
export function schemaDuChamp(champ: Champ, contexte: ContexteDeSchema = { etablissements: null }): SchemaDeChamp {
    switch (champ.type.type) {
        case 'booleen': return booleen;
        case 'nombre': return nombre(champ);
        case 'date': return date(champ);
        case 'json': return json(champ);
        case 'version': return version();
        case 'uuid': return uuid(champ);
        case 'choix': return choix(champ);
        case 'cases': return cases(champ);
        case 'etablissements': return etablissements(contexte.etablissements);
        default: return vide(champ);
    }
}

/** Le schema de tout le formulaire : les champs qui s'ecrivent, chacun par son schema. */
export function schemaDuDescripteur(descripteur: Descripteur, contexte: ContexteDeSchema = { etablissements: null }) {
    const forme: Record<string, SchemaDeChamp> = {};
    for (const champ of descripteur.champs) {
        if (champ.lectureSeule === true) continue;
        forme[champ.nom] = schemaDuChamp(champ, contexte);
    }
    return z.object(forme);
}

/** Les valeurs d'une ligne que la liste doit signaler : hors options, ou hors catalogue. */
export function valeursInconnues(champ: Champ, valeur: unknown, codesConnus: readonly string[] | null): readonly string[] {
    if (champ.type.type === 'choix') {
        const brut = valeur === null || valeur === undefined ? '' : String(valeur);
        return brut !== '' && !champ.type.options.some((option) => option.valeur === brut) ? [brut] : [];
    }
    if (champ.type.type === 'cases') {
        const options = champ.type.options.map((option) => option.valeur);
        return Array.isArray(valeur) ? valeur.map(String).filter((v) => !options.includes(v)) : [];
    }
    if (champ.type.type === 'etablissements' && codesConnus !== null) {
        return Array.isArray(valeur) ? valeur.map(String).filter((v) => !codesConnus.includes(v)) : [];
    }
    return [];
}
