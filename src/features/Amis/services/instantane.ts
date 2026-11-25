/**
 * L'instantane d'un emploi du temps personnel (docs/phase-8/8-amis.md) : les creneaux occupes de
 * quatorze jours, **sans intitule, sans salle, sans rien d'autre que des heures**, et leur forme
 * compacte pour le lien. Pur : les cours arrivent deja lus, l'heure en parametre.
 *
 * Un emploi du temps personnel (un lien d'abonnement, l'emploi du temps nominatif de l'INP) ne se
 * partage pas par ce qui l'ouvre : ce serait donner l'acces a quelqu'un d'autre, et un lien
 * d'abonnement vaut un mot de passe (docs/features/planning.md). Ce qui part est une photo de ses
 * heures, qui perime : deux semaines, puis elle se dit expiree.
 *
 * La forme compacte : trois octets par creneau, `jour << 18 | debut << 9 | duree`, le jour de 0 a 13
 * depuis le premier jour, le debut et la duree en pas de cinq minutes. Un creneau s'arrondit vers
 * l'exterieur, au pas : il couvre toujours le cours.
 */

import moment from 'moment';

import type { Plage } from '../../Planning/services/carteDuJour';
import { minutesDe } from '../../Planning/services/frise';

/** La duree de validite d'un instantane, en jours, le jour du partage compris. */
export const JOURS_DE_L_INSTANTANE = 14;
/** Le pas des heures, en minutes : celui des emplois du temps lus, a quelques exceptions pres. */
export const PAS_MINUTES = 5;
/** Au-dela, un instantane n'est pas un emploi du temps : un lien qui en porte plus est refuse. */
export const CRENEAUX_MAXIMUM = 200;

const PAS_PAR_JOUR = (24 * 60) / PAS_MINUTES;

export interface Creneau extends Plage {
    /** Le rang du jour depuis le premier jour de l'instantane, de 0 a 13. */
    readonly jour: number;
}

/** Ce que l'instantane lit d'un cours : sa date et ses heures. Un `PlanningEvent` en est un. */
export interface CoursDatable {
    readonly starttime: string;
    readonly endtime: string;
    readonly date?: { readonly start?: string };
    readonly journeeEntiere?: boolean;
    readonly source?: 'telephone';
    readonly category?: string;
}

/** `YYYY-MM-DD`, la forme des dates de ce module. */
export function dateDuJour(instant: moment.MomentInput): string {
    return moment(instant).format('YYYY-MM-DD');
}

/**
 * Les creneaux occupes de quatorze jours a partir de `premierJour`, fondus quand ils se recouvrent.
 *
 * Ni journee entiere (une vacance, un ferie de l'export PRONOTE n'occupe pas), ni evenement du
 * telephone, ni cours masque par un filtre : ce qui part est ce que l'etudiant suit. Un cours hors
 * de la fenetre ou sans heures lisibles ne compte pas.
 */
export function creneauxOccupes(cours: readonly CoursDatable[], premierJour: string): Creneau[] {
    const origine = moment(premierJour, 'YYYY-MM-DD').startOf('day');
    const parJour = new Map<number, Plage[]>();
    for (const un of cours) {
        const lu = plageDuCours(un, origine);
        if (lu !== null) parJour.set(lu.jour, [...(parJour.get(lu.jour) ?? []), lu.plage]);
    }
    const creneaux: Creneau[] = [];
    for (const jour of [...parJour.keys()].sort((a, b) => a - b)) {
        for (const plage of fondre(parJour.get(jour) ?? [])) creneaux.push({ jour, ...plage });
    }
    return creneaux;
}

/** Le rang du jour d'un cours et sa plage arrondie au pas, ou `null` s'il ne compte pas. */
function plageDuCours(un: CoursDatable, origine: moment.Moment): { jour: number; plage: Plage } | null {
    if (un.journeeEntiere === true || un.source === 'telephone') return null;
    if (un.category === 'masked' || un.category === 'nocourse') return null;
    const debut = minutesDe(un.starttime);
    const fin = minutesDe(un.endtime);
    const date = un.date?.start;
    if (debut === null || fin === null || fin <= debut || typeof date !== 'string') return null;
    const jour = moment(date).startOf('day').diff(origine, 'days');
    if (!(jour >= 0 && jour < JOURS_DE_L_INSTANTANE)) return null;
    return {
        jour,
        plage: {
            debut: Math.floor(debut / PAS_MINUTES) * PAS_MINUTES,
            fin: Math.min(24 * 60, Math.ceil(fin / PAS_MINUTES) * PAS_MINUTES),
        },
    };
}

