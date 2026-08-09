/**
 * Les deux pieces « calendrier systeme » de la synchronisation : la projection d'un cours vers un
 * evenement, et la creation du calendrier UKit.
 *
 * Elles vivaient dans `AppCore.tsx` jusqu'au jalon 6-E, ou ce fichier a franchi la limite de 400
 * lignes que le projet s'impose. Ce sont deux fonctions de module, sans etat, qui ne touchent que
 * `expo-calendar` : les sortir est le decoupage que la regle prescrit, et il ne change rien au
 * comportement — `SettingsManager.syncCalendar` les appelle exactement comme avant.
 *
 * Voir docs/features/settings.md et docs/architecture.md.
 */

import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

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
        color: '#009ee0',
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
            color: '#009ee0',
            entityType: Calendar.EntityTypes.EVENT,
            allowsModifications: true,
            allowedAvailabilities: [],
            sourceId: local[0].source.id,
        };
    }
    return await Calendar.createCalendarAsync(calendar as Calendar.Calendar);
}
