/**
 * Entre la saisie et la ligne, en zod : ce que le formulaire montre (`versSaisieDuChamp`), et ce que
 * la base recoit (le schema derive du descripteur, joue par react-hook-form).
 *
 * Pur — aucun DOM — pour que les regles se verifient sous vitest (schemas.test.ts) : une chaine vide
 * qui devient `null` sauf la ou elle est une valeur, une date locale qui redevient UTC, un JSON qui
 * refuse de partir illisible, une version qui refuse de partir hors forme, et une valeur hors liste
 * — une plateforme `tv` posee par psql, un code de campus absent du catalogue — qui refuse de
 * repartir telle quelle en nommant ce qu'il faut corriger (defauts 5 et 6 du jalon 7-E).
 *
 * Depuis 7-F, les saisies structurees des annonces : la focale bornee a l'image, les creneaux dont
 * chaque plage est lisible, la galerie reduite a ses adresses, le partenaire nul quand tout est vide,
 * la teinte prise dans la palette, la latitude d'un lieu, et la forme attendue d'un texte.
 */

import { z } from 'zod';

import { PALETTE } from '../../../src/shared/annonces/grammaire';
import { minutesDe } from '../../../src/shared/annonces/ordre';
import { depuisSaisie, versSaisie } from '../lib/dates';
import type { Champ, Descripteur } from './descripteurs';

/** `{ x, y }` en fractions de l'image : le point que le recadrage garde visible, a la meme place relative (lib/cadrage.ts). */
export interface FocaleSaisie {
    readonly x: number;
    readonly y: number;
}

/** Une plage de mise en avant, telle que le formulaire la tient : les jours ISO, `HH:MM` de Paris. */
export interface CreneauSaisi {
    readonly jours: readonly number[];
    readonly de: string;
    readonly a: string;
}

export interface PartenaireSaisi {
    readonly nom: string;
    readonly logo_url: string;
    readonly lien: string;
}

export type Saisie = string | boolean | readonly string[] | FocaleSaisie | readonly CreneauSaisi[] | PartenaireSaisi;
export type Saisies = Record<string, Saisie>;
export type SchemaDeChamp = z.ZodType<unknown, Saisie>;

export const FOCALE_PAR_DEFAUT: FocaleSaisie = { x: 0.5, y: 0.3 };
export const PARTENAIRE_VIDE: PartenaireSaisi = { nom: '', logo_url: '', lien: '' };

const FORME_VERSION = /^\d+\.\d+\.\d+$/;
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORME_LIEN = /^https?:\/\/\S+$/;
const OBLIGATOIRE = 'Obligatoire.';

function fraction(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isFinite(valeur) && valeur >= 0 && valeur <= 1 ? valeur : null;
}

/** La focale d'une ligne, ou le defaut de la base quand la colonne ne porte rien de lisible. */
export function lireFocale(valeur: unknown): FocaleSaisie {
    if (typeof valeur !== 'object' || valeur === null) return FOCALE_PAR_DEFAUT;
    const brut = valeur as { readonly x?: unknown; readonly y?: unknown };
    const x = fraction(brut.x);
    const y = fraction(brut.y);
    return x === null || y === null ? FOCALE_PAR_DEFAUT : { x, y };
}

/** Les creneaux d'une ligne, tels qu'ils se saisissent : chaque plage lisible garde ses jours et ses heures. */
export function lireCreneauxSaisis(valeur: unknown): CreneauSaisi[] {
    if (!Array.isArray(valeur)) return [];
    return valeur.flatMap((plage: unknown): CreneauSaisi[] => {
        if (typeof plage !== 'object' || plage === null) return [];
        const brut = plage as { readonly jours?: unknown; readonly de?: unknown; readonly a?: unknown };
        const jours = Array.isArray(brut.jours) ? brut.jours.filter((jour): jour is number => Number.isInteger(jour) && jour >= 1 && jour <= 7) : [];
        return [{ jours: [...new Set(jours)].sort((a, b) => a - b), de: typeof brut.de === 'string' ? brut.de : '', a: typeof brut.a === 'string' ? brut.a : '' }];
    });
}

