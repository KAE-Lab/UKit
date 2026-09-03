import * as Notifications from 'expo-notifications';
import moment from 'moment';
import Toast from 'react-native-root-toast';
import { SettingsManager } from './AppCore';
import { TimeMockService } from './TimeMockService';
import style from '../theme/Theme';
import Translator from '../i18n/Translator';
import { PlanningEvent, PlanningWeekDay } from '../../features/Planning/services/PlanningApiService';
import { groupOverlappingCourses } from '../../features/Planning/components/ScheduleListUtils';
import { indexConsulte, memoireCarrouselChargee } from '../../features/Planning/components/CourseGroupCarousel';

// Define how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

function extractRoomFromDescription(description?: string): string {
    if (!description) return '';
    const annotations = description.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    
    // Recherche d'une ligne correspondant à une salle (comme dans CourseCard)
    const rooms = annotations.filter(line => {
        const lowerLine = line.toLowerCase();
        return lowerLine.includes('salle') || lowerLine.includes('bât') || lowerLine.includes('bat') || lowerLine.includes('amphi') || lowerLine.includes('cremi');
    });
    
    if (rooms.length > 0) {
        return rooms.join(' - ');
    }
    // Si aucune salle explicite n'est trouvée, on cherche la localisation typique
    const nonWeekLines = annotations.filter(line => !/^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(line));
    if (nonWeekLines.length > 2) return nonWeekLines[2]; // Index typique d'une salle sur un cours classique
    if (nonWeekLines.length > 0) return nonWeekLines[nonWeekLines.length - 1];
    
    return '';
}

function computeRealTriggerTime(triggerTime: Date): Date {
    if (!TimeMockService.isMockActive()) {
        return triggerTime;
    }
    
    let realTriggerTime = new Date(triggerTime.getTime() - TimeMockService.offset);
    
    // Sécurité pour l'OS : si le temps calculé est trop proche ou dans le passé
    if (realTriggerTime.getTime() <= Date.now() + 1000) {
        realTriggerTime = new Date(Date.now() + 2000);
    }
    
    return realTriggerTime;
}

function flattenScheduleData(scheduleData: (PlanningEvent | PlanningWeekDay)[]): PlanningEvent[] {
    let courses: PlanningEvent[] = [];
    if (!Array.isArray(scheduleData)) return courses;
    
    for (const item of scheduleData) {
        if (item && Array.isArray((item as PlanningWeekDay).courses)) {
            courses.push(...(item as PlanningWeekDay).courses);
        } else if (item && (item as PlanningEvent).category !== 'nocourse') {
            courses.push(item as PlanningEvent);
        }
    }
    return courses;
}

/**
 * Un creneau a plusieurs cours ne notifie que le cours **consulte** dans le carrousel.
 *
 * Sans ce filtre, chaque cours d'un groupe superpose partait en notification — plusieurs a la meme
 * minute (constate sur appareil le 2026-08-31). Le groupement par chevauchement est celui de
 * l'ecran (`groupOverlappingCourses`, aux heures du jour), donc il se calcule PAR JOURNEE ; l'index
 * retenu est celui que le carrousel a memorise, le premier cours sinon.
 */
function neGarderQueLeCoursConsulte(courses: PlanningEvent[]): PlanningEvent[] {
    const parJour = new Map<string, PlanningEvent[]>();
    for (const course of courses) {
        const jour = (course.date?.start ?? '').slice(0, 10);
        const duJour = parJour.get(jour);
        if (duJour) duJour.push(course);
        else parJour.set(jour, [course]);
    }

    const retenus: PlanningEvent[] = [];
    for (const duJour of parJour.values()) {
        for (const groupe of groupOverlappingCourses(duJour)) {
            retenus.push(groupe[Math.min(indexConsulte(groupe), groupe.length - 1)]);
        }
    }
    return retenus;
}

function getFutureCourses(courses: PlanningEvent[], delayInMinutes: number, now: moment.Moment): Array<{ course: PlanningEvent, triggerTime: Date }> {
    const futureCourses: Array<{ course: PlanningEvent, triggerTime: Date }> = [];
    for (const course of courses) {
        if (!course.date || !course.date.start) continue;

        const courseStart = moment(course.date.start);
        const triggerTime = courseStart.clone().subtract(delayInMinutes, 'minutes');

        if (triggerTime.isAfter(now)) {
            futureCourses.push({
                course,
                triggerTime: triggerTime.toDate(),
            });
        }
    }
    return futureCourses;
}

