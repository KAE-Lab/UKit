/**
 * Les pieces « calendrier systeme » de la synchronisation : la projection d'un cours vers un
 * evenement, la creation du calendrier UKit, et l'ecriture d'un passage complet.
 *
 * Elles vivaient dans `AppCore.tsx`, sorties chaque fois que ce fichier a franchi la limite de 400
 * lignes que le projet s'impose (jalon 6-E, puis la passe finale de la v6). Ce sont des fonctions
 * de module, sans etat, qui ne touchent que `expo-calendar` : les sortir est le decoupage que la
 * regle prescrit, et il ne change rien au comportement — `SettingsManager.syncCalendar` les appelle
 * exactement comme avant.
 *
 * Voir docs/features/settings.md et docs/architecture.md.
 */

import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

import style from '../theme/Theme';
import type { PlanningEvent } from '../../features/Planning/services/PlanningApiService';

/** Un cours, tel que le calendrier systeme l'attend. */
export function formatCalendarEventData(event: PlanningEvent): Record<string, unknown> {
    return {
        title: event.subject,
        startDate: event.date && event.date.start ? new Date(event.date.start) : new Date(),
        endDate: event.date && event.date.end ? new Date(event.date.end) : new Date(),
        timeZone: 'Europe/Paris',
        endTimeZone: 'Europe/Paris',
        notes: event.schedule + '\n' + event.description,
    };
}

/**
 * Cree le calendrier « UKit ».
 *
 * iOS n'accepte pas un calendrier local sans source : il faut lui en designer une existante, d'ou la
 * branche et son echec explicite quand aucune ne convient.
 */
export async function createUKitCalendar(calendars: Calendar.Calendar[]): Promise<string> {
    let calendar: Partial<Calendar.Calendar> | Record<string, unknown> = {
        title: `UKit`,
        name: `UKit`,
        color: style.colors.brand,
        entityType: Calendar.EntityTypes.EVENT,
        allowsModifications: true,
        source: { isLocalAccount: true, name: 'UKit', type: Calendar.SourceType.LOCAL },
        ownerAccount: 'ukit',
        timeZone: 'Europe/Paris',
        isVisible: true,
        isPrimary: false,
        isSynced: false,
        allowedAvailabilities: ['busy', 'free'],
        allowedReminders: ['default', 'alert', 'email'],
        accessLevel: 'owner',
        allowedAttendeeTypes: ['none', 'required', 'optional'],
    };

    if (Platform.OS === 'ios') {
        const local = calendars.filter(
            (fetchedCalendar) =>
                fetchedCalendar.source &&
                (fetchedCalendar.source.type === Calendar.CalendarType.LOCAL ||
                    (fetchedCalendar.source.type === Calendar.CalendarType.CALDAV &&
                        fetchedCalendar.source.name === 'iCloud')),
        );
        if (local.length < 1) throw new Error('Impossible to find a source calendar');

        calendar = {
            title: `UKit`,
            color: style.colors.brand,
            entityType: Calendar.EntityTypes.EVENT,
            allowsModifications: true,
            allowedAvailabilities: [],
            sourceId: local[0].source.id,
        };
    }
    return await Calendar.createCalendarAsync(calendar as Calendar.Calendar);
}

/**
 * Un evenement ne se pose dans le calendrier que **borne** : debut et fin valides, dans l'ordre.
 *
 * Celcat sert des cours sans heure de fin ; la projection porte alors `end: null`
 * (`moment(null).toISOString()`), et le repli de `formatCalendarEventData` posait « maintenant » a
 * la place — la fin passait AVANT le debut de tout cours futur, et le calendrier systeme refusait
 * l'ecriture (« The start date must be before the end date »). Avant que la synchronisation soit
 * sous `try/finally`, cette exception non rattrapee gelait le bouton indefiniment.
 */
function estBornable(event: PlanningEvent): boolean {
    if (!event.date || !event.date.start || !event.date.end) return false;
    const debut = new Date(event.date.start).getTime();
    const fin = new Date(event.date.end).getTime();
    return !Number.isNaN(debut) && !Number.isNaN(fin) && debut <= fin;
}

/**
 * Ecrit un passage de synchronisation complet dans le calendrier cible.
 *
 * Met a jour les evenements deja poses, cree les nouveaux, puis retire ceux dont le cours a disparu
 * — y compris un evenement devenu non bornable, qui tombe du meme coup dans la purge finale.
 * Sequentiel a dessein — la boucle qu'elle remplace l'etait — et rend la table id de cours vers id
 * d'evenement, que l'appelant persiste pour le passage suivant.
 */
export async function ecrireEvenementsDansCalendrier(
    calendarId: string,
    events: PlanningEvent[],
    existingCalendarEvents: Record<string, string>,
): Promise<Record<string, string>> {
    const updatedEvents: string[] = [];
    const nextExistingCalendarEvents: Record<string, string> = {};

    await events.filter(estBornable).reduce((p, event) => {
        return p.then(async () => {
            const eventToCreate = formatCalendarEventData(event);
            const existingInternalEventId = existingCalendarEvents[String(event.id)];

            if (existingInternalEventId) {
                try {
                    await Calendar.updateEventAsync(existingInternalEventId, eventToCreate);
                    updatedEvents.push(existingInternalEventId);
                    nextExistingCalendarEvents[String(event.id)] = existingInternalEventId;
                } catch {
                    nextExistingCalendarEvents[String(event.id)] = await Calendar.createEventAsync(calendarId, eventToCreate);
                }
            } else {
                nextExistingCalendarEvents[String(event.id)] = await Calendar.createEventAsync(calendarId, eventToCreate);
            }
        });
    }, Promise.resolve());

    const internalEventsToDelete = Object.values(existingCalendarEvents).filter((id) => updatedEvents.indexOf(id) === -1);
    if (internalEventsToDelete.length) {
        await Promise.all(internalEventsToDelete.map((id) => Calendar.deleteEventAsync(id)));
    }

    return nextExistingCalendarEvents;
}
