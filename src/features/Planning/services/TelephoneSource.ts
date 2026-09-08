/**
 * La lecture des calendriers du telephone : la seule piece de plateforme du jalon 6.1.x-D.
 *
 * Elle ne fait que lire — `getCalendarsAsync`, `getEventsAsync`, la table `previousSyncData` — et
 * confie la projection a `TelephoneMapping`, pur. Jamais de cache : la donnee est locale et
 * instantanee, et la figer servirait du perime au repli hors ligne. Jamais de demande de permission
 * non plus : elle est demandee par l'ecran des reglages, et une lecture sans permission rend vide.
 *
 * Deux regles de plateforme se decident ici, une fois, et se transmettent au mapper :
 *
 *   - la **fenetre** interrogee deborde de sept jours de chaque cote de ce qui est affiche, parce
 *     qu'Android ne rend que ce qui tient en entier dans l'intervalle (iOS rend tout ce qui le
 *     chevauche) ; c'est la projection qui refiltre par jour. Un evenement de plus de sept jours
 *     peut donc manquer sur Android — limite ecrite ;
 *   - une **journee entiere** est datee en UTC sur Android, en local sur iOS.
 *
 * Voir docs/features/planning.md.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// `/legacy`, jamais la racine : ses souches levent a l'appel (shared/services/CalendarSyncHelpers.ts).
import * as Calendar from 'expo-calendar/legacy';
import moment from 'moment';

import { SettingsManager } from '../../../shared/services/AppCore';
import { TELEPHONE_VIDE, type TelephoneParJour } from './FusionTelephone';
import { calendriersLisibles, CLE_JOUR, projeterEvenementsDuTelephone, type CalendrierDuTelephone } from './TelephoneMapping';

const MARGE_JOURS = 7;

/** Les identifiants des evenements qu'UKit a ecrits lui-meme : ils ne se relisent pas. */
async function identifiantsEcritsParUkit(): Promise<Set<string>> {
    try {
        const brut = await AsyncStorage.getItem('previousSyncData');
        const table: unknown = brut === null ? {} : JSON.parse(brut);
        return new Set(Object.values(table ?? {}).map(String));
    } catch {
        return new Set();
    }
}

/**
 * Les calendriers coches, dans l'ordre ou ils l'ont ete, parmi ceux qui existent encore.
 *
 * L'intersection compte : `getEventsAsync` jette sur un identifiant inconnu, et un calendrier coche
 * puis supprime du telephone ne doit pas rendre tout le Planning muet. La liste est relue a chaque
 * fois, pas prise dans `SettingsManager` — son cache n'est rempli qu'au chargement.
 */
async function calendriersAffiches(): Promise<Calendar.Calendar[]> {
    const coches = SettingsManager.getCalendriersAffiches();
    if (coches.length === 0) return [];
    if ((await Calendar.getCalendarPermissionsAsync()).status !== 'granted') {
        if (__DEV__) console.info('[telephone] permission calendrier refusee : rien ne sera lu');
        return [];
    }
    const lisibles = calendriersLisibles(await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT), SettingsManager.getSyncCalendar());
    const retenus = coches.flatMap((id) => lisibles.filter((calendrier) => calendrier.id === id));
    if (__DEV__ && retenus.length < coches.length) {
        console.info(`[telephone] ${coches.length} calendrier(s) coche(s), ${retenus.length} encore lisible(s) — les autres ont disparu ou sont la cible de synchronisation`);
    }
    return retenus;
}

