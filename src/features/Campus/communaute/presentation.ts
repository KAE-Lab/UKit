/**
 * Ce que la section « Sur place » d'une fiche montre, sujet par sujet (docs/phase-8/2-signalements.md,
 * « L'affichage ») : pur, sans langue — les mots viennent du composant, qui lit ce que ce module rend.
 *
 * - **L'officiel passe devant**, meme quand il dit la normale (« Ouvert aujourd'hui ») : c'est la
 *   reponse de l'equipe a un faux signalement. L'etat de la communaute reste compte a cote.
 * - **Un etat etabli sur la normale ne s'affiche pas** : « non » eteint un signalement, il n'en cree pas.
 *   Incertain sur la normale, c'est la voix contraire qui se montre, incertaine.
 * - **Une seule voix se lit en retrait**, et la contribution non attestee plus en retrait encore, seule
 *   et seulement quand aucune voix ne dit rien.
 * - **Une correction d'horaires** ne vaut que pour les horaires que la source affiche encore (son
 *   empreinte) ; une ligne d'une autre empreinte se tait.
 * - Le plat recommande se classe a part (lieu.ts), et l'attente se montre dans sa rangee aux heures du
 *   service : la fiche les retire elle-meme de la liste.
 */

import type { SemanticTone } from '../../../shared/theme/Theme';
import type { Signalement } from '../../../shared/communaute';
import { lireCorrection } from '../../../shared/communaute/horaires';
import type { EtatDuSujet } from '../../../shared/communaute/lieu';
import type { SujetDeLieu } from '../../../shared/communaute/vocabulaire';

export type SourceDeLigne = 'officiel' | 'communaute' | 'non_verifie';

export interface LigneSurPlace {
    readonly sujet: SujetDeLieu;
    readonly valeur: string;
    readonly source: SourceDeLigne;
    readonly incertain: boolean;
    /** Le nombre d'appareils dont la voix compte ; 0 pour l'officiel et le non verifie. */
    readonly voix: number;
    /** L'instant a dire : la derniere voix d'accord, la publication officielle, la contribution. */
    readonly depuis: number;
    /** Le dernier jour d'un etat date. */
    readonly fin: string | null;
    readonly ton: SemanticTone;
    /** Une seule voix, ou incertain, ou non verifie : la ligne se lit en retrait. */
    readonly enRetrait: boolean;
    /** « Toujours vrai ? » se pose : un etat de la communaute qui dure, vieux d'une heure ou incertain. */
    readonly aConfirmer: boolean;
    /** Sous un officiel : combien de voix de la communaute disent autre chose. */
    readonly contraires: number;
}

/** Ce qui fait d'une valeur un probleme, une gene, ou un bon signe. */
export function tonDe(sujet: SujetDeLieu, valeur: string): SemanticTone {
    if (sujet.sujet.endsWith('.attente')) return valeur === 'fluide' ? 'success' : valeur === 'attente' ? 'warning' : 'danger';
    if (sujet.categorie === 'plaisir') return 'neutral';
    if (sujet.sujet.endsWith('.horaires')) return 'warning';
    if (valeur === sujet.normale) return 'success';
    return /(ferme|fermee|ferme_jusqu|fermee_jusqu|acces_bloque)$/.test(sujet.sujet) ? 'danger' : 'warning';
}

export interface ContexteDuLieu {
    readonly maintenant: number;
    /** L'empreinte des horaires que la source affiche (horaires.ts) ; sans elle, aucune correction ne se montre. */
    readonly empreinteDesHoraires?: string | null;
}

/** Une valeur qui ne dit rien de plus que la source : la normale, ou une correction qui confirme la source. */
function ditRien(sujet: SujetDeLieu, valeur: string): boolean {
    if (valeur === sujet.normale) return true;
    if (sujet.sujet.endsWith('.horaires')) return lireCorrection(valeur)?.source === true;
    return false;
}

/** Une correction d'horaires qui ne porte pas sur les horaires affiches ne se montre pas. */
function horsSujet(sujet: SujetDeLieu, valeur: string, contexte: ContexteDuLieu): boolean {
    if (!sujet.sujet.endsWith('.horaires')) return false;
    const correction = lireCorrection(valeur);
    return correction === null || contexte.empreinteDesHoraires == null || correction.empreinte !== contexte.empreinteDesHoraires;
}

