import * as Notifications from 'expo-notifications';
import moment from 'moment';
import Toast from 'react-native-root-toast';
import { SettingsManager, getLocations, getLocationsInText } from './AppCore';
import { TimeMockService } from './TimeMockService';

// Define how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

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

    async scheduleCourseNotifications(scheduleData: Array<{ courses?: Array<Record<string, unknown>>, category?: string, [key: string]: unknown } | Record<string, unknown>>): Promise<void> {
        // Cancel all existing scheduled notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!SettingsManager.getCourseNotificationsEnabled()) {
            return;
        }

        const delayInMinutes = SettingsManager.getCourseNotificationDelay() || 15;
        const now = moment();
        const futureCourses: Array<{ course: Record<string, unknown>, triggerTime: Date }> = [];

        // Flatten scheduleData to a simple list of courses
        // scheduleData can be a flat array (day mode) or an array of objects with .courses (week mode)
        let courses: Array<Record<string, unknown>> = [];
        if (Array.isArray(scheduleData)) {
            for (const item of scheduleData) {
                if (item && Array.isArray(item.courses)) {
                    courses.push(...item.courses);
                } else if (item && item.category !== 'nocourse') {
                    courses.push(item);
                }
            }
        }

        for (const course of courses) {
            if (!(course as any).date || !(course as any).date.start) continue;

            const courseStart = moment((course as any).date.start);
            const triggerTime = courseStart.clone().subtract(delayInMinutes, 'minutes');

            // Only schedule if the trigger time is in the future
            if (triggerTime.isAfter(now)) {
                futureCourses.push({
                    course,
                    triggerTime: triggerTime.toDate(),
                });
            }
        }

        // Sort chronologically and limit to 20 notifications to stay within OS limits (iOS = 64)
        futureCourses.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
        const coursesToSchedule = futureCourses.slice(0, 20);

        for (const item of coursesToSchedule) {
            const { course, triggerTime } = item;
            
            const subject = (course as any).subject !== 'N/C' ? (course as any).subject.trim() : 'Cours';
            
            let roomText = '';
            if (course.description) {
                const annotations = (course as any).description.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
                
                // Recherche d'une ligne correspondant à une salle (comme dans CourseCard)
                const rooms = annotations.filter(line => {
                    const lowerLine = line.toLowerCase();
                    return lowerLine.includes('salle') || lowerLine.includes('bât') || lowerLine.includes('bat') || lowerLine.includes('amphi') || lowerLine.includes('cremi');
                });
                
                if (rooms.length > 0) {
                    roomText = rooms.join(' - ');
                } else {
                    // Si aucune salle explicite n'est trouvée, on cherche la localisation typique
                    const nonWeekLines = annotations.filter(line => !/^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(line));
                    if (nonWeekLines.length > 2) roomText = nonWeekLines[2]; // Index typique d'une salle sur un cours classique
                    else if (nonWeekLines.length > 0) roomText = nonWeekLines[nonWeekLines.length - 1];
                }
            }

            let locationString = roomText || 'Localisation inconnue';
            
            // Translate the triggerTime to real time for the OS clock
            let realTriggerTime = triggerTime;
            if (TimeMockService.isMockActive()) {
                realTriggerTime = new Date(triggerTime.getTime() - TimeMockService.offset);
                
                // Sécurité pour l'OS : si le temps calculé est trop proche ou dans le passé
                if (realTriggerTime.getTime() <= Date.now() + 1000) {
                    realTriggerTime = new Date(Date.now() + 2000);
                }
            }

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
        if (TimeMockService.isMockActive() && coursesToSchedule.length > 0) {
            const firstCourse = coursesToSchedule[0];
            let firstTrigger = firstCourse.triggerTime;
            if (TimeMockService.isMockActive()) {
                firstTrigger = new Date(firstTrigger.getTime() - TimeMockService.offset);
                if (firstTrigger.getTime() <= Date.now() + 1000) {
                    firstTrigger = new Date(Date.now() + 2000);
                }
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
    }
}

export const NotificationManager = new NotificationManagerService();
