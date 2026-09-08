/**
 * La projection des evenements du telephone sur le contrat du Planning (jalon 6.1.x-D).
 *
 * Pure, sur le modele d'`IcsMapping` : aucun import de plateforme, pas d'`expo-calendar` — les types
 * sont structurels, et `getEventsAsync` reste dans `TelephoneSource`. C'est ce qui rend jouables sous
 * vitest les cas que le type d'expo-calendar annonce : un `startDate` en chaine ou en `Date`, une
 * journee entiere, un `location` nul, un evenement annule, et la journee **locale** d'un instant.
 *
 * Deux regles de plateforme vivent ici, parce qu'elles decident de ce qui s'affiche :
 *
 *   - **le refiltrage par jour** : iOS rend tout ce qui chevauche l'intervalle demande, Android
 *     seulement ce qui y tient en entier. La source interroge donc une fenetre elargie, et c'est la
 *     projection qui decide qu'un evenement appartient a un jour — a cheval sur minuit, il appartient
 *     aux deux, borne a chacun ;
 *   - **la journee entiere** : iOS la serialise de minuit local a la fin du jour local ; Android de
 *     minuit UTC a minuit UTC du lendemain, fin exclusive. Lue comme un instant local, la seconde
 *     forme debordait sur deux jours (00:00Z est 02:00 a Paris). Le drapeau `journeeEntiereEnUTC`
 *     est lu une fois depuis `Platform.OS` dans la couture, jamais ici.
 *
 * Voir docs/features/planning.md.
 */

import moment from 'moment';

import { normaliserHex } from './couleurDeCours';
import type { PlanningEvent } from './PlanningAssembly';

/** Ce que la projection lit d'un `Calendar.Event`, sans en dependre. */
export interface EvenementDuTelephone {
    readonly id: string;
    readonly calendarId: string;
    readonly title?: string | null;
    readonly location?: string | null;
    readonly notes?: string | null;
    readonly startDate: string | Date;
    readonly endDate: string | Date;
    readonly allDay?: boolean;
    readonly status?: string;
    readonly availability?: string;
}

/** Ce que la projection lit d'un `Calendar.Calendar`. */
export interface CalendrierDuTelephone {
    readonly id: string;
    readonly title: string;
    readonly color?: string | null;
}

export interface OptionsDeProjection {
    /** Vrai sur Android : une journee entiere y est datee en UTC, fin exclusive. */
    readonly journeeEntiereEnUTC: boolean;
}

export const SOURCE_TELEPHONE = 'telephone';
export const CLE_JOUR = 'YYYY-MM-DD';

/** Le titre du calendrier dedie que la synchronisation cree : il ne se relit jamais. */
const TITRE_CALENDRIER_UKIT = 'UKit';

/**
 * Les calendriers qu'on propose de lire : tous, sauf la cible de la synchronisation.
 *
 * La relire afficherait chaque cours deux fois. La cible a deux identites — `'UKit'` symbolique
 * avant la premiere synchronisation, l'identifiant resolu apres — d'ou l'exclusion par le titre du
 * calendrier dedie **et** par l'identifiant.
 */
export function calendriersLisibles<T extends { id: string; title: string }>(calendriers: readonly T[], cible: string | number): T[] {
    const idCible = String(cible);
    return calendriers.filter((calendrier) => calendrier.title !== TITRE_CALENDRIER_UKIT && String(calendrier.id) !== idCible);
}

/**
 * Les jours locaux qu'un evenement couvre, du premier au dernier, en `YYYY-MM-DD`.
 *
 * Une fin posee **exactement** a minuit ne mord pas sur le jour suivant : c'est la forme exclusive
 * qu'Android donne aux journees entieres, et celle d'un rendez-vous « jusqu'a minuit ».
 */
export function joursCouverts(evenement: EvenementDuTelephone, options: OptionsDeProjection): { premier: string; dernier: string } {
    const enUTC = evenement.allDay === true && options.journeeEntiereEnUTC;
    const lire = (valeur: string | Date) => (enUTC ? moment.utc(valeur) : moment(valeur));
    const debut = lire(evenement.startDate);
    const fin = lire(evenement.endDate);
    if (fin.isAfter(debut) && fin.isSame(fin.clone().startOf('day'))) fin.subtract(1, 'millisecond');
    return { premier: debut.format(CLE_JOUR), dernier: fin.format(CLE_JOUR) };
}