function ligneOfficielle(e: EtatDuSujet): LigneSurPlace | null {
    const o = e.etat.officiel;
    if (o === null) return null;
    let contraires = 0;
    for (const [valeur, n] of e.voixParValeur) if (valeur !== o.valeur) contraires += n;
    return {
        sujet: e.sujet, valeur: o.valeur, source: 'officiel', incertain: false, voix: 0, depuis: o.creeLe, fin: o.fin,
        ton: tonDe(e.sujet, o.valeur), enRetrait: false, aConfirmer: false, contraires,
    };
}

function ligneDeLaCommunaute(e: EtatDuSujet, contexte: ContexteDuLieu): LigneSurPlace | null {
    const c = e.etat.communaute;
    if (c.nature === 'sans_info') return null;
    const incertain = c.nature === 'incertain';
    let valeur = c.valeur;
    if (ditRien(e.sujet, valeur)) {
        // Incertain sur la normale : c'est la voix contraire qui apporte quelque chose.
        if (!incertain || c.contraire === null) return null;
        valeur = c.contraire;
    }
    if (ditRien(e.sujet, valeur) || horsSujet(e.sujet, valeur, contexte)) return null;
    const voix = e.voixParValeur.get(valeur) ?? 0;
    return {
        sujet: e.sujet, valeur, source: 'communaute', incertain, voix, depuis: valeur === c.valeur ? c.confirmeLe : (e.derniereVoix ?? c.confirmeLe), fin: e.fin,
        ton: tonDe(e.sujet, valeur), enRetrait: incertain || voix <= 1, aConfirmer: c.aConfirmer, contraires: 0,
    };
}

function ligneNonVerifiee(e: EtatDuSujet, contexte: ContexteDuLieu): LigneSurPlace | null {
    const derniere: Signalement | undefined = e.etat.enRetrait[0];
    if (derniere === undefined || ditRien(e.sujet, derniere.valeur) || horsSujet(e.sujet, derniere.valeur, contexte)) return null;
    return {
        sujet: e.sujet, valeur: derniere.valeur, source: 'non_verifie', incertain: false, voix: 0, depuis: derniere.creeLe, fin: derniere.fin,
        ton: 'neutral', enRetrait: true, aConfirmer: false, contraires: 0,
    };
}

/**
 * Les lignes d'un lieu, dans l'ordre du vocabulaire. Le plat recommande n'y est pas : il se classe
 * (lieu.ts `classement`), il ne s'etablit pas.
 */
export function lignesSurPlace(etats: readonly EtatDuSujet[], contexte: ContexteDuLieu): readonly LigneSurPlace[] {
    const lignes: LigneSurPlace[] = [];
    for (const e of etats) {
        if (e.sujet.sujet === 'restaurant.plat') continue;
        const ligne = ligneOfficielle(e) ?? ligneDeLaCommunaute(e, contexte) ?? (e.etat.communaute.nature === 'sans_info' ? ligneNonVerifiee(e, contexte) : null);
        if (ligne !== null) lignes.push(ligne);
    }
    return lignes;
}

/** La valeur qui dit « non » a une ligne : la normale, ou la source juste pour une correction. */
export function valeurContraire(ligne: LigneSurPlace, empreinte: string | null | undefined): string | null {
    if (ligne.sujet.normale !== null) return ligne.valeur === ligne.sujet.normale ? null : ligne.sujet.normale;
    if (ligne.sujet.sujet.endsWith('.horaires')) return empreinte == null ? null : `${empreinte}|source`;
    return null;
}

/** Depuis quand on ne sait plus rien d'un sujet direct, ou `null` : rien ce jour-la, ou une voix qui vaut encore. */
export function sansInfoDepuis(etat: EtatDuSujet | undefined): number | null {
    if (etat === undefined || etat.sujet.famille !== 'direct') return null;
    if (etat.etat.officiel !== null || etat.etat.communaute.nature !== 'sans_info') return null;
    return etat.derniereVoix;
}
