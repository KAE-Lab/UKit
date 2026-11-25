/**
 * Les evenements du campus dans le Planning (phase 8, lot 5 ; docs/phase-8/5-evenements.md) : ce que
 * l'appareil garde, et ce qu'il en montre. Pur : l'instant arrive en parametre, le stockage et la base
 * vivent dans `index.ts`.
 *
 * Tout reste sur l'appareil : les evenements ajoutes un par un, ceux que l'etudiant masque, son
 * abonnement, la proposition deja faite, et la derniere lecture des evenements publies. Rien de tout ca
 * ne part vers la base.
 *
 * Un evenement s'affiche **comme un calendrier du telephone** : la meme projection (`TelephoneMapping`),
 * la journee locale, minuit, et le meme marqueur `source: 'telephone'`, qui le tient hors des filtres
 * d'UE, des rappels et de l'appui long des cours. `annonce` dit d'ou il vient, pour la fiche.
 */

import moment from 'moment';

import type { EvenementDAnnonce } from '../annonces/evenement';
import { CLE_JOUR, projeterEvenementsDuTelephone, type CalendrierDuTelephone, type EvenementDuTelephone } from '../../features/Planning/services/TelephoneMapping';
import type { PlanningEvent } from '../../features/Planning/services/PlanningAssembly';

/** Un evenement suivi, tel que l'appareil le garde : de quoi l'afficher hors ligne, et rien d'autre. */
export interface EvenementSuivi {
    /** L'identifiant de l'annonce. */
    readonly id: string;
    readonly titre: string;
    readonly emetteur: string;
    readonly debut: number;
    readonly fin: number;
    readonly lieu: string;
    /** Le point de l'annonce, quand elle en publie un : la fiche le montre sur sa carte. */
    readonly point?: { readonly lat: number; readonly lng: number };
}

export interface EtatDesEvenements {
    /** Ajoutes un par un par « Ajouter a mon planning » : eux seuls partent vers l'agenda du telephone. */
    readonly ajoutes: readonly EvenementSuivi[];
    /** Masques un par un : un evenement de l'abonnement que l'etudiant ne veut pas voir. */
    readonly masques: readonly string[];
    /** L'abonnement aux evenements du campus, desactive par defaut. */
    readonly abonnement: boolean;
    /** La proposition d'abonnement, faite une fois apres le premier ajout. */
    readonly propose: boolean;
    /** La derniere lecture reussie des evenements publies pour cet appareil : ce que l'abonnement montre. */
    readonly publies: readonly EvenementSuivi[];
    readonly luLe: number | null;
}

export const ETAT_VIDE: EtatDesEvenements = { ajoutes: [], masques: [], abonnement: false, propose: false, publies: [], luLe: null };

/** Une relecture des evenements publies, au plus toutes les demi-heures. */
export const FRAICHEUR_MS = 30 * 60 * 1000;
/** Un evenement ajoute dont l'annonce a disparu se garde un an apres sa fin, puis s'oublie. */
const MEMOIRE_MS = 365 * 24 * 60 * 60 * 1000;

/** Le calendrier que les evenements du campus forment ; sa couleur, celle de UKit, arrive du theme. */
const ID_DU_CALENDRIER = 'ukit-campus';

function texte(valeur: unknown): string | null {
    return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : null;
}

function nombre(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null;
}

function lireSuivi(brut: unknown): EvenementSuivi | null {
    if (typeof brut !== 'object' || brut === null) return null;
    const e = brut as Record<string, unknown>;
    const id = texte(e.id);
    const titre = texte(e.titre);
    const lieu = texte(e.lieu);
    const debut = nombre(e.debut);
    const fin = nombre(e.fin);
    if (id === null || titre === null || lieu === null || debut === null || fin === null || fin <= debut) return null;
    const p = e.point as { lat?: unknown; lng?: unknown } | undefined;
    const lat = nombre(p?.lat);
    const lng = nombre(p?.lng);
    return { id, titre, emetteur: texte(e.emetteur) ?? '', debut, fin, lieu, ...(lat !== null && lng !== null ? { point: { lat, lng } } : {}) };
}

function lireSuivis(brut: unknown): EvenementSuivi[] {
    if (!Array.isArray(brut)) return [];
    const vus = new Set<string>();
    const suivis: EvenementSuivi[] = [];
    for (const entree of brut as unknown[]) {
        const suivi = lireSuivi(entree);
        if (suivi === null || vus.has(suivi.id)) continue;
        vus.add(suivi.id);
        suivis.push(suivi);
    }
    return suivis;
}

/** Ce que le stockage rend, lu defensivement : une entree illisible s'ignore, un document illisible repart a vide. */
export function lireEtat(brut: unknown): EtatDesEvenements {
    if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return ETAT_VIDE;
    const e = brut as Record<string, unknown>;
    return {
        ajoutes: lireSuivis(e.ajoutes),
        masques: Array.isArray(e.masques) ? [...new Set((e.masques as unknown[]).filter((id): id is string => typeof id === 'string' && id !== ''))] : [],
        abonnement: e.abonnement === true,
        propose: e.propose === true,
        publies: lireSuivis(e.publies),
        luLe: nombre(e.luLe),
    };
}