/**
 * Ce jour est-il **entierement** couvert par l'evenement ?
 *
 * `allDay` ne suffit pas : un evenement de plusieurs jours qui porte des heures — un depart vendredi
 * soir, un retour dimanche matin — occupe le samedi en entier, et le rendre « de 00:00 a 23:59 »
 * dans le fil de la journee est faux deux fois : ce n'est pas un creneau, et il ecrase la journee.
 * Constate sur iPhone le 2026-09-08 avec un evenement de vacances de trois jours. Le premier et le
 * dernier jour, eux, gardent leurs heures reelles : ils commencent ou finissent quelque part.
 *
 * La borne du soir est 23:59 et non la derniere milliseconde : c'est l'heure qu'un humain pose quand
 * il veut dire « toute la journee ».
 */
function couvreToutLeJour(debut: moment.Moment, fin: moment.Moment, jour: string): boolean {
    const debutDuJour = moment(jour, CLE_JOUR).startOf('day');
    const finDuJour = debutDuJour.clone().add(1, 'day').subtract(1, 'minute');
    return !debut.isAfter(debutDuJour) && !fin.isBefore(finDuJour);
}

function estAffichable(evenement: EvenementDuTelephone, exclus: ReadonlySet<string>): boolean {
    // Un evenement annule n'est plus un rendez-vous. Un evenement « disponible » (anniversaire, jour
    // ferie) en est un : l'utilisateur a coche ce calendrier pour le voir — decision du 2026-09-07.
    if (evenement.status === 'canceled') return false;
    // Ce qu'UKit a ecrit lui-meme se reconnait a son identifiant, quel que soit son calendrier : la
    // table `previousSyncData` peut porter un orphelin dans un calendrier qui n'est plus la cible.
    return !exclus.has(String(evenement.id));
}

/** Un evenement projete sur **un** jour : ses heures sont bornees a ce jour. */
export function projeterEvenementDuTelephone(
    evenement: EvenementDuTelephone,
    calendrier: CalendrierDuTelephone,
    jour: string,
    options: OptionsDeProjection,
): PlanningEvent {
    const { premier, dernier } = joursCouverts(evenement, options);
    const debut = moment(evenement.startDate);
    const fin = moment(evenement.endDate);
    const journeeEntiere = evenement.allDay === true || couvreToutLeJour(debut, fin, jour);
    const starttime = journeeEntiere ? '' : (jour === premier ? debut.format('HH:mm') : '00:00');
    const endtime = journeeEntiere ? '' : (jour === dernier ? fin.format('HH:mm') : '23:59');
    const couleur = normaliserHex(calendrier.color) ?? 'default';
    const titre = (evenement.title ?? '').trim();
    const lignes = [evenement.location ?? '', evenement.notes ?? '']
        .flatMap((texte) => texte.split('\n'))
        .map((ligne) => ligne.trim())
        .filter((ligne) => ligne !== '');

    return {
        // Les occurrences d'un evenement recurrent partagent l'identifiant sur iOS : l'instant et le
        // jour le rendent unique — et un rendez-vous a cheval sur minuit en a un par jour.
        id: `${evenement.id}@${debut.toISOString()}@${jour}`,
        idTelephone: String(evenement.id),
        source: SOURCE_TELEPHONE,
        journeeEntiere,
        // Compose comme chez Celcat pour que l'invariant du contrat tienne — le champ est herite et
        // aucun ecran ne le lit (docs/features/planning.md).
        style: 'style="background-color:' + couleur + '"',
        color: couleur,
        schedule: journeeEntiere ? '' : starttime + '-' + endtime,
        starttime,
        endtime,
        date: { start: debut.toISOString(), end: fin.toISOString() },
        subject: titre === '' ? calendrier.title : titre,
        description: lignes.join('\n'),
        category: '',
        group: '',
        toFilter: null,
    };
}

/**
 * Les evenements d'un jour, projetes.
 *
 * Un evenement d'un calendrier inconnu est ignore : la liste des calendriers et celle des evenements
 * sont lues l'une apres l'autre, et un calendrier peut disparaitre entre les deux. Le tri revient a
 * `assemblerJour`, comme pour les autres sources.
 */
export function projeterEvenementsDuTelephone(
    evenements: readonly EvenementDuTelephone[],
    calendriers: ReadonlyMap<string, CalendrierDuTelephone>,
    exclus: ReadonlySet<string>,
    jour: string,
    options: OptionsDeProjection,
): PlanningEvent[] {
    const projetes: PlanningEvent[] = [];
    for (const evenement of evenements) {
        const calendrier = calendriers.get(String(evenement.calendarId));
        if (calendrier === undefined || !estAffichable(evenement, exclus)) continue;
        const { premier, dernier } = joursCouverts(evenement, options);
        if (jour < premier || jour > dernier) continue;
        projetes.push(projeterEvenementDuTelephone(evenement, calendrier, jour, options));
    }
    return projetes;
}
