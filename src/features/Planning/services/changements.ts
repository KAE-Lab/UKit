/**
 * Les changements de l'emploi du temps entre deux lectures (docs/phase-8/6-intelligence.md) : une
 * salle, une heure, un cours retire. Pur : les lectures arrivent deja lues, l'instant en parametre ;
 * le magasin qui garde la base vit dans lectures.ts.
 *
 * ## L'identite d'un cours, d'une lecture a l'autre
 *
 * L'identifiant de la source ne suffit pas, et s'y fier ferait des faux changements : Celcat numerote
 * l'occurrence d'une serie (`<prefixe>:<evenement>:<occurrence>`, seancesRestantes.ts), et un export
 * iCalendar peut regenerer ses UID a chaque requete. Un cours se retrouve donc par etapes, chacune sur
 * ce qui reste de la precedente :
 *
 *   1. **identique** en tout ce qui se voit (intitule et type, heures, salle) — quel que soit son
 *      identifiant : une source qui renumerote ne change rien ;
 *   2. **meme identifiant** : la source dit que c'est lui, et ce qui differe a change ;
 *   3. **memes heures et meme salle** : un intitule renomme par la source n'est pas un changement ;
 *   4. **meme intitule et meme type**, quand il n'y en a qu'un de chaque cote ce jour-la : un cours
 *      deplace dont la source a aussi change l'identifiant.
 *
 * Ce qui reste de l'ancienne lecture est **retire** ; ce qui reste de la nouvelle est un ajout, qui ne
 * se signale pas dans ce lot.
 *
 * ## La memoire
 *
 * Chaque jour garde une **base** — la lecture a laquelle on compare — et la derniere lecture. Une lecture
 * sans difference avec la base devient la base : un retour a l'etat d'avant efface le changement. Une
 * difference garde la base vingt-quatre heures apres sa detection, le temps qu'on la lise ; ensuite la
 * base avance, et le changement se tait. Une autre identite — un autre etablissement, d'autres favoris —
 * repart de zero : comparer deux emplois du temps differents ne dirait que des faux changements.
 */

import moment from 'moment';

import { lignesDuCreneau } from '../components/CourseAnnotations';
import { separerCodeUE, type PlanningEvent } from './PlanningAssembly';

/** Ce qu'une lecture garde d'un cours : ce qui se voit sur sa carte, et ce que le filtre d'UE lit. */
export interface EmpreinteDeCours {
    readonly id: string;
    readonly sujet: string;
    readonly type: string;
    readonly debut: string;
    readonly fin: string;
    /** La salle telle que la carte l'affiche (`lignesDuCreneau`), `''` sans salle. */
    readonly salle: string;
    /** Les intitules declares, pour ne pas signaler un cours retire que le filtre masque. */
    readonly modules?: readonly string[];
}

/** Ce qu'un cours etait avant : ses heures et sa salle. */
export interface AvantDuCours {
    readonly debut: string;
    readonly fin: string;
    readonly salle: string;
}

export type Changement =
    | {
        readonly genre: 'modifie';
        /** Le cours tel qu'il est lu maintenant : la carte le retrouve par son identifiant et son debut. */
        readonly cours: EmpreinteDeCours;
        readonly avant: AvantDuCours;
        readonly heure: boolean;
        readonly salle: boolean;
    }
    | { readonly genre: 'retire'; readonly cours: EmpreinteDeCours };

/** Le jour local d'un cours, `AAAA-MM-JJ` : celui ou la vue jour et la semaine le rangent. */
export function jourDuCours(cours: { readonly date: { readonly start: string } }): string {
    return moment(cours.date.start).format('YYYY-MM-DD');
}

