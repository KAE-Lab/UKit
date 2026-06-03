import * as Notifications from 'expo-notifications';
import moment from 'moment';
import Toast from 'react-native-root-toast';
import { SettingsManager, getLocations, getLocationsInText } from './AppCore';
import { TimeMockService } from './TimeMockService';
import { PlanningEvent, PlanningWeekDay } from '../../features/Planning/services/PlanningApiService';

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
        backgroundColor: '#4ade80',
        textColor: '#000',
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

    async scheduleCourseNotifications(scheduleData: (PlanningEvent | PlanningWeekDay)[]): Promise<void> {
        // Cancel all existing scheduled notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!SettingsManager.getCourseNotificationsEnabled()) {
            return;
        }

        const delayInMinutes = SettingsManager.getCourseNotificationDelay() || 15;
        const now = moment();

        const courses = flattenScheduleData(scheduleData);
        const futureCourses = getFutureCourses(courses, delayInMinutes, now);

        // Sort chronologically and limit to 20 notifications to stay within OS limits (iOS = 64)
        futureCourses.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
        const coursesToSchedule = futureCourses.slice(0, 20);

        for (const item of coursesToSchedule) {
            const { course, triggerTime } = item;
            
            const subject = course.subject !== 'N/C' ? course.subject.trim() : 'Cours';
            const roomText = extractRoomFromDescription(course.description);
            const locationString = roomText || 'Localisation inconnue';
            const realTriggerTime = computeRealTriggerTime(triggerTime);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `Cours dans ${delayInMinutes} min`,
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
