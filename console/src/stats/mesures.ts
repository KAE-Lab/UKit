/**
 * Une ligne de `mesures`, lue a la frontiere : la base en garantit la forme (`supabase/schema.sql`),
 * la console la verifie quand meme, parce qu'un calcul sur une ligne hors forme rendrait un chiffre
 * faux sans le dire. Une ligne illisible fait echouer la lecture, avec son motif : elle ne se saute pas.
 *
 * Pur : joue par `npm test` a la racine du depot (agregats.test.ts).
 */

import { estUnJour } from './periode';

/** Les colonnes lues : celles du compteur, sans `maj_le`, qui ne sert a aucun calcul. */
export const COLONNES_DE_MESURE = 'jour,heure,evenement,cle,campus,version,plateforme,testeur,n';

export type Plateforme = 'ios' | 'android';

export interface Mesure {
    readonly jour: string;
    /** -1 pour le jour entier, 0 a 23 pour les evenements qui portent l'heure. */
    readonly heure: number;
    readonly evenement: string;
    readonly cle: string;
    readonly campus: string;
    readonly version: string;
    readonly plateforme: Plateforme;
    readonly testeur: boolean;
    readonly n: number;
}

export class MesureIllisible extends Error {
    constructor(motif: string) {
        super(`Une ligne de mesures est illisible (${motif}) : les chiffres ne sont pas montrés plutôt que faux.`);
        this.name = 'MesureIllisible';
    }
}

const VERSION = /^\d+\.\d+\.\d+$/;

function texte(ligne: Record<string, unknown>, colonne: string): string {
    const valeur = ligne[colonne];
    if (typeof valeur !== 'string') throw new MesureIllisible(`${colonne} n’est pas un texte`);
    return valeur;
}

export function lireMesure(brute: unknown): Mesure {
    if (brute === null || typeof brute !== 'object') throw new MesureIllisible('ce n’est pas un objet');
    const ligne = brute as Record<string, unknown>;
    const jour = texte(ligne, 'jour');
    if (!estUnJour(jour)) throw new MesureIllisible(`jour ${jour}`);
    const { heure, n, testeur } = ligne;
    if (typeof heure !== 'number' || !Number.isInteger(heure) || heure < -1 || heure > 23) throw new MesureIllisible('heure');
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) throw new MesureIllisible('n');
    if (typeof testeur !== 'boolean') throw new MesureIllisible('testeur');
    const version = texte(ligne, 'version');
    if (!VERSION.test(version)) throw new MesureIllisible(`version ${version}`);
    const plateforme = texte(ligne, 'plateforme');
    if (plateforme !== 'ios' && plateforme !== 'android') throw new MesureIllisible(`plateforme ${plateforme}`);
    return { jour, heure, evenement: texte(ligne, 'evenement'), cle: texte(ligne, 'cle'), campus: texte(ligne, 'campus'), version, plateforme, testeur, n };
}

/** La cle primaire d'une ligne, telle que la base la porte. */
export function cleDeMesure(m: Mesure): string {
    return [m.jour, m.heure, m.evenement, m.cle, m.campus, m.version, m.plateforme, m.testeur].join('|');
}

/**
 * Une ligne lue deux fois n'en compte qu'une. La lecture par lots decale ses bornes quand un compteur
 * en retard cree une ligne pendant qu'elle avance : la derniere ligne d'un lot revient en tete du
 * suivant. La plus recente lue l'emporte — son `n` a pu grandir entre-temps.
 */
export function dedoublonner(mesures: readonly Mesure[]): Mesure[] {
    return [...new Map(mesures.map((m) => [cleDeMesure(m), m])).values()];
}