function normal(texte: string | undefined): string {
    return (texte ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * L'empreinte d'un cours, ou `null` pour ce qui n'est pas un cours a comparer : un evenement du
 * telephone ou du campus, une journee entiere (des vacances n'ont ni heure ni salle).
 */
export function empreinteDuCours(cours: PlanningEvent): EmpreinteDeCours | null {
    if (cours.source === 'telephone' || cours.journeeEntiere === true) return null;
    const salle = lignesDuCreneau(cours.description, cours.lieu, cours.natures).find((ligne) => ligne.icone === 'room')?.texte ?? '';
    return {
        id: String(cours.id ?? ''),
        sujet: (cours.subject ?? '').trim(),
        type: (cours.category ?? '').trim(),
        debut: cours.starttime,
        fin: cours.endtime,
        salle,
        ...(cours.modules !== undefined ? { modules: cours.modules } : {}),
    };
}

/**
 * Une lecture, rangee par jour : chacun des `jours` lus a sa liste, vide comprise — un jour qui n'a
 * plus rien est un jour dont tous les cours ont ete retires, pas un jour qu'on n'a pas lu.
 */
export function lectureParJour(cours: readonly PlanningEvent[], jours: readonly string[]): Map<string, EmpreinteDeCours[]> {
    const lecture = new Map<string, EmpreinteDeCours[]>(jours.map((jour) => [jour, []]));
    for (const un of cours) {
        const empreinte = empreinteDuCours(un);
        if (empreinte !== null) lecture.get(jourDuCours(un))?.push(empreinte);
    }
    return lecture;
}

const cleDIntitule = (c: EmpreinteDeCours) => `${normal(c.sujet)}|${normal(c.type)}`;
const cleDHoraire = (c: EmpreinteDeCours) => `${c.debut}|${c.fin}|${normal(c.salle)}`;

/** Deux cours retrouves : ce qui a change entre eux, ou `null` s'ils se voient pareil. */
function difference(avant: EmpreinteDeCours, apres: EmpreinteDeCours): Changement | null {
    const heure = avant.debut !== apres.debut || avant.fin !== apres.fin;
    // Une salle qui apparait la ou la source n'en donnait pas n'a rien change pour l'etudiant.
    const salle = normal(avant.salle) !== '' && normal(avant.salle) !== normal(apres.salle);
    if (!heure && !salle) return null;
    return { genre: 'modifie', cours: apres, avant: { debut: avant.debut, fin: avant.fin, salle: avant.salle }, heure, salle };
}

/** Ce qui a change d'une lecture d'un jour a la suivante, dans l'ordre de la nouvelle. */
export function comparer(base: readonly EmpreinteDeCours[], courant: readonly EmpreinteDeCours[]): Changement[] {
    const restants = [...base];
    const paires: { avant: EmpreinteDeCours; apres: EmpreinteDeCours }[] = [];
    let seuls = [...courant];

    const apparier = (critere: (a: EmpreinteDeCours, b: EmpreinteDeCours) => boolean) => {
        seuls = seuls.filter((apres) => {
            const rang = restants.findIndex((avant) => critere(avant, apres));
            if (rang < 0) return true;
            paires.push({ avant: restants[rang], apres });
            restants.splice(rang, 1);
            return false;
        });
    };

    apparier((a, b) => cleDIntitule(a) === cleDIntitule(b) && cleDHoraire(a) === cleDHoraire(b));
    apparier((a, b) => a.id !== '' && a.id === b.id);
    apparier((a, b) => cleDHoraire(a) === cleDHoraire(b));
    // Le meme intitule, seul de chaque cote : avec deux TD du meme intitule, rien ne dit lequel a bouge.
    apparier((a, b) => cleDIntitule(a) === cleDIntitule(b)
        && restants.filter((r) => cleDIntitule(r) === cleDIntitule(a)).length === 1
        && seuls.filter((s) => cleDIntitule(s) === cleDIntitule(b)).length === 1);

    const changements: Changement[] = [];
    for (const apres of courant) {
        const paire = paires.find((p) => p.apres === apres);
        const changement = paire === undefined ? null : difference(paire.avant, paire.apres);
        if (changement !== null) changements.push(changement);
    }
    for (const avant of restants) changements.push({ genre: 'retire', cours: avant });
    return changements;
}

/** Combien de temps un changement se voit apres sa detection. */
export const DUREE_D_UN_CHANGEMENT_MS = 24 * 60 * 60 * 1000;

export interface JourLu {
    readonly base: readonly EmpreinteDeCours[];
    readonly courant: readonly EmpreinteDeCours[];
    /** Quand la difference avec la base a ete vue pour la premiere fois ; `null` sans difference. */
    readonly detecteLe: number | null;
}

export interface MemoireDesLectures {
    /** `<etablissement>|<groupes>` : ce que la memoire compare. */
    readonly identite: string;
    readonly jours: Readonly<Record<string, JourLu>>;
}

export type ChangementsParJour = ReadonlyMap<string, readonly Changement[]>;

/** Les changements qu'un jour garde a cet instant : rien passe les vingt-quatre heures. */
function changementsDuJour(jour: JourLu, maintenant: number): readonly Changement[] {
    if (jour.detecteLe === null || maintenant - jour.detecteLe > DUREE_D_UN_CHANGEMENT_MS) return [];
    return comparer(jour.base, jour.courant);
}

/** Les jours d'avant `aujourdhui` s'oublient : ils ne se reliront plus. */
function elaguer(jours: Readonly<Record<string, JourLu>>, aujourdhui: string): Record<string, JourLu> {
    const gardes: Record<string, JourLu> = {};
    for (const [jour, lu] of Object.entries(jours)) if (jour >= aujourdhui) gardes[jour] = lu;
    return gardes;
}

/**
 * Note une lecture fraiche, et rend la memoire qui la suit avec les changements des jours lus.
 * `aujourdhui` est le jour de l'appareil, `AAAA-MM-JJ`.
 */
export function noter(
    memoire: MemoireDesLectures | null,
    identite: string,
    lecture: ReadonlyMap<string, readonly EmpreinteDeCours[]>,
    maintenant: number,
    aujourdhui: string,
): { memoire: MemoireDesLectures; changements: Map<string, readonly Changement[]> } {
    const jours = elaguer(memoire !== null && memoire.identite === identite ? memoire.jours : {}, aujourdhui);
    const changements = new Map<string, readonly Changement[]>();
    for (const [jour, courant] of lecture) {
        if (jour < aujourdhui) continue;
        const precedent = jours[jour];
        if (precedent === undefined) {
            jours[jour] = { base: courant, courant, detecteLe: null };
            continue;
        }
        // Un changement deja vu vingt-quatre heures est su : la lecture qui le portait devient la base,
        // et seul ce qui a bouge depuis se dit.
        const perime = precedent.detecteLe !== null && maintenant - precedent.detecteLe > DUREE_D_UN_CHANGEMENT_MS;
        const base = perime ? precedent.courant : precedent.base;
        const difference = comparer(base, courant);
        if (difference.length === 0) {
            jours[jour] = { base: courant, courant, detecteLe: null };
            continue;
        }
        // Une difference qui n'est plus la meme est un changement nouveau : il a droit a ses vingt-quatre
        // heures, sans quoi un second changement vu tard ne se lirait qu'un instant.
        const memeDifference = !perime && precedent.detecteLe !== null
            && JSON.stringify(difference) === JSON.stringify(comparer(precedent.base, precedent.courant));
        jours[jour] = { base, courant, detecteLe: memeDifference ? precedent.detecteLe : maintenant };
        changements.set(jour, difference);
    }
    return { memoire: { identite, jours }, changements };
}

/** Les changements deja connus des jours demandes, sans lecture : le repli hors ligne. */
export function connus(
    memoire: MemoireDesLectures | null,
    identite: string,
    jours: readonly string[],
    maintenant: number,
): Map<string, readonly Changement[]> {
    const changements = new Map<string, readonly Changement[]>();
    if (memoire === null || memoire.identite !== identite) return changements;
    for (const jour of jours) {
        const lu = memoire.jours[jour];
        const liste = lu === undefined ? [] : changementsDuJour(lu, maintenant);
        if (liste.length > 0) changements.set(jour, liste);
    }
    return changements;
}

/** La memoire relue du magasin, ou `null` si elle n'a pas la forme attendue : une memoire fausse repart de zero. */
export function lireLaMemoire(texte: string | null): MemoireDesLectures | null {
    if (texte === null) return null;
    try {
        const brut = JSON.parse(texte) as { identite?: unknown; jours?: unknown };
        if (typeof brut.identite !== 'string' || typeof brut.jours !== 'object' || brut.jours === null) return null;
        return { identite: brut.identite, jours: brut.jours as Record<string, JourLu> };
    } catch {
        return null;
    }
}

/**
 * L'intitule d'un cours tel que sa carte l'affiche : l'empreinte garde l'intitule brut de la source,
 * code d'UE compris (`4TIN511U Algorithmique`), pour se comparer toujours sous la meme forme.
 */
export function intituleDe(cours: EmpreinteDeCours): string {
    const separe = separerCodeUE(cours.sujet);
    return separe !== null && separe.reste !== '' ? separe.reste : cours.sujet;
}

/** Ce qu'un cours etait, ecrit pour sa carte : les heures si elles ont change, la salle si elle a change. */
export function avantEcrit(changement: Extract<Changement, { genre: 'modifie' }>): string {
    const morceaux: string[] = [];
    if (changement.heure) morceaux.push(`${changement.avant.debut}–${changement.avant.fin}`);
    if (changement.salle && changement.avant.salle !== '') morceaux.push(sansLeDebutCommun(changement.avant.salle, changement.cours.salle));
    return morceaux.join(', ');
}

/**
 * L'ancienne salle sans les mots qu'elle partage en tete avec la nouvelle : « CREMI - Bat. A22 Salle
 * 105 » sous « CREMI - Bat. A28 Salle 204 » se lit « A22 Salle 105 ». Une salle s'ecrit longue, et
 * la difference est ce qu'on cherche. Seuls les mots sans chiffre s'omettent : un code de batiment ou
 * de salle reste, sinon « A22 Salle 105 bis » se lirait « bis ».
 */
function sansLeDebutCommun(avant: string, apres: string): string {
    const mots = avant.split(' ');
    const autres = apres.split(' ');
    let commun = 0;
    while (commun < mots.length - 1 && mots[commun] === autres[commun] && !/\d/.test(mots[commun])) commun += 1;
    return mots.slice(commun).join(' ');
}

/** La cle sous laquelle une carte retrouve son changement : l'identifiant et le debut lus maintenant. */
function cleDeCarte(cours: { readonly id?: string; readonly starttime: string }): string {
    return `${String(cours.id ?? '')}|${cours.starttime}`;
}

/**
 * Les cours d'un jour, chacun avec ce qu'il etait avant quand il a change. Un evenement du telephone
 * n'est jamais annote : il n'est pas dans les lectures.
 */
export function annoter<T extends { readonly id?: string; readonly starttime: string; readonly source?: 'telephone' }>(
    cours: readonly T[],
    changements: readonly Changement[] | undefined,
): (T & { avant?: string })[] {
    const avants = new Map<string, string>();
    for (const c of changements ?? []) {
        if (c.genre === 'modifie') avants.set(`${c.cours.id}|${c.cours.debut}`, avantEcrit(c));
    }
    if (avants.size === 0) return [...cours];
    return cours.map((un) => {
        const avant = un.source === 'telephone' ? undefined : avants.get(cleDeCarte(un));
        return avant === undefined || avant === '' ? un : { ...un, avant };
    });
}

/**
 * Les changements a montrer pour la vue des favoris : un cours que le filtre d'UE masque n'est pas a
 * l'etudiant, qu'il ait change ou qu'il ait ete retire.
 */
export function changementsVisibles(changements: readonly Changement[] | undefined, masque: (cours: { subject: string; modules?: string[] }) => boolean): Changement[] {
    return (changements ?? []).filter((c) => !masque({ subject: c.cours.sujet, ...(c.cours.modules !== undefined ? { modules: [...c.cours.modules] } : {}) }));
}

/**
 * Les cours d'une vue — un jour, ou les six de la semaine — annotes de ce qu'ils etaient, et les
 * changements visibles du premier jour, que la carte du jour et les bandeaux lisent.
 */
export function annoterLaVue<J extends { courses: PlanningEvent[] }>(
    vue: { readonly jour: PlanningEvent[] } | { readonly semaine: J[] },
    jours: readonly string[],
    changements: ChangementsParJour | undefined,
    masque: (cours: { subject: string; modules?: string[] }) => boolean,
): { jour?: PlanningEvent[]; semaine?: J[]; duJour: Changement[] } {
    const visibles = (rang: number) => changementsVisibles(changements?.get(jours[rang] ?? ''), masque);
    if ('jour' in vue) return { jour: annoter(vue.jour, visibles(0)), duJour: visibles(0) };
    return { semaine: vue.semaine.map((jour, rang) => ({ ...jour, courses: annoter(jour.courses, visibles(rang)) })), duJour: [] };
}
