/**
 * Le contrat d'un message de service, et la traduction depuis la ligne de base.
 *
 * Pur — aucune plateforme — pour la meme raison que `BdeMapping` : la projection est la partie du
 * chemin ou une erreur ne se voit pas. Une ligne vient soit de la base, typee, soit du cache local,
 * ou elle n'est qu'un JSON d'une autre epoque ; les deux passent par la meme porte defensive.
 *
 * Voir docs/pilotage.md.
 */

import { projeterCiblage, type Ciblage } from '../ciblage/ciblage';

export type NiveauDeMessage = 'info' | 'avertissement' | 'incident';

const NIVEAUX: readonly string[] = ['info', 'avertissement', 'incident'];

export interface MessageDeService {
    /** La memoire « vu » de l'appareil : stable d'une republication a l'autre. */
    readonly cle: string;
    readonly niveau: NiveauDeMessage;
    readonly titre: string;
    readonly corps: string | null;
    /** ISO 8601 tel que la base le rend ; ne sert qu'au tri. Vide si la ligne n'en porte pas. */
    readonly publieLe: string;
    readonly expireLe: string | null;
    readonly actif: boolean;
    readonly ciblage: Ciblage;
}

function texte(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur.trim() !== '' ? valeur : null;
}

/**
 * Projette une ligne, ou rend `null` si elle n'a pas de quoi etre montree.
 *
 * Un niveau inconnu est un rejet et non un repli sur `info` : la presentation depend du niveau, et
 * montrer un incident comme une information serait pire que ne rien montrer.
 */
export function projeterMessage(ligne: unknown): MessageDeService | null {
    if (ligne === null || typeof ligne !== 'object' || Array.isArray(ligne)) return null;
    const source = ligne as Record<string, unknown>;

    const cle = texte(source.cle);
    const titre = texte(source.titre);
    const niveau = source.niveau;
    if (cle === null || titre === null || typeof niveau !== 'string' || !NIVEAUX.includes(niveau)) return null;

    return {
        cle,
        niveau: niveau as NiveauDeMessage,
        titre: titre.trim(),
        corps: texte(source.corps)?.trim() ?? null,
        publieLe: texte(source.publie_le) ?? '',
        expireLe: texte(source.expire_le),
        actif: source.actif !== false,
        ciblage: projeterCiblage(source),
    };
}

/** Une liste de lignes, dont on garde ce qui se projette. Tout autre chose qu'un tableau vaut vide. */
export function projeterMessages(lignes: unknown): MessageDeService[] {
    if (!Array.isArray(lignes)) return [];
    return lignes.map(projeterMessage).filter((message): message is MessageDeService => message !== null);
}

/**
 * Toujours en cours ? Actif, et pas expire.
 *
 * Meme regle que `estValide` des annonces, et pour la meme raison : la politique de lecture filtre
 * cote base, mais la ligne peut venir du cache. Sans expiration, un message n'expire pas ; une date
 * illisible est un rejet, parce qu'on ne sait pas s'il est encore d'actualite.
 */
export function estEnCours(message: MessageDeService, maintenant: Date): boolean {
    if (!message.actif) return false;
    if (message.expireLe === null) return true;
    const expiration = new Date(message.expireLe).getTime();
    return Number.isNaN(expiration) ? false : expiration > maintenant.getTime();
}