/** Ce que l'appareil garde d'une annonce d'evenement, ou `null` sans evenement. */
export function suiviDe(annonce: {
    readonly id: string;
    readonly title: string;
    readonly issuer_name: string;
    readonly evenement?: EvenementDAnnonce;
    readonly location?: { lat: number; lng: number };
}): EvenementSuivi | null {
    const e = annonce.evenement;
    if (e === undefined || annonce.id === '') return null;
    return {
        id: annonce.id,
        titre: annonce.title.trim() === '' ? e.lieu : annonce.title.trim(),
        emetteur: annonce.issuer_name.trim(),
        debut: e.debut,
        fin: e.fin,
        lieu: e.lieu,
        ...(annonce.location !== undefined ? { point: { lat: annonce.location.lat, lng: annonce.location.lng } } : {}),
    };
}

const sans = (suivis: readonly EvenementSuivi[], id: string) => suivis.filter((suivi) => suivi.id !== id);

/** « Ajouter a mon planning » : l'evenement entre, et cesse d'etre masque s'il l'etait. */
export function ajouter(etat: EtatDesEvenements, suivi: EvenementSuivi): EtatDesEvenements {
    return { ...etat, ajoutes: [...sans(etat.ajoutes, suivi.id), suivi], masques: etat.masques.filter((id) => id !== suivi.id) };
}

/**
 * Masquer un evenement : il quitte les ajoutes — donc l'agenda au passage suivant — et l'abonnement ne
 * le montre plus. Un geste, quelle que soit la facon dont l'evenement est arrive.
 */
export function masquer(etat: EtatDesEvenements, id: string): EtatDesEvenements {
    return { ...etat, ajoutes: sans(etat.ajoutes, id), masques: etat.masques.includes(id) ? etat.masques : [...etat.masques, id] };
}

/** L'abonnement, choisi dans la proposition ou dans les Reglages : la proposition est faite, dans les deux cas. */
export function choisirAbonnement(etat: EtatDesEvenements, actif: boolean): EtatDesEvenements {
    return { ...etat, abonnement: actif, propose: true };
}

/** Proposer l'abonnement apres un ajout : une fois, et jamais a qui l'a deja. */
export function doitProposer(etat: EtatDesEvenements): boolean {
    return !etat.propose && !etat.abonnement;
}

/** Ce que le Planning montre : les ajoutes, puis l'abonnement s'il est pris, moins les masques. */
export function visibles(etat: EtatDesEvenements): EvenementSuivi[] {
    const masques = new Set(etat.masques);
    const vus = new Set<string>();
    const resultat: EvenementSuivi[] = [];
    for (const suivi of [...etat.ajoutes, ...(etat.abonnement ? etat.publies : [])]) {
        if (masques.has(suivi.id) || vus.has(suivi.id)) continue;
        vus.add(suivi.id);
        resultat.push(suivi);
    }
    return resultat;
}

export function estVisible(etat: EtatDesEvenements, id: string): boolean {
    return visibles(etat).some((suivi) => suivi.id === id);
}

/**
 * Ce qui demande une lecture de la base : un abonnement, ou un evenement ajoute qui n'est pas fini — son
 * annonce peut changer ou etre annulee. Sans rien a suivre, le Planning ne lit rien.
 */
export function aSuivre(etat: EtatDesEvenements, maintenant: number): boolean {
    return etat.abonnement || etat.ajoutes.some((suivi) => suivi.fin > maintenant);
}

/** Une lecture est due : quelque chose a suivre, et la derniere date d'une demi-heure, ou d'un instant a venir (horloge deplacee). */
export function aRelire(etat: EtatDesEvenements, maintenant: number): boolean {
    if (!aSuivre(etat, maintenant)) return false;
    return etat.luLe === null || etat.luLe > maintenant || maintenant - etat.luLe >= FRAICHEUR_MS;
}

/**
 * Une lecture reussie des evenements que cet appareil voit, et ce qu'elle change.
 *
 * Un evenement ajoute **suit son annonce** : son heure, son lieu, son titre reprennent ceux de la base.
 * Absent de la lecture, il a ete annule, archive, desactive, retire de ce campus ou depouille de sa date :
 * a venir, il quitte le Planning et l'agenda ; fini, il reste — son annonce a simplement expire apres
 * lui —, et s'oublie un an apres sa fin. Un masque sans evenement publie derriere lui s'oublie aussi.
 */
