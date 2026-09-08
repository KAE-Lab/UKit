/**
 * L'acces au module de notifications, **charge seulement quand on s'en sert**.
 *
 * `expo-notifications` ne se contente pas d'etre inerte sous Expo Go : sur **Android**, son emetteur
 * de jetons leve a l'evaluation du module (`warnOfExpoGoPushUsage` : un `console.warn` sur iOS, un
 * `throw` sur Android depuis le SDK 53), et un `import` statique suffit a faire tomber l'application
 * au demarrage — ecran rouge, rien ne s'ouvre. Mesure sur Android le 2026-09-08.
 *
 * Le module se charge donc **une fois, a la demande**, et un echec de chargement rend `null` au lieu
 * de se propager : sans notifications, l'application marche, elle ne notifie simplement pas. C'est le
 * meme contrat que partout ailleurs dans le depot — une capacite absente se dit, elle ne casse rien.
 *
 * La ou l'echec est **certain**, on ne tente meme pas : sous Expo Go sur Android, le chargement leve
 * a coup sur, et le rattraper laissait une erreur dans la console de developpement — un bruit qui
 * ressemble a un defaut alors que c'est une limite connue de l'hote.
 *
 * Le gestionnaire d'affichage au premier plan est pose ici, au premier chargement reussi : c'est le
 * seul endroit qui sache que le module existe, et il est pose avant toute programmation.
 */

import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

type ModuleDeNotifications = typeof import('expo-notifications');

/** Le seul hote qui ne peut pas porter ce module : Expo Go sur Android (SDK 53 et au-dela). */
function hoteSansNotifications(): boolean {
    return isRunningInExpoGo() && Platform.OS === 'android';
}

let module: ModuleDeNotifications | null = null;
let charge = false;

/**
 * Le module, ou `null` quand la plateforme ne le porte pas. Ne leve jamais, et ne reessaie pas :
 * un hote qui refuse le module une fois le refusera toujours.
 */
export async function notificationsNatives(): Promise<ModuleDeNotifications | null> {
    if (charge) return module;
    charge = true;
    if (hoteSansNotifications()) {
        console.info('[notifications] indisponibles sous Expo Go sur Android : il faut un build de developpement.');
        return null;
    }
    try {
        module = await import('expo-notifications');
        // Ce que le systeme fait d'une notification qui arrive **application ouverte** : la montrer.
        // Sans ce gestionnaire, elle n'apparait pas au premier plan.
        module.setNotificationHandler({
            // `shouldShowBanner` et `shouldShowList` remplacent `shouldShowAlert`, deprecie : il
            // fonctionne encore par repli, mais avertit a **chaque** notification recue au premier
            // plan. Les deux champs disent la meme chose en plus precis — la banniere, et l'entree
            // dans le centre de notifications.
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    } catch (erreur) {
        console.warn(`[notifications] module indisponible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        module = null;
    }
    return module;
}
