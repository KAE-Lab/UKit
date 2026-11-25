/**
 * La liste des amis, sans React ni disque (docs/phase-8/8-amis.md) : sa lecture, l'ajout d'un partage
 * recu, le retrait. Le magasin qui la garde est `AmisStore.ts`.
 *
 * Un ami est ce que son lien a apporte, rien de plus : un prenom, un etablissement, des groupes ou un
 * instantane. Il vit **sur ce telephone seulement** ; le retirer l'efface entierement, et rien ne
 * reste ailleurs, puisque rien n'est jamais parti.
 */

import moment from 'moment';

import { lireLeLien, nomAffichable, fragmentDu, type ContenuPartage, type Partage } from './lienAmi';
import { dernierJour, estExpire } from './instantane';

/** Au-dela, la liste n'est plus celle d'un etudiant ; un ajout de plus remplace le plus ancien. */
export const AMIS_MAXIMUM = 50;

export interface Ami {
    readonly id: string;
    readonly nom: string;
    readonly etablissement: string;
    readonly contenu: ContenuPartage;
    /** Quand le lien a ete ajoute, en millisecondes. */
    readonly ajouteLe: number;
}

/** La forme rangee d'un ami : son fragment, relu par le meme lecteur que les liens, plus ce qui est local. */
interface AmiRange {
    readonly id: string;
    readonly nom: string;
    readonly fragment: string;
    readonly ajouteLe: number;
}

/**
 * La liste rangee, relue. Un ami illisible s'ecarte en silence plutot que de vider la liste : le
 * stockage n'est ecrit que par nous, et une entree abimee ne doit pas emporter les autres.
 */
export function lireLesAmis(brut: string | null): Ami[] {
    if (brut === null || brut === '') return [];
    let contenu: unknown;
    try {
        contenu = JSON.parse(brut);
    } catch {
        console.warn('[amis] liste illisible, ignoree');
        return [];
    }
    if (!Array.isArray(contenu)) return [];
    const amis: Ami[] = [];
    for (const entree of contenu as Partial<AmiRange>[]) {
        if (entree === null || typeof entree !== 'object') continue;
        const nom = nomAffichable(entree.nom);
        if (typeof entree.id !== 'string' || nom === null || typeof entree.fragment !== 'string' || typeof entree.ajouteLe !== 'number') continue;
        const lecture = lireLeLien(`ukit-bordeaux://ami#${entree.fragment}`);
        if (lecture.ok === false) continue;
        amis.push({ id: entree.id, nom, etablissement: lecture.partage.etablissement, contenu: lecture.partage.contenu, ajouteLe: entree.ajouteLe });
    }
    return amis;
}

/** La liste, prete a ranger. Le contenu se range sous la forme du lien : un seul format a relire. */
export function ecrireLesAmis(amis: readonly Ami[]): string {
    const ranges: AmiRange[] = [];
    for (const ami of amis) {
        const fragment = fragmentDu({ etablissement: ami.etablissement, nom: null, contenu: ami.contenu });
        if (fragment !== null) ranges.push({ id: ami.id, nom: ami.nom, fragment, ajouteLe: ami.ajouteLe });
    }
    return JSON.stringify(ranges);
}

/** Deux prenoms sont le meme ami s'ils ne different que par la casse et les accents. */
function cleDuNom(nom: string): string {
    return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** L'ami deja connu sous ce prenom, que le nouveau lien mettra a jour ; `null` sinon. */
export function amiDuMemeNom(amis: readonly Ami[], nom: string): Ami | null {
    const cle = cleDuNom(nom);
    return amis.find((ami) => cleDuNom(ami.nom) === cle) ?? null;
}

/**
 * La liste apres l'ajout d'un partage sous `nom` : un ami du meme prenom est **remplace** (un nouveau
 * lien de Lea remplace l'ancien, expire ou non), sinon il s'ajoute en tete.
 */
export function ajouterUnAmi(amis: readonly Ami[], partage: Partage, nom: string, id: string, instant: number): Ami[] {
    const ancien = amiDuMemeNom(amis, nom);
    const ami: Ami = { id: ancien?.id ?? id, nom, etablissement: partage.etablissement, contenu: partage.contenu, ajouteLe: instant };
    const autres = amis.filter((a) => a !== ancien);
    return [ami, ...autres].slice(0, AMIS_MAXIMUM);
}

export function retirerUnAmi(amis: readonly Ami[], id: string): Ami[] {
    return amis.filter((ami) => ami.id !== id);
}

/** Un instantane dont les deux semaines sont passees ; un ami par ses groupes n'expire jamais. */
export function amiExpire(ami: Pick<Ami, 'contenu'>, aujourdhui: string): boolean {
    return ami.contenu.genre === 'instantane' && estExpire(ami.contenu.premierJour, aujourdhui);
}

/**
 * Ce qu'un lien recu permet : l'ajouter, ou pourquoi pas. Un instantane expire ne s'ajoute pas (rien a
 * montrer) ; des groupes d'un etablissement que le catalogue ne connait pas non plus (rien a relire).
 * Un instantane, lui, ne relit rien : son etablissement ne sert qu'a le dire.
 */
export type VerdictDuLien =
    | { readonly ok: true; readonly partage: Partage }
    | { readonly ok: false; readonly raison: 'illisible' | 'version' | 'expire' | 'etablissement-inconnu'; readonly dernierJour?: string };

export function verdictDuLien(adresse: string, aujourdhui: string, etablissementConnu: (code: string) => boolean): VerdictDuLien {
    const lecture = lireLeLien(adresse);
    if (lecture.ok === false) return { ok: false, raison: lecture.raison === 'version' ? 'version' : 'illisible' };
    const { contenu, etablissement } = lecture.partage;
    // Un instantane commence le jour du partage : un premier jour a venir n'expirerait jamais. Un jour de
    // marge, pour deux horloges qui ne passent pas minuit ensemble.
    if (contenu.genre === 'instantane' && contenu.premierJour > moment(aujourdhui, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD')) return { ok: false, raison: 'illisible' };
    if (contenu.genre === 'instantane' && estExpire(contenu.premierJour, aujourdhui)) return { ok: false, raison: 'expire', dernierJour: dernierJour(contenu.premierJour) };
    if (contenu.genre === 'groupes' && !etablissementConnu(etablissement)) return { ok: false, raison: 'etablissement-inconnu' };
    return lecture;
}
