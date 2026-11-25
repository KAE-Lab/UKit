/**
 * La moderation des signalements, sans ecran (docs/phase-8/2-signalements.md) : les lignes de
 * `signalements_a_moderer` lues defensivement, rangees par lieu, chaque lieu avec l'etat de ses sujets
 * tel que l'application le calcule (src/shared/communaute/etat.ts), filtrees et comptees. Pur : joue
 * par `npm test` a la racine du depot.
 */

import { lireSignalement, type Signalement } from '../../../../src/shared/communaute/donnees';
import { classement, lireLeLieu, type EtatDuSujet, type EtatOfficiel, type PlatClasse } from '../../../../src/shared/communaute/lieu';
import { sujetDeLieu, type DomaineDeLieu } from '../../../../src/shared/communaute/vocabulaire';

/** Un signalement tel que la console le lit : ni la cle de son auteur, seulement s'il est bloque et combien il en a ecrit ce jour-la. */
export interface SignalementModere extends Signalement {
    readonly auteurBloque: boolean;
    readonly auteurDuJour: number;
}

export function lireSignalementModere(ligne: unknown): SignalementModere | null {
    const s = lireSignalement(ligne);
    if (s === null) return null;
    const l = ligne as Record<string, unknown>;
    return { ...s, auteurBloque: l.auteur_bloque === true, auteurDuJour: typeof l.auteur_du_jour === 'number' ? l.auteur_du_jour : 0 };
}

export interface Lieu {
    readonly domaine: DomaineDeLieu;
    readonly cible: string;
    /** Du plus recent au plus ancien. */
    readonly signalements: readonly SignalementModere[];
    readonly officiels: readonly EtatOfficiel[];
    /** L'etat de chaque sujet du domaine, a l'instant de la lecture. */
    readonly etats: readonly EtatDuSujet[];
    /** Le plat recommande se classe, il ne s'etablit pas : le classement du jour, sans borne de menu. */
    readonly plats: readonly PlatClasse[];
    readonly dernier: number;
}

const SUJET_DU_PLAT = sujetDeLieu('restaurant.plat');

export type StatutFiltre = 'tous' | 'active' | 'masquee' | 'non_verifie';

export interface Filtre {
    readonly domaine: DomaineDeLieu | null;
    readonly sujet: string | null;
    readonly statut: StatutFiltre;
}

export const SANS_FILTRE: Filtre = { domaine: null, sujet: null, statut: 'tous' };

export function garde(s: SignalementModere, filtre: Filtre): boolean {
    const domaine = sujetDeLieu(s.sujet)?.domaine;
    if (domaine === undefined) return false;
    if (filtre.domaine !== null && domaine !== filtre.domaine) return false;
    if (filtre.sujet !== null && s.sujet !== filtre.sujet) return false;
    if (filtre.statut === 'active') return s.statut === 'active';
    if (filtre.statut === 'masquee') return s.statut === 'masquee';
    if (filtre.statut === 'non_verifie') return s.poids === 0;
    return true;
}

/**
 * Les lieux qui ont un signalement retenu par le filtre, ou un etat officiel valable, le plus actif
 * d'abord. L'etat d'un lieu se calcule sur tous ses signalements, filtre ou pas : un filtre choisit ce
 * qu'on regarde, pas ce que l'application montre.
 */
export function lieux(signalements: readonly SignalementModere[], officiels: readonly EtatOfficiel[], filtre: Filtre, maintenant: number): readonly Lieu[] {
    const parCible = new Map<string, { domaine: DomaineDeLieu; tous: SignalementModere[] }>();
    const ajouter = (sujet: string, cible: string) => {
        const domaine = sujetDeLieu(sujet)?.domaine;
        if (domaine === undefined) return null;
        const cle = `${domaine}|${cible}`;
        const entree = parCible.get(cle) ?? { domaine, tous: [] };
        parCible.set(cle, entree);
        return entree;
    };
    for (const s of signalements) ajouter(s.sujet, s.cible)?.tous.push(s);
    for (const o of officiels) if (o.expireLe > maintenant) ajouter(o.sujet, o.cible);

    const resultat: Lieu[] = [];
    for (const [cle, { domaine, tous }] of parCible) {
        const cible = cle.slice(domaine.length + 1);
        const officielsDuLieu = officiels.filter((o) => o.cible === cible && sujetDeLieu(o.sujet)?.domaine === domaine);
        const retenus = tous.filter((s) => garde(s, filtre)).sort((a, b) => b.creeLe - a.creeLe);
        const officielValable = officielsDuLieu.some((o) => o.expireLe > maintenant
            && (filtre.domaine === null || filtre.domaine === domaine) && (filtre.sujet === null || filtre.sujet === o.sujet));
        if (retenus.length === 0 && !(officielValable && filtre.statut === 'tous')) continue;
        resultat.push({
            domaine,
            cible,
            signalements: retenus,
            officiels: officielsDuLieu,
            etats: lireLeLieu(tous, officielsDuLieu, domaine, cible, maintenant),
            plats: domaine === 'restaurant' && SUJET_DU_PLAT !== undefined ? classement(tous, SUJET_DU_PLAT, cible, maintenant) : [],
            dernier: Math.max(...retenus.map((s) => s.creeLe), ...officielsDuLieu.map((o) => o.creeLe)),
        });
    }
    return resultat.sort((a, b) => b.dernier - a.dernier || (a.cible < b.cible ? -1 : 1));
}

export interface Comptes {
    readonly signalements: number;
    readonly voix: number;
    readonly nonVerifies: number;
    readonly masques: number;
    readonly lieux: number;
}

export function compter(signalements: readonly SignalementModere[], filtre: Filtre): Comptes {
    const retenus = signalements.filter((s) => garde(s, { ...filtre, statut: 'tous' }));
    const cibles = new Set(retenus.map((s) => `${sujetDeLieu(s.sujet)?.domaine ?? ''}|${s.cible}`));
    return {
        signalements: retenus.length,
        voix: retenus.filter((s) => s.poids > 0 && s.statut !== 'masquee').length,
        nonVerifies: retenus.filter((s) => s.poids === 0).length,
        masques: retenus.filter((s) => s.statut === 'masquee').length,
        lieux: cibles.size,
    };
}

/** La fin d'un etat officiel publie depuis un etat de la communaute : sa date, ou ce soir, ou un mois pour une correction. */
export function finDeLOfficiel(etat: EtatDuSujet, jour: string): string {
    if (etat.sujet.famille === 'date' && etat.fin !== null) return etat.fin;
    if (etat.sujet.famille !== 'correction') return jour;
    const [a, m, j] = jour.split('-').map(Number);
    const d = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, (j ?? 1) + 30));
    return d.toISOString().slice(0, 10);
}
