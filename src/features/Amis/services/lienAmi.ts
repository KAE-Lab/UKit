/**
 * Le lien d'un ami (docs/phase-8/8-amis.md) : ce qu'il porte, sa forme ecrite et sa lecture. Pur.
 *
 * **Tout voyage dans le fragment** (`#…`) : un navigateur ne l'envoie jamais au serveur, et les
 * journaux de l'hebergeur du site ne voient que `/ami`. Rien n'est stocke nulle part ailleurs que sur
 * les deux telephones. Le fragment est une suite `cle=valeur` separee par `&`, chaque valeur encodee
 * pour URL :
 *
 *   v  la version de la forme, 1
 *   e  le code de l'etablissement
 *   n  le prenom que l'etudiant choisit de montrer, facultatif
 *   g  les groupes, separes par des virgules : un emploi du temps public, que l'ami relit lui-meme
 *   f  les filtres d'UE de ces groupes, facultatifs : ce que l'etudiant ne suit pas
 *   d  le premier jour d'un instantane, `AAAAMMJJ`
 *   o  ses creneaux occupes, en base64 pour URL (instantane.ts)
 *
 * Un lien porte soit des groupes, soit un instantane, jamais les deux, et jamais un lien
 * d'abonnement : il n'existe pas de cle pour lui.
 */

import { decoderBase64, encoderBase64 } from '../../../shared/services/Base64';
import { CRENEAUX_MAXIMUM, decoderCreneaux, encoderCreneaux, type Creneau } from './instantane';

/** L'adresse publique : la page du site qui ouvre l'application, ou propose les stores. */
export const ADRESSE_DU_LIEN = 'https://ukit-bordeaux.fr/ami';
/** Le schema de l'application (app.config.ts) ; le build de developpement a le sien. */
export const SCHEMAS = ['ukit-bordeaux', 'ukit-bordeaux-dev'] as const;

export const VERSION = 1;
/** Un prenom, pas une phrase. */
export const NOM_MAXIMUM = 30;
/** Les favoris d'un etudiant tiennent largement en dessous. */
export const GROUPES_MAXIMUM = 10;
const GROUPE_MAXIMUM = 80;
const FILTRES_MAXIMUM = 40;
/** Au-dela, ce n'est pas un lien d'ami : rien ne se lit. */
const FRAGMENT_MAXIMUM = 2000;

export type ContenuPartage =
    | { readonly genre: 'groupes'; readonly groupes: readonly string[]; readonly filtres: readonly string[] }
    | { readonly genre: 'instantane'; readonly premierJour: string; readonly creneaux: readonly Creneau[] };

export interface Partage {
    readonly etablissement: string;
    readonly nom: string | null;
    readonly contenu: ContenuPartage;
}

/**
 * Pourquoi un lien ne se lit pas. `pas-un-lien` n'est pas une erreur a montrer : l'application recoit
 * d'autres adresses (celle du build de developpement) qui ne la concernent pas.
 */
export type LectureDuLien =
    | { readonly ok: true; readonly partage: Partage }
    | { readonly ok: false; readonly raison: 'pas-un-lien' | 'illisible' | 'version' };