/** Les plages fondues quand elles se recouvrent ou se touchent, dans l'ordre du debut. */
export function fondre(plages: readonly Plage[]): Plage[] {
    const triees = [...plages].sort((a, b) => a.debut - b.debut || a.fin - b.fin);
    const blocs: Plage[] = [];
    for (const plage of triees) {
        const dernier = blocs[blocs.length - 1];
        if (dernier !== undefined && plage.debut <= dernier.fin) blocs[blocs.length - 1] = { debut: dernier.debut, fin: Math.max(dernier.fin, plage.fin) };
        else blocs.push({ debut: plage.debut, fin: plage.fin });
    }
    return blocs;
}

/** Trois octets par creneau. Rend `null` pour un creneau hors des bornes : il ne s'ecrit pas. */
export function encoderCreneaux(creneaux: readonly Creneau[]): Uint8Array | null {
    const octets = new Uint8Array(creneaux.length * 3);
    for (let i = 0; i < creneaux.length; i += 1) {
        const { jour, debut, fin } = creneaux[i];
        const pasDebut = debut / PAS_MINUTES;
        const duree = (fin - debut) / PAS_MINUTES;
        const valide = Number.isInteger(jour) && jour >= 0 && jour < JOURS_DE_L_INSTANTANE
            && Number.isInteger(pasDebut) && pasDebut >= 0 && Number.isInteger(duree) && duree >= 1 && pasDebut + duree <= PAS_PAR_JOUR;
        if (!valide) return null;
        const valeur = (jour << 18) | (pasDebut << 9) | duree;
        octets[i * 3] = (valeur >> 16) & 0xff;
        octets[i * 3 + 1] = (valeur >> 8) & 0xff;
        octets[i * 3 + 2] = valeur & 0xff;
    }
    return octets;
}

/**
 * Les creneaux d'une forme compacte, ou `null` si elle ne decrit pas un instantane : une longueur qui
 * n'est pas un multiple de trois, trop de creneaux, un jour, un debut ou une duree hors bornes. Un
 * lien abime ne s'affiche jamais a moitie.
 */
export function decoderCreneaux(octets: Uint8Array): Creneau[] | null {
    if (octets.length % 3 !== 0 || octets.length / 3 > CRENEAUX_MAXIMUM) return null;
    const creneaux: Creneau[] = [];
    for (let i = 0; i < octets.length; i += 3) {
        const valeur = (octets[i] << 16) | (octets[i + 1] << 8) | octets[i + 2];
        const jour = valeur >> 18;
        const pasDebut = (valeur >> 9) & 0x1ff;
        const duree = valeur & 0x1ff;
        if (jour >= JOURS_DE_L_INSTANTANE || duree < 1 || pasDebut + duree > PAS_PAR_JOUR) return null;
        creneaux.push({ jour, debut: pasDebut * PAS_MINUTES, fin: (pasDebut + duree) * PAS_MINUTES });
    }
    return creneaux;
}

/** Le dernier jour couvert par un instantane, `YYYY-MM-DD`. */
export function dernierJour(premierJour: string): string {
    return moment(premierJour, 'YYYY-MM-DD').add(JOURS_DE_L_INSTANTANE - 1, 'days').format('YYYY-MM-DD');
}

/** L'instantane a-t-il expire ? Le lendemain de son dernier jour, a minuit. */
export function estExpire(premierJour: string, aujourdhui: string): boolean {
    return aujourdhui > dernierJour(premierJour);
}

/**
 * Les creneaux occupes d'une date, ou `null` si l'instantane ne la couvre pas : un jour hors de sa
 * fenetre n'est pas libre, il est inconnu, et rien ne s'y calcule.
 */
export function occupeLe(premierJour: string, creneaux: readonly Creneau[], date: string): Plage[] | null {
    const jour = moment(date, 'YYYY-MM-DD').diff(moment(premierJour, 'YYYY-MM-DD'), 'days');
    if (!(jour >= 0 && jour < JOURS_DE_L_INSTANTANE)) return null;
    return creneaux.filter((c) => c.jour === jour).map(({ debut, fin }) => ({ debut, fin }));
}