export function reconcilier(etat: EtatDesEvenements, publies: readonly EvenementSuivi[], maintenant: number): EtatDesEvenements {
    const parId = new Map(publies.map((suivi) => [suivi.id, suivi]));
    const ajoutes: EvenementSuivi[] = [];
    for (const suivi of etat.ajoutes) {
        const frais = parId.get(suivi.id);
        if (frais !== undefined) ajoutes.push(frais);
        else if (suivi.fin <= maintenant && maintenant - suivi.fin < MEMOIRE_MS) ajoutes.push(suivi);
    }
    return { ...etat, ajoutes, masques: etat.masques.filter((id) => parId.has(id)), publies: [...publies], luLe: maintenant };
}

/**
 * Un evenement ajoute fini depuis plus d'un an s'oublie, meme sans lecture : sans abonnement ni ajout a
 * venir, aucune lecture n'a lieu, et `reconcilier` ne passerait jamais.
 */
export function oublierLesAnciens(etat: EtatDesEvenements, maintenant: number): EtatDesEvenements {
    const ajoutes = etat.ajoutes.filter((suivi) => maintenant - suivi.fin < MEMOIRE_MS);
    return ajoutes.length === etat.ajoutes.length ? etat : { ...etat, ajoutes };
}

/** Un evenement suivi, sous la forme que la projection du telephone lit. */
function commeEvenementDuTelephone(suivi: EvenementSuivi): EvenementDuTelephone {
    return {
        id: `annonce:${suivi.id}`,
        calendarId: ID_DU_CALENDRIER,
        title: suivi.titre,
        location: suivi.lieu,
        // L'organisateur en ligne d'information, comme les notes d'un rendez-vous.
        notes: suivi.emetteur,
        startDate: new Date(suivi.debut),
        endDate: new Date(suivi.fin),
    };
}

/**
 * Les evenements des jours donnes, par jour `YYYY-MM-DD`, projetes comme un calendrier du telephone, a la
 * couleur donnee — celle de UKit, la couleur de son calendrier dans l'agenda. Ce qui vient du campus porte
 * `annonce` et son point, jamais `idTelephone` : il ne s'ouvre pas dans l'agenda du systeme, il se retire.
 */
export function evenementsParJour(suivis: readonly EvenementSuivi[], jours: readonly moment.Moment[], couleur: string): Map<string, PlanningEvent[]> {
    const resultat = new Map<string, PlanningEvent[]>();
    if (suivis.length === 0) return resultat;
    const parId = new Map(suivis.map((suivi) => [`annonce:${suivi.id}`, suivi]));
    const calendrier: CalendrierDuTelephone = { id: ID_DU_CALENDRIER, title: 'UKit', color: couleur };
    const calendriers = new Map([[ID_DU_CALENDRIER, calendrier]]);
    const evenements = suivis.map(commeEvenementDuTelephone);
    for (const jour of jours) {
        const cle = jour.format(CLE_JOUR);
        const projetes = projeterEvenementsDuTelephone(evenements, calendriers, new Set(), cle, { journeeEntiereEnUTC: false })
            .map(({ idTelephone, ...evenement }) => {
                const suivi = idTelephone === undefined ? undefined : parId.get(idTelephone);
                return suivi === undefined ? evenement : { ...evenement, annonce: suivi.id, ...(suivi.point !== undefined ? { point: suivi.point } : {}) };
            });
        if (projetes.length > 0) resultat.set(cle, projetes);
    }
    return resultat;
}

/**
 * Ce que la synchronisation ecrit dans l'agenda du telephone : les evenements ajoutes un par un, pas
 * ceux de l'abonnement. L'identifiant `annonce:<id>` les range dans `previousSyncData` a cote des cours,
 * pour que la purge d'un passage retire ce qui a ete masque ou annule.
 */
export function evenementsDeLAgenda(etat: EtatDesEvenements): PlanningEvent[] {
    const masques = new Set(etat.masques);
    return etat.ajoutes.filter((suivi) => !masques.has(suivi.id)).map((suivi): PlanningEvent => {
        const debut = moment(suivi.debut);
        const fin = moment(suivi.fin);
        return {
            id: `annonce:${suivi.id}`,
            source: 'telephone',
            annonce: suivi.id,
            style: '',
            // L'agenda ne lit pas la couleur d'un evenement : celle de son calendrier.
            color: 'default',
            schedule: `${debut.format('HH:mm')}-${fin.format('HH:mm')}`,
            starttime: debut.format('HH:mm'),
            endtime: fin.format('HH:mm'),
            date: { start: debut.toISOString(), end: fin.toISOString() },
            subject: suivi.titre,
            description: suivi.emetteur,
            category: '',
            group: '',
            lieu: suivi.lieu,
        };
    });
}

/** Ce que l'agenda doit porter, en une chaine : la synchronisation ne repasse que si elle change. */
export function signatureDeLAgenda(etat: EtatDesEvenements): string {
    return JSON.stringify(evenementsDeLAgenda(etat).map((e) => [e.id, e.date.start, e.date.end, e.subject, e.lieu, e.description]));
}
