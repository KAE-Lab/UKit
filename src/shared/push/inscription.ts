/**
 * Ce qu'un appareil depose dans la base pour recevoir les messages de service en notification
 * (jalon 6.1.x-E) — et quand il le redepose.
 *
 * Pur, pour que la regle se verifie sous vitest : la forme d'un jeton Expo, l'egalite de deux
 * inscriptions, et l'echeance du redepot. L'inscription porte exactement ce que le ciblage exige
 * pour decider AVANT d'envoyer — le campus, la version, la plateforme, le statut de testeur — et
 * rien d'autre (PRIVACY.md, point 4 quater).
 */

import type { Plateforme } from '../ciblage/ciblage';

export interface Inscription {
    readonly jeton: string;
    readonly plateforme: Plateforme;
    readonly etablissement: string;
    readonly version: string;
    readonly testeur: boolean;
}

/** La memoire du dernier depot, sur l'appareil : ce qui a ete ecrit, et quand. */
export interface MemoireDeDepot {
    readonly inscription: Inscription;
    readonly at: number;
}

/** Un jeton Expo : la seule forme que la base accepte (schema.sql). */
const FORME_JETON = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;

/**
 * Un depot identique se rejoue tout de meme tous les sept jours : `maj_le` dit a la base qu'un
 * appareil vit encore, ce qui permettra un jour d'elaguer les jetons morts sans attendre un envoi.
 */
export const INTERVALLE_REDEPOT_MS = 7 * 24 * 60 * 60 * 1000;

export function estUnJeton(valeur: unknown): valeur is string {
    return typeof valeur === 'string' && FORME_JETON.test(valeur);
}

export function memeInscription(a: Inscription, b: Inscription): boolean {
    return a.jeton === b.jeton && a.plateforme === b.plateforme && a.etablissement === b.etablissement
        && a.version === b.version && a.testeur === b.testeur;
}

/** Faut-il ecrire ? Jamais deposee, changee, ou trop ancienne. */
export function doitDeposer(memoire: MemoireDeDepot | null, courante: Inscription, maintenant: number): boolean {
    if (memoire === null) return true;
    if (!memeInscription(memoire.inscription, courante)) return true;
    return memoire.at + INTERVALLE_REDEPOT_MS <= maintenant;
}

/** La memoire relue depuis le disque, defensive : une memoire illisible vaut « jamais deposee ». */
export function lireMemoire(brut: string | null): MemoireDeDepot | null {
    if (brut === null) return null;
    try {
        const contenu = JSON.parse(brut) as { inscription?: Partial<Inscription>; at?: unknown };
        const i = contenu.inscription;
        if (i === undefined || !estUnJeton(i.jeton) || (i.plateforme !== 'ios' && i.plateforme !== 'android')) return null;
        if (typeof i.etablissement !== 'string' || typeof i.version !== 'string' || typeof contenu.at !== 'number') return null;
        return {
            inscription: { jeton: i.jeton, plateforme: i.plateforme, etablissement: i.etablissement, version: i.version, testeur: i.testeur === true },
            at: contenu.at,
        };
    } catch {
        return null;
    }
}
