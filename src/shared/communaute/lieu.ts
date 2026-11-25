/**
 * Ce qu'on sait d'un lieu, sujet par sujet (docs/phase-8/2-signalements.md) : l'etat de la communaute
 * (etat.ts), l'etat officiel publie depuis la console, et ce qu'il faut pour le dire — la fin d'un etat
 * date, l'heure de la derniere voix pour « pas d'info depuis ». Et le classement d'un sujet pour le
 * plaisir, le plat recommande. Pur, partage avec la console.
 */

import type { Signalement } from './donnees';
import { etatDUnLieu, finDeValidite, type EtatDUnLieu, type Reglages } from './etat';
import { sujetsDuDomaine, type DomaineDeLieu, type SujetDeLieu } from './vocabulaire';

/** Un etat publie depuis la console sur un lieu : il passe devant celui de la communaute. */
export interface EtatOfficiel {
    readonly id: string;
    readonly sujet: string;
    readonly cible: string;
    readonly valeur: string;
    readonly fin: string | null;
    readonly creeLe: number;
    readonly expireLe: number;
}

/** Les colonnes que l'application lit des etats officiels, nommees. */
export const COLONNES_OFFICIELS = 'id, sujet, cible, valeur, fin, cree_le, expire_le';

function instant(valeur: unknown): number | null {
    if (typeof valeur !== 'string') return null;
    const ms = Date.parse(valeur);
    return Number.isFinite(ms) ? ms : null;
}

/** Une ligne d'`etats_officiels`, ou `null` si elle ne porte pas ce qu'il faut. */
export function lireEtatOfficiel(ligne: unknown): EtatOfficiel | null {
    if (typeof ligne !== 'object' || ligne === null) return null;
    const l = ligne as Record<string, unknown>;
    const creeLe = instant(l.cree_le);
    const expireLe = instant(l.expire_le);
    if (typeof l.id !== 'string' || typeof l.sujet !== 'string' || typeof l.cible !== 'string' || typeof l.valeur !== 'string') return null;
    if (creeLe === null || expireLe === null) return null;
    return { id: l.id, sujet: l.sujet, cible: l.cible, valeur: l.valeur, fin: typeof l.fin === 'string' ? l.fin : null, creeLe, expireLe };
}

export interface EtatDuSujet {
    readonly sujet: SujetDeLieu;
    readonly etat: EtatDUnLieu<EtatOfficiel>;
    /** La fin (`AAAA-MM-JJ`) de la voix la plus recente qui porte la valeur etablie : un etat date. */
    readonly fin: string | null;
    /** La voix comptee la plus recente du jour, meme passee : « pas d'info depuis ». */
    readonly derniereVoix: number | null;
    /** Les appareils dont la voix vaut encore, par valeur : « selon 4 etudiants » ne compte que ceux d'accord. */
    readonly voixParValeur: ReadonlyMap<string, number>;
}

/** L'officiel le plus recent encore valable pour ce sujet sur cette cible. */
function officielDe(officiels: readonly EtatOfficiel[], sujet: string, cible: string, maintenant: number): EtatOfficiel | null {
    let retenu: EtatOfficiel | null = null;
    for (const o of officiels) {
        if (o.sujet !== sujet || o.cible !== cible || o.expireLe <= maintenant || o.creeLe > maintenant) continue;
        if (retenu === null || o.creeLe > retenu.creeLe) retenu = o;
    }
    return retenu;
}

/**
 * Chaque sujet du domaine sur cette cible, dans l'ordre du vocabulaire. Les sujets dont on ne sait rien
 * sont rendus aussi : c'est l'ecran qui choisit ce qu'il tait.
 */
export function lireLeLieu(
    signalements: readonly Signalement[],
    officiels: readonly EtatOfficiel[],
    domaine: DomaineDeLieu,
    cible: string,
    maintenant: number,
    reglages?: Reglages,
): readonly EtatDuSujet[] {
    const duLieu = signalements.filter((s) => s.cible === cible);
    return sujetsDuDomaine(domaine).map((sujet) => {
        const officiel = officielDe(officiels, sujet.sujet, cible, maintenant);
        const etat = etatDUnLieu<EtatOfficiel>(duLieu, sujet.sujet, cible, sujet.famille, maintenant, { officiel, reglages });
        const voix = duLieu.filter((s) => s.sujet === sujet.sujet && s.statut !== 'masquee' && s.poids > 0 && s.creeLe <= maintenant);
        let fin: string | null = null;
        let derniereVoix: number | null = null;
        let derniereAccord = -Infinity;
        const voixParValeur = new Map<string, number>();
        for (const v of voix) {
            if (derniereVoix === null || v.creeLe > derniereVoix) derniereVoix = v.creeLe;
            if (v.statut === 'active' && finDeValidite(v, sujet.famille, reglages) > maintenant) {
                voixParValeur.set(v.valeur, (voixParValeur.get(v.valeur) ?? 0) + 1);
            }
            const valeurEtablie = etat.communaute.nature === 'sans_info' ? null : etat.communaute.valeur;
            if (v.valeur === valeurEtablie && v.statut === 'active' && v.creeLe > derniereAccord) {
                derniereAccord = v.creeLe;
                fin = v.fin;
            }
        }
        return { sujet, etat, fin, derniereVoix, voixParValeur };
    });
}

export interface PlatClasse {
    readonly valeur: string;
    /** Le nombre d'appareils qui le recommandent. */
    readonly voix: number;
    /** La recommandation la plus recente. */
    readonly recent: number;
}

/**
 * Le classement d'un sujet pour le plaisir : ses valeurs par poids, puis par nombre de voix, puis par
 * la plus recente. Seules les voix comptent (attestees, actives, valables), comme pour un etat ; une
 * contribution non attestee n'y entre pas. `permises` borne le classement a ce que l'ecran peut nommer
 * — les plats du menu du jour : une valeur forgee n'y entre jamais.
 */
export function classement(
    signalements: readonly Signalement[],
    sujet: SujetDeLieu,
    cible: string,
    maintenant: number,
    permises: ReadonlySet<string> | null = null,
    reglages?: Reglages,
): readonly PlatClasse[] {
    const parValeur = new Map<string, { poids: number; voix: number; recent: number }>();
    for (const s of signalements) {
        if (s.sujet !== sujet.sujet || s.cible !== cible || s.statut !== 'active' || s.poids === 0) continue;
        if (finDeValidite(s, sujet.famille, reglages) <= maintenant || s.creeLe > maintenant) continue;
        if (permises !== null && !permises.has(s.valeur)) continue;
        const c = parValeur.get(s.valeur) ?? { poids: 0, voix: 0, recent: 0 };
        parValeur.set(s.valeur, { poids: c.poids + s.poids, voix: c.voix + 1, recent: Math.max(c.recent, s.creeLe) });
    }
    return [...parValeur.entries()]
        .sort(([, a], [, b]) => b.poids - a.poids || b.voix - a.voix || b.recent - a.recent)
        .map(([valeur, c]) => ({ valeur, voix: c.voix, recent: c.recent }));
}

/** Un plat tel que l'application l'ecrit et le compare : les espaces ramenes, tronque a cent vingt. */
export function nomDePlat(texte: string): string {
    return texte.replace(/\s+/g, ' ').trim().slice(0, 120).trim();
}