export function lirePartenaire(valeur: unknown): PartenaireSaisi {
    if (typeof valeur !== 'object' || valeur === null) return PARTENAIRE_VIDE;
    const brut = valeur as { readonly nom?: unknown; readonly logo_url?: unknown; readonly lien?: unknown };
    const texte = (v: unknown) => (typeof v === 'string' ? v : '');
    return { nom: texte(brut.nom), logo_url: texte(brut.logo_url), lien: texte(brut.lien) };
}

/** Les saisies structurees des annonces (7-F) ; `undefined` pour les autres types. */
function saisieStructuree(type: Champ['type']['type'], valeur: unknown): Saisie | undefined {
    switch (type) {
        case 'etablissements':
        case 'cases':
        case 'galerie':
            return Array.isArray(valeur) ? valeur.filter((code): code is string => typeof code === 'string') : [];
        case 'focale':
            return lireFocale(valeur);
        case 'creneaux':
            return lireCreneauxSaisis(valeur);
        case 'partenaire':
            return lirePartenaire(valeur);
        default:
            return undefined;
    }
}

/** La valeur d'une ligne, telle que le formulaire la montre. */
export function versSaisieDuChamp(champ: Champ, valeur: unknown): Saisie {
    const structuree = saisieStructuree(champ.type.type, valeur);
    if (structuree !== undefined) return structuree;
    switch (champ.type.type) {
        case 'booleen':
            return valeur === true;
        case 'date':
            return versSaisie(valeur);
        case 'json':
            return valeur === null || valeur === undefined ? '' : JSON.stringify(valeur, null, 2);
        case 'nombre':
        case 'lieu':
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

/** Un nombre, la virgule decimale acceptee : la console est ecrite en francais, et « 44,8 » en est un. */
function nombre(champ: Champ, borne?: number): SchemaDeChamp {
    return vide(champ).transform((valeur, ctx) => {
        if (typeof valeur !== 'string' || valeur === '') return valeur;
        const n = Number(valeur.replace(',', '.'));
        if (!Number.isFinite(n)) { ctx.addIssue({ code: 'custom', message: 'Un nombre est attendu.' }); return z.NEVER; }
        if (borne !== undefined && Math.abs(n) > borne) { ctx.addIssue({ code: 'custom', message: `Entre -${borne} et ${borne}.` }); return z.NEVER; }
        return n;
    });
}

/** Un texte libre ; s'il a une forme attendue, un texte d'une autre forme ne part pas, et la phrase dit laquelle. */
function texte(champ: Champ): SchemaDeChamp {
    return vide(champ).transform((valeur, ctx) => {
        if (typeof valeur === 'string' && valeur !== '' && champ.forme !== undefined && !champ.forme.motif.test(valeur)) {
            ctx.addIssue({ code: 'custom', message: champ.forme.message });
            return z.NEVER;
        }
        return valeur;
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
    const type = champ.type.type === 'cases' ? champ.type : null;
    const options = type === null ? [] : type.options.map((option) => option.valeur);
    return listeSaisie.transform((valeurs, ctx) => {
        const inconnue = valeurs.find((valeur) => !options.includes(valeur));
        if (inconnue !== undefined) { ctx.addIssue({ code: 'custom', message: `Valeur inconnue : « ${inconnue} ». Décoche-la.` }); return z.NEVER; }
        if (valeurs.length === 0) {
            if (type?.auMoinsUne === true) { ctx.addIssue({ code: 'custom', message: 'Coche au moins une case.' }); return z.NEVER; }
            return null;
        }
        return [...valeurs];
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

/** Une teinte de la palette, ou nulle pour « par defaut » ; un index hors palette — le 4 — ne part pas. */
const teinte: SchemaDeChamp = texteSaisi.transform((brut, ctx) => {
    if (brut === '') return null;
    const index = Number(brut);
    if (!PALETTE.includes(index)) { ctx.addIssue({ code: 'custom', message: `Teinte hors palette : « ${brut} ». Choisis-en une autre.` }); return z.NEVER; }
    return index;
});

/** La focale part toujours : la colonne est `not null`, et une valeur illisible retombe sur le defaut de la base. */
const focale: SchemaDeChamp = z.custom<Saisie>().transform((saisie) => lireFocale(saisie));

/** Une galerie vide est nulle : la fiche ne rend pas de galerie sans image. */
const galerie: SchemaDeChamp = listeSaisie.transform((urls) => {
    const propres = urls.map((url) => url.trim()).filter((url) => url !== '');
    return propres.length === 0 ? null : propres;
});

/** Chaque plage doit etre complete : des jours, deux heures lisibles. Aucune plage vaut nul. */
const creneaux: SchemaDeChamp = z.custom<Saisie>().transform((saisie, ctx) => {
    const plages = Array.isArray(saisie) ? saisie.filter((plage): plage is CreneauSaisi => typeof plage === 'object' && plage !== null && 'jours' in plage) : [];
    if (plages.length === 0) return null;
    for (const [rang, plage] of plages.entries()) {
        if (plage.jours.length === 0) { ctx.addIssue({ code: 'custom', message: `Créneau ${rang + 1} : coche au moins un jour.` }); return z.NEVER; }
        if (minutesDe(plage.de) === null || minutesDe(plage.a) === null) { ctx.addIssue({ code: 'custom', message: `Créneau ${rang + 1} : les heures s’écrivent HH:MM.` }); return z.NEVER; }
        if (plage.de === plage.a) { ctx.addIssue({ code: 'custom', message: `Créneau ${rang + 1} : la fin est égale au début.` }); return z.NEVER; }
    }
    return plages.map((plage) => ({ jours: [...plage.jours], de: plage.de, a: plage.a }));
});

/** Tout vide : pas de partenaire. Sinon un nom, et un lien en http(s) s'il y en a un. */
const partenaire: SchemaDeChamp = z.custom<Saisie>().transform((saisie, ctx) => {
    const brut = lirePartenaire(saisie);
    const nom = brut.nom.trim();
    const logo = brut.logo_url.trim();
    const lien = brut.lien.trim();
    if (nom === '' && logo === '' && lien === '') return null;
    if (nom === '') { ctx.addIssue({ code: 'custom', message: 'Le partenaire a besoin d’un nom.' }); return z.NEVER; }
    if (lien !== '' && !FORME_LIEN.test(lien)) { ctx.addIssue({ code: 'custom', message: 'Le lien du partenaire commence par http:// ou https://.' }); return z.NEVER; }
    return { nom, logo_url: logo === '' ? null : logo, lien: lien === '' ? null : lien };
});

export interface ContexteDeSchema {
    /** Les codes du catalogue ; `null` quand il n'a pas repondu, et la verification est alors sautee. */
    readonly etablissements: readonly string[] | null;
}

type FabriqueDeSchema = (champ: Champ, contexte: ContexteDeSchema) => SchemaDeChamp;

/** Le schema de chaque type ; le texte est le repli des types qui se saisissent en clair. */
const SCHEMAS: Readonly<Partial<Record<Champ['type']['type'], FabriqueDeSchema>>> = {
    booleen: () => booleen,
    nombre: (champ) => nombre(champ),
    // La latitude d'un lieu : sa longitude est un champ `nombre` soeur, bornee par le descripteur.
    lieu: (champ) => nombre(champ, 90),
    date: (champ) => date(champ),
    json: (champ) => json(champ),
    version: () => version(),
    uuid: (champ) => uuid(champ),
    choix: (champ) => choix(champ),
    cases: (champ) => cases(champ),
    etablissements: (_champ, contexte) => etablissements(contexte.etablissements),
    focale: () => focale,
    galerie: () => galerie,
    creneaux: () => creneaux,
    partenaire: () => partenaire,
    teinte: () => teinte,
};

export function schemaDuChamp(champ: Champ, contexte: ContexteDeSchema = { etablissements: null }): SchemaDeChamp {
    return (SCHEMAS[champ.type.type] ?? texte)(champ, contexte);
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