function versBase64Url(octets: Uint8Array): string {
    return encoderBase64(octets).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64Url(texte: string): Uint8Array | null {
    if (!/^[A-Za-z0-9_-]*$/.test(texte) || texte.length % 4 === 1) return null;
    try {
        return decoderBase64(texte.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
        return null;
    }
}

/** Un texte affichable : ni caractere de controle, ni espace aux bords. */
function texteSain(valeur: string, maximum: number): string | null {
    const propre = valeur.trim();
    if (propre === '' || propre.length > maximum || /[\u0000-\u001f\u007f]/.test(propre)) return null;
    return propre;
}

/** Le prenom tel qu'il part : coupe, sans retour a la ligne ; `null` s'il ne reste rien. */
export function nomAffichable(nom: string | null | undefined): string | null {
    if (typeof nom !== 'string') return null;
    return texteSain(nom.replace(/\s+/g, ' '), NOM_MAXIMUM);
}

const enc = encodeURIComponent;

/** Le fragment d'un partage, sans le `#`. `null` si le contenu ne s'ecrit pas (un creneau hors bornes). */
export function fragmentDu(partage: Partage): string | null {
    const champs: string[] = [`v=${VERSION}`, `e=${enc(partage.etablissement)}`];
    const nom = nomAffichable(partage.nom);
    if (nom !== null) champs.push(`n=${enc(nom)}`);
    const contenu = partage.contenu;
    if (contenu.genre === 'groupes') {
        champs.push(`g=${contenu.groupes.map(enc).join(',')}`);
        if (contenu.filtres.length > 0) champs.push(`f=${contenu.filtres.map(enc).join(',')}`);
    } else {
        const octets = encoderCreneaux(contenu.creneaux);
        if (octets === null) return null;
        champs.push(`d=${contenu.premierJour.replace(/-/g, '')}`, `o=${versBase64Url(octets)}`);
    }
    return champs.join('&');
}

/** Le lien public d'un partage, celui du code QR et de la feuille de partage. */
export function lienDu(partage: Partage): string | null {
    const fragment = fragmentDu(partage);
    return fragment === null ? null : `${ADRESSE_DU_LIEN}#${fragment}`;
}

/**
 * Le fragment d'une adresse recue, si elle est un lien d'ami : l'adresse du site (avec ou sans
 * `.html`, celle des liens universels a venir) ou le schema de l'application.
 */
function fragmentDe(adresse: string): string | null {
    const diese = adresse.indexOf('#');
    if (diese < 0) return null;
    const avant = adresse.slice(0, diese);
    const site = /^https:\/\/(www\.)?ukit-bordeaux\.fr\/ami(\.html)?\/?$/i.test(avant);
    const schema = SCHEMAS.some((s) => new RegExp(`^${s}://ami/?$`, 'i').test(avant));
    return site || schema ? adresse.slice(diese + 1) : null;
}

function decoder(valeur: string): string | null {
    try {
        return decodeURIComponent(valeur);
    } catch {
        return null;
    }
}

/** Les champs `cle=valeur`, decodes ; `null` si un champ est abime ou repete. */
function champsDe(fragment: string): Map<string, string> | null {
    const champs = new Map<string, string>();
    for (const morceau of fragment.split('&')) {
        if (morceau === '') continue;
        const egal = morceau.indexOf('=');
        if (egal <= 0) return null;
        const cle = morceau.slice(0, egal);
        if (champs.has(cle)) return null;
        champs.set(cle, morceau.slice(egal + 1));
    }
    return champs;
}

function liste(brut: string, maximum: number, longueur: number): string[] | null {
    const valeurs: string[] = [];
    for (const morceau of brut.split(',')) {
        const decode = decoder(morceau);
        const sain = decode === null ? null : texteSain(decode, longueur);
        if (sain === null) return null;
        valeurs.push(sain);
    }
    return valeurs.length >= 1 && valeurs.length <= maximum ? valeurs : null;
}

function dateDe(brut: string): string | null {
    const morceaux = /^(\d{4})(\d{2})(\d{2})$/.exec(brut);
    if (morceaux === null) return null;
    const [, a, m, j] = morceaux;
    const date = new Date(Date.UTC(Number(a), Number(m) - 1, Number(j)));
    const valide = date.getUTCFullYear() === Number(a) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(j);
    return valide ? `${a}-${m}-${j}` : null;
}

function contenuDeGroupes(groupes: string, filtresBruts: string | undefined): ContenuPartage | null {
    const lus = liste(groupes, GROUPES_MAXIMUM, GROUPE_MAXIMUM);
    const filtres = filtresBruts === undefined ? [] : liste(filtresBruts, FILTRES_MAXIMUM, GROUPE_MAXIMUM);
    if (lus === null || filtres === null || !filtres.every((f) => /^[A-Za-z0-9]+$/.test(f))) return null;
    return { genre: 'groupes', groupes: lus, filtres };
}

function contenuDInstantane(premierJour: string, occupe: string): ContenuPartage | null {
    const date = dateDe(premierJour);
    const octets = depuisBase64Url(occupe);
    const creneaux = octets === null ? null : decoderCreneaux(octets);
    if (date === null || creneaux === null || creneaux.length > CRENEAUX_MAXIMUM) return null;
    return { genre: 'instantane', premierJour: date, creneaux };
}

/** Des groupes, ou un instantane : un lien qui melange les deux, ou n'a ni l'un ni l'autre, ne se lit pas. */
function contenuDe(champs: Map<string, string>): ContenuPartage | null {
    const groupes = champs.get('g');
    const premierJour = champs.get('d');
    const occupe = champs.get('o');
    const instantane = premierJour !== undefined || occupe !== undefined;
    if (groupes !== undefined && !instantane) return contenuDeGroupes(groupes, champs.get('f'));
    if (groupes === undefined && !champs.has('f') && premierJour !== undefined && occupe !== undefined) return contenuDInstantane(premierJour, occupe);
    return null;
}

/** Lit une adresse recue : un partage, ou la raison pour laquelle elle n'en est pas un. */
export function lireLeLien(adresse: string): LectureDuLien {
    const fragment = typeof adresse === 'string' ? fragmentDe(adresse.trim()) : null;
    if (fragment === null) return { ok: false, raison: 'pas-un-lien' };
    if (fragment.length > FRAGMENT_MAXIMUM) return { ok: false, raison: 'illisible' };
    const champs = champsDe(fragment);
    if (champs === null) return { ok: false, raison: 'illisible' };
    const version = champs.get('v');
    if (version === undefined || !/^\d+$/.test(version)) return { ok: false, raison: 'illisible' };
    // Une forme plus recente se dit : « mets a jour UKit », pas « lien casse ».
    if (Number(version) !== VERSION) return { ok: false, raison: 'version' };

    const etablissementBrut = champs.get('e');
    const etablissement = etablissementBrut === undefined ? null : decoder(etablissementBrut);
    if (etablissement === null || !/^[a-z0-9-]{1,40}$/.test(etablissement)) return { ok: false, raison: 'illisible' };
    const nomBrut = champs.get('n');
    const nomDecode = nomBrut === undefined ? null : decoder(nomBrut);
    if (nomBrut !== undefined && nomDecode === null) return { ok: false, raison: 'illisible' };
    const contenu = contenuDe(champs);
    if (contenu === null) return { ok: false, raison: 'illisible' };
    return { ok: true, partage: { etablissement, nom: nomAffichable(nomDecode), contenu } };
}
