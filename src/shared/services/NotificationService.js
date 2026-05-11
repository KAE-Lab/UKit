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
    }),
});

class NotificationManagerService {
    async requestPermissionsAsync() {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    }

    async scheduleCourseNotifications(scheduleData) {
        // Cancel all existing scheduled notifications first
        await Notifications.cancelAllScheduledNotificationsAsync();

        if (!SettingsManager.getCourseNotificationsEnabled()) {
            return;
        }

        const delayInMinutes = SettingsManager.getCourseNotificationDelay() || 15;
        const now = moment();
        const futureCourses = [];

        // Flatten scheduleData to a simple list of courses
        // scheduleData can be a flat array (day mode) or an array of objects with .courses (week mode)
        let courses = [];
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
            if (!course.date || !course.date.start) continue;

            const courseStart = moment(course.date.start);
            const triggerTime = courseStart.clone().subtract(delayInMinutes, 'minutes');

            // En temps normal, on planifie si le trigger est dans le futur
            // Si on est en mode Dev (Mock), on accepte même si on a légèrement dépassé le trigger (pour un déclenchement immédiat)
            const isMock = TimeMockService.isMockActive();
            if (triggerTime.isAfter(now) || (isMock && courseStart.isAfter(now))) {
                
                // Si on est en mock et qu'on a dépassé le temps de trigger (ex: il est 9h16 pour un cours à 9h30, notif à 15min)
                // on déclenche la notification dans 2 secondes pour valider le test.
                let finalTriggerTime = triggerTime;
                if (isMock && !triggerTime.isAfter(now)) {
                    finalTriggerTime = now.clone().add(2, 'seconds');
                }

                futureCourses.push({
                    course,
                    triggerTime: finalTriggerTime.toDate(),
                });
            }
        }

        // Sort chronologically and limit to 20 notifications to stay within OS limits (iOS = 64)
        futureCourses.sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
        const coursesToSchedule = futureCourses.slice(0, 20);

        for (const item of coursesToSchedule) {
            const { course, triggerTime } = item;
            
            // Extract room information using the same logic as CourseCard
            let roomText = '';
            if (course.description) {
                const descLines = course.description.split('\n').map(l => l.trim()).filter(l => l);
                const potentialRooms = descLines.slice(2).filter(line => !/^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(line));
                if (potentialRooms.length > 0) {
                    roomText = potentialRooms[0];
                }
            }

            // Fallback for location Extraction
            let locations = [];
            if (roomText) {
                locations = getLocations(roomText);
                if (locations.length < 1) locations = getLocationsInText(roomText);
            }
            if (locations.length < 1) {
                locations = getLocationsInText(course.subject ?? '');
            }

            let locationString = '';
            if (locations.length > 0 && locations[0].title) {
                locationString = `${roomText} (Bât. ${locations[0].title})`;
            } else if (roomText) {
                locationString = roomText;
            } else {
                locationString = 'Lieu inconnu';
            }

            const subject = course.subject !== 'N/C' ? course.subject : 'Cours';
            
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
                    body: `${subject} - ${locationString}`,
                    data: { courseId: course.id },
                },
                trigger: { 
                    type: 'date', 
                    date: realTriggerTime.getTime() 
                },
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