/** Les evenements du telephone pour les jours donnes, par jour. Vide sur tout echec, jamais une exception. */
export async function lireEvenementsDuTelephone(jours: readonly moment.Moment[]): Promise<TelephoneParJour> {
    if (jours.length === 0) return TELEPHONE_VIDE;
    try {
        const calendriers = await calendriersAffiches();
        if (calendriers.length === 0) return TELEPHONE_VIDE;

        const debut = moment.min([...jours]).clone().startOf('day').subtract(MARGE_JOURS, 'days');
        const fin = moment.max([...jours]).clone().endOf('day').add(MARGE_JOURS, 'days');
        const evenements = await Calendar.getEventsAsync(calendriers.map((calendrier) => calendrier.id), debut.toDate(), fin.toDate());

        const parId = new Map<string, CalendrierDuTelephone>(calendriers.map((calendrier) => [calendrier.id, calendrier]));
        const exclus = await identifiantsEcritsParUkit();
        const options = { journeeEntiereEnUTC: Platform.OS === 'android' };

        const resultat = new Map<string, readonly import('./PlanningAssembly').PlanningEvent[]>();
        for (const jour of jours) {
            const cle = jour.format(CLE_JOUR);
            const projetes = projeterEvenementsDuTelephone(evenements, parId, exclus, cle, options);
            if (projetes.length > 0) resultat.set(cle, projetes);
        }
        // Le seul endroit ou l'on puisse voir, sur un appareil, ce que la lecture a vraiment trouve :
        // quels calendriers, quelle fenetre, combien d'evenements rendus, combien retenus. Sans cette
        // ligne, un Planning vide ne dit pas **ou** la chaine s'est arretee (mesure du 2026-09-08).
        if (__DEV__) {
            /*
             * Ce que la lecture a vraiment vu, et **dans quel etat est chaque calendrier**. Android
             * ne genere les instances d'un calendrier que s'il est visible et synchronise : un
             * calendrier coche mais masque dans l'agenda du systeme rend zero evenement sans que
             * rien ne le dise. C'est la seule facon de distinguer « la source est vide » de « la
             * source est fermee » depuis un poste (mesure du 2026-09-08).
             */
            const etats = calendriers
                .map((c) => `${c.title}#${c.id}${c.isVisible === false ? ' MASQUE' : ''}${c.isSynced === false ? ' NON-SYNC' : ''}${c.allowsModifications ? '' : ' LECTURE-SEULE'}`)
                .join(' | ');
            const fenetre = `${debut.format('DD/MM HH:mm')}→${fin.format('DD/MM HH:mm')}`;
            const retenus = [...resultat.values()].reduce((n, j) => n + j.length, 0);
            console.info(`[telephone] ${fenetre} · ${etats} · ${evenements.length} evenement(s) lus, ${retenus} retenu(s) sur ${jours.length} jour(s)`);
            /*
             * Rien lu : la question devient « ou sont les evenements, alors ? ». On relit chaque
             * calendrier de l'appareil, un par un, pour dire lequel en porte. C'est ce qui distingue
             * un calendrier coche qui est vraiment vide d'un editeur systeme qui a ecrit ailleurs
             * que la ou on le lui demandait.
             */
            if (evenements.length === 0) {
                const tous = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
                const comptes: string[] = [];
                for (const calendrier of tous) {
                    const lus = await Calendar.getEventsAsync([calendrier.id], debut.toDate(), fin.toDate()).catch(() => []);
                    comptes.push(`${calendrier.title}#${calendrier.id}=${lus.length}`);
                }
                console.info(`[telephone] ou sont les evenements : ${comptes.join(' | ')}`);
            }
        }
        return resultat;
    } catch (erreur) {
        console.warn(`[telephone] lecture impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return TELEPHONE_VIDE;
    }
}

/** Les evenements d'une journee, **tous calendriers de l'appareil confondus**. Pour savoir ce qui est neuf. */
async function evenementsDuJour(jour: moment.Moment): Promise<Calendar.Event[]> {
    const tous = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (tous.length === 0) return [];
    return Calendar.getEventsAsync(
        tous.map((calendrier) => calendrier.id),
        jour.clone().startOf('day').toDate(),
        jour.clone().endOf('day').toDate(),
    );
}

/**
 * Ouvre l'editeur du systeme sur un jour, et **adopte le calendrier ou l'evenement a fini**.
 *
 * L'editeur recoit le calendrier a utiliser, mais rien ne l'oblige a l'entendre : sur Android, celui
 * de Samsung ecrit dans le compte Google de l'utilisateur quoi qu'on lui demande (mesure sur appareil
 * le 2026-09-08 — six evenements crees depuis UKit, tous dans un calendrier que le Planning
 * n'affichait pas). L'utilisateur, lui, a fait un geste depuis le Planning et attend d'y voir son
 * evenement : on regarde donc ce qui est apparu, et on coche le calendrier qui le porte.
 *
 * La comparaison porte sur les identifiants du **jour vise**, avant et apres : c'est la seule mesure
 * qui marche sur les deux plateformes, `createEventInCalendarAsync` ne rendant pas toujours
 * l'identifiant de ce qu'il a cree.
 *
 * Rend `true` quand un calendrier a ete adopte : l'appelant n'a alors **rien a relire**, l'evenement
 * du reglage s'en charge, et une seconde relecture ne ferait que rendre la liste deux fois.
 */
export async function ouvrirEditeurDeCreation(jour: moment.Moment): Promise<boolean> {
    const debut = jour.clone().startOf('day').hour(9);
    const calendarId = await calendrierOuEcrire();
    const avant = new Set((await evenementsDuJour(jour).catch(() => [])).map((evenement) => String(evenement.id)));

    await Calendar.createEventInCalendarAsync(
        {
            startDate: debut.toDate(),
            endDate: debut.clone().add(1, 'hour').toDate(),
            ...(calendarId === null ? {} : { calendarId }),
        },
        // Sans cette option, Android resout des l'ouverture de l'editeur, avant toute saisie.
        { startNewActivityTask: false },
    );

    const apres = await evenementsDuJour(jour).catch(() => []);
    const nouveau = apres.find((evenement) => !avant.has(String(evenement.id)));
    if (nouveau === undefined) return false;

    const calendrier = String(nouveau.calendarId);
    const affiches = SettingsManager.getCalendriersAffiches();
    if (affiches.includes(calendrier)) return false;
    SettingsManager.setCalendriersAffiches([...affiches, calendrier]);
    return true;
}

/**
 * Le calendrier ou l'editeur du systeme propose d'ecrire : le premier coche qui accepte l'ecriture.
 *
 * Pre-positionner l'editeur sur un calendrier affiche, c'est ce qui rend vrai « l'evenement est
 * dans le Planning au retour » ; l'utilisateur peut en choisir un autre dans l'editeur. `null` quand
 * rien n'est coche, ou que tout ce qui l'est est en lecture seule — le « + » ne se montre alors pas.
 */
export async function calendrierOuEcrire(): Promise<string | null> {
    try {
        return (await calendriersAffiches()).find((calendrier) => calendrier.allowsModifications)?.id ?? null;
    } catch {
        return null;
    }
}
