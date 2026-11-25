/**
 * L'etat d'un lieu, tire des signalements du jour (docs/phase-8/README.md, « Les decisions », et
 * docs/phase-8/1-base-communautaire.md). Pur et partage : l'application le calcule sur l'appareil, la
 * console le reprendra pour la moderation (lot 2). La base ne calcule rien de tout cela ; elle fixe
 * seulement le poids de chaque voix et ce qu'elle vaut au plus (`expire_le`).
 *
 * ## La regle, pour un sujet sur une cible
 *
 * - **Seules les voix comptent** : un signalement atteste (poids 1, ou 2 pour un appareil fiable),
 *   actif, encore valable. Une contribution non attestee (poids 0) s'affiche en retrait et ne pese
 *   rien ; une voix remplacee ou masquee n'existe plus. La base ne laisse a chaque appareil qu'une
 *   voix vivante par sujet et par cible : compter les voix, c'est compter des appareils.
 * - **La premiere voix etablit l'etat**, et une voix d'accord le confirme.
 * - **Une voix contraire le rend incertain** ; la deuxieme voix contraire — ou une seule d'un appareil
 *   fiable — le fait basculer, vers **la plus recente** des voix contraires : entre deux etats
 *   etablis, le plus recent l'emporte, pas le plus vote. Une confirmation entre-temps remet le compte
 *   des voix contraires a zero.
 * - **La confiance baisse avec le temps** depuis la derniere voix d'accord, de moitie a chaque
 *   demi-vie de sa famille ; un etat d'une famille qui dure, vieux d'une heure ou incertain, se
 *   reconfirme : « toujours vrai ? ».
 * - **L'officiel prime** : un message publie depuis la console sur ce lieu passe devant ; l'etat de
 *   la communaute reste calcule, pour s'afficher a cote.
 *
 * Les durees sont celles de l'ecran ; la base borne ce qu'un signalement vaut au plus, et une voix ne
 * vaut jamais au-dela de son `expire_le`. Les valeurs de `REGLAGES` sont dans chaque binaire : elles
 * ne sont pas secretes, et la documentation publique ne les recopie pas.
 */

import type { Famille, Signalement } from './donnees';

export interface Reglages {
    /** Ce qu'un signalement direct vaut a l'ecran. */
    readonly dureeDirectMinutes: number;
    /** La demi-vie de la confiance, par famille. */
    readonly demiVieMinutes: Readonly<Record<Famille, number>>;
    /** L'age d'un etat qui dure a partir duquel l'ecran demande « toujours vrai ? ». */
    readonly questionApresMinutes: number;
}

export const REGLAGES: Reglages = {
    dureeDirectMinutes: 25,
    demiVieMinutes: { jour: 180, date: 720, correction: 1440, direct: 10 },
    questionApresMinutes: 60,
};

export type EtatDeLaCommunaute =
    | { readonly nature: 'sans_info' }
    | {
        readonly nature: 'etabli' | 'incertain';
        readonly valeur: string;
        /** La voix contraire la plus recente, quand l'etat est incertain. */
        readonly contraire: string | null;
        /** L'instant ou cette valeur s'est etablie. */
        readonly depuis: number;
        /** La derniere voix d'accord. */
        readonly confirmeLe: number;
        /** De 1 a l'instant de la derniere voix d'accord, vers 0. */
        readonly confiance: number;
        /** L'ecran demande « toujours vrai ? ». */
        readonly aConfirmer: boolean;
        /** Le nombre d'appareils dont la voix compte encore. */
        readonly voix: number;
    };

export interface EtatDUnLieu<O> {
    readonly communaute: EtatDeLaCommunaute;
    /** Les contributions non attestees encore valables, la plus recente d'abord : en retrait, jamais comptees. */
    readonly enRetrait: readonly Signalement[];
    readonly officiel: O | null;
    /** Ce que l'ecran montre d'abord. */
    readonly prime: 'officiel' | 'communaute' | 'rien';
}

const MINUTE = 60_000;

/** Ce qu'une voix vaut au plus, a l'ecran : sa borne en base, et pour le direct la duree de l'ecran. */
export function finDeValidite(signalement: Signalement, famille: Famille, reglages: Reglages = REGLAGES): number {
    if (famille !== 'direct') return signalement.expireLe;
    return Math.min(signalement.expireLe, signalement.creeLe + reglages.dureeDirectMinutes * MINUTE);
}

function chronologique(a: Signalement, b: Signalement): number {
    return a.creeLe - b.creeLe || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

interface Pli {
    readonly valeur: string;
    readonly depuis: number;
    readonly confirmeLe: number;
    readonly contraire: string | null;
    readonly poidsContraire: number;
}

function plier(voix: readonly Signalement[]): Pli | null {
    let pli: Pli | null = null;
    for (const v of voix) {
        if (pli === null) {
            pli = { valeur: v.valeur, depuis: v.creeLe, confirmeLe: v.creeLe, contraire: null, poidsContraire: 0 };
        } else if (v.valeur === pli.valeur) {
            pli = { ...pli, confirmeLe: v.creeLe, contraire: null, poidsContraire: 0 };
        } else if (pli.poidsContraire + v.poids >= 2) {
            pli = { valeur: v.valeur, depuis: v.creeLe, confirmeLe: v.creeLe, contraire: null, poidsContraire: 0 };
        } else {
            pli = { ...pli, contraire: v.valeur, poidsContraire: pli.poidsContraire + v.poids };
        }
    }
    return pli;
}

/**
 * L'etat d'un sujet sur une cible a l'instant `maintenant`, d'apres tous les signalements lus — ceux
 * des autres sujets et des autres cibles sont ignores, l'ordre du tableau aussi.
 */
export function etatDUnLieu<O = never>(
    signalements: readonly Signalement[],
    sujet: string,
    cible: string,
    famille: Famille,
    maintenant: number,
    options: { readonly officiel?: O | null; readonly reglages?: Reglages } = {},
): EtatDUnLieu<O> {
    const reglages = options.reglages ?? REGLAGES;
    const officiel = options.officiel ?? null;
    const valables = signalements
        .filter((s) => s.sujet === sujet && s.cible === cible && s.statut === 'active' && finDeValidite(s, famille, reglages) > maintenant)
        .sort(chronologique);
    const voix = valables.filter((s) => s.poids > 0);
    const enRetrait = valables.filter((s) => s.poids === 0).reverse();

    const pli = plier(voix);
    let communaute: EtatDeLaCommunaute = { nature: 'sans_info' };
    if (pli !== null) {
        const incertain = pli.contraire !== null;
        const age = maintenant - pli.confirmeLe;
        communaute = {
            nature: incertain ? 'incertain' : 'etabli',
            valeur: pli.valeur,
            contraire: pli.contraire,
            depuis: pli.depuis,
            confirmeLe: pli.confirmeLe,
            confiance: Math.pow(0.5, Math.max(0, age) / (reglages.demiVieMinutes[famille] * MINUTE)),
            aConfirmer: famille !== 'direct' && (incertain || age >= reglages.questionApresMinutes * MINUTE),
            voix: voix.length,
        };
    }
    const prime = officiel !== null ? 'officiel' : communaute.nature !== 'sans_info' ? 'communaute' : 'rien';
    return { communaute, enRetrait, officiel, prime };
}
