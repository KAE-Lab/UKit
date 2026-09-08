/**
 * La reception d'un message de service en notification (jalon 6.1.x-E).
 *
 * Ouvrir la notification doit mener a la feuille du message — et c'est cette ouverture, puis
 * « Compris », qui marque le message vu, pas la reception. Deux chemins menent ici : la reponse a
 * une notification pendant que l'application vit, et celle qui l'a lancee (`getLastNotificationResponseAsync`).
 * La notification porte la cle du message ; le module des messages le relit si besoin et demande
 * a l'hote d'ouvrir la feuille.
 *
 * Sur Android, un canal est obligatoire pour qu'une notification s'affiche : celui que la fonction
 * d'envoi nomme (`default`) est cree ici, une fois.
 *
 * **`expo-notifications` se charge en import dynamique, et jamais sous Expo Go.** Son emetteur de
 * jetons `warnOfExpoGoPushUsage` **leve** sur Android des qu'on y touche depuis Expo Go — un simple
 * avertissement sur iOS, une exception fatale sur Android —, et l'exception remontait au chargement
 * des modules : ecran rouge au demarrage, application inutilisable (mesure sur Android le
 * 2026-09-08). Il n'y a de toute facon **rien a armer** la ou les notifications distantes n'existent
 * pas. Les rappels de cours, eux, sont locaux : `NotificationService` garde son import statique.
 */

import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsType from 'expo-notifications';

import { demanderMessage } from '../messages';
import { notificationsNatives } from '../services/notificationsNatives';

const CANAL_ANDROID = 'default';

function cleDe(reponse: NotificationsType.NotificationResponse | null): string | null {
    const donnees = reponse?.notification.request.content.data as { cle?: unknown } | undefined;
    return typeof donnees?.cle === 'string' && donnees.cle !== '' ? donnees.cle : null;
}

/** Arme les deux chemins. Appele une fois au demarrage, apres les managers. */
export function armerLaReception(): void {
    if (isRunningInExpoGo()) return;

    void (async () => {
        try {
            const Notifications = await notificationsNatives();
            if (Notifications === null) return;
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
                    name: 'UKit',
                    importance: Notifications.AndroidImportance.DEFAULT,
                }).catch(() => undefined);
            }

            Notifications.addNotificationResponseReceivedListener((reponse) => {
                const cle = cleDe(reponse);
                if (cle !== null) void demanderMessage(cle);
            });

            const derniere = await Notifications.getLastNotificationResponseAsync().catch(() => null);
            const cle = cleDe(derniere);
            if (cle !== null) void demanderMessage(cle);
        } catch (erreur) {
            console.warn(`[push] reception non armee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        }
    })();
}