function showVisualFeedback(coursesToSchedule: Array<{ course: PlanningEvent, triggerTime: Date }>) {
    if (!TimeMockService.isMockActive() || coursesToSchedule.length === 0) return;
    
    const firstCourse = coursesToSchedule[0];
    let firstTrigger = firstCourse.triggerTime;
    firstTrigger = new Date(firstTrigger.getTime() - TimeMockService.offset);
    if (firstTrigger.getTime() <= Date.now() + 1000) {
        firstTrigger = new Date(Date.now() + 2000);
    }
    
    const seconds = Math.max(1, Math.round((firstTrigger.getTime() - Date.now()) / 1000));
    Toast.show(`Test Notif : Prévue dans ${seconds} secondes réelles.`, {
        duration: Toast.durations.LONG,
        position: Toast.positions.TOP,
        // Un retour de developpement, mais pas une raison de porter une seconde palette : le vert
        // vient du theme comme partout ailleurs (jalon 6-K).
        backgroundColor: style.Theme.light.success,
        textColor: style.colors.black,
        shadow: true,
        animation: true,
    });
}

class NotificationManagerService {
    async requestPermissionsAsync(): Promise<boolean> {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    }

    /**
     * La file des passages de programmation : un seul a la fois.
     *
     * Chaque passage annule TOUT puis reprogramme. Trois appelants (les deux vues du planning au
     * chargement, les reglages au changement) pouvaient donc s'entrelacer : annule, annule,
     * programme tout, programme tout — et chaque cours notifiait DEUX fois (constate sur appareil
     * le 2026-08-31). Les passages se suivent desormais ; l'etat final est celui du dernier appel.
     */
    private _passageEnCours: Promise<void> = Promise.resolve();

    scheduleCourseNotifications(scheduleData: (PlanningEvent | PlanningWeekDay)[]): Promise<void> {
        const passage = this._passageEnCours.then(() => this._reprogrammer(scheduleData));
        // La file survit a un echec : le passage suivant repart d'une promesse resolue.
        this._passageEnCours = passage.catch(() => undefined);
        return passage;
    }

    private async _reprogrammer(scheduleData: (PlanningEvent | PlanningWeekDay)[]): Promise<void> {
        // Cancel all existing scheduled notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!SettingsManager.getCourseNotificationsEnabled()) {
            return;
        }

        const delayInMinutes = SettingsManager.getCourseNotificationDelay() || 15;
        const now = moment();

        // La memoire des carrousels se charge en asynchrone au demarrage : programmer avant sa
        // resolution filtrerait sur une memoire vide et notifierait le premier cours du groupe.
        await memoireCarrouselChargee;
        const courses = neGarderQueLeCoursConsulte(flattenScheduleData(scheduleData));
        const futureCourses = getFutureCourses(courses, delayInMinutes, now);

        // Sort chronologically and limit to 20 notifications to stay within OS limits (iOS = 64)
        futureCourses.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
        const coursesToSchedule = futureCourses.slice(0, 20);

        for (const item of coursesToSchedule) {
            const { course, triggerTime } = item;
            
            // Traduits comme le reste de l'interface : un rappel en francais sous une application en
            // anglais etait la derniere chaine visible hors des dictionnaires (docs/i18n.md).
            const subject = course.subject !== 'N/C' ? course.subject.trim() : Translator.get('NOTIFICATION_COURSE_FALLBACK');
            const roomText = extractRoomFromDescription(course.description);
            const locationString = roomText || Translator.get('NOTIFICATION_LOCATION_UNKNOWN');
            const realTriggerTime = computeRealTriggerTime(triggerTime);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: Translator.get('NOTIFICATION_COURSE_IN', delayInMinutes),
                    body: `${subject}\n${locationString}`,
                    data: { courseId: course.id },
                },
                trigger: { 
                    type: Notifications.SchedulableTriggerInputTypes.DATE, 
                    date: realTriggerTime.getTime() 
                } as Notifications.DateTriggerInput,
            });
        }

        // Feedback visuel pour le testeur en mode Dev
        showVisualFeedback(coursesToSchedule);
    }
}

export const NotificationManager = new NotificationManagerService();
