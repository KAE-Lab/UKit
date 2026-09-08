/**
 * L'entretien : ce que l'application fait pour l'utilisateur quand il ne lui demande rien.
 *
 * Deux choses, au meme moment : synchroniser l'agenda systeme si la synchronisation est active, et
 * replanifier les rappels de cours si les rappels le sont. Il se joue au lancement, au vrai retour au
 * premier plan, quand les favoris changent, et par la tache de fond du systeme.
 *
 * ## Pourquoi il existe
 *
 * Deux utilisateurs, deux plateformes, un seul signalement : « la synchronisation automatique ne se
 * fait jamais » (2026-09-03 et 2026-09-04). L'exploration a trouve trois causes, et aucune n'etait
 * la dependance depreciee :
 *
 *   - la tache n'etait **jamais reenregistree au lancement** — seul l'interrupteur l'enregistrait,
 *     et rien ne garantissait qu'elle survive a une mise a jour ou a une reinstallation ;
 *   - sa promesse d'enregistrement n'etait ni attendue ni rattrapee : un refus passait inapercu ;
 *   - et une tache de fond n'est de toute facon jamais garantie — iOS l'accorde quand il veut,
 *     Android la planifie sans promesse d'heure.
 *
 * D'ou la regle : **la tache de fond est un bonus, l'ouverture de l'application est la garantie.**
 * Si la derniere tentative date de plus de douze heures, l'entretien part a l'ouverture, en silence.
 * Quelqu'un qui ouvre UKit chaque matin a son agenda a jour meme si le systeme ne l'a jamais reveille.
 *
 * Les rappels suivent la meme logique : une notification programmee sonne meme application tuee,
 * mais elle n'etait **programmee** qu'en ouvrant le Planning, sur la semaine en cache. Quatre jours
 * sans ouvrir l'application, et plus aucun rappel. L'entretien relit la semaine courante et
 * replanifie les vingt prochains, apres les filtres d'UE, comme le Planning le fait.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne decide de rien qu'un ecran devrait montrer : la synchronisation dit son issue par la
 * tentative persistee (calendrier/tentative.ts), les rappels par leur planification. Et il ne se joue
 * jamais deux fois en meme temps : un second appel rejoint le premier.
 *
 * `expo-background-task` remplace `expo-background-fetch`, deprecie depuis le SDK 53 : WorkManager
 * sur Android, BGTaskScheduler sur iOS. **Ni l'un ni l'autre ne tourne sous Expo Go** — le JS du
 * module rend `Restricted` des qu'il s'y sait, et c'est ce qui explique qu'on n'ait jamais vu la
 * tache partir en developpement. Elle se sonde sur un build de developpement, ou en production ;
 * l'entretien a l'ouverture, lui, se joue partout, et c'est lui la garantie.
 *
 * Voir docs/features/settings.md et docs/plateforme.md.
 */

import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import moment from 'moment';

import { CourseManager, SettingsManager } from './AppCore';
import { NotificationManager } from './NotificationService';
import { deposerLeJeton, retirerLeJeton, type EtatDepot } from '../push';
import { onRetourAuPremierPlan } from './premierPlan';
import { maintenantMs } from './Temps';
import { INTERVALLE_ENTRETIEN_MS, estDu, type OrigineSynchro } from './calendrier/tentative';
import { PlanningApiService } from '../../features/Planning/services/PlanningApiService';
import type { PlanningEvent } from '../../features/Planning/services/PlanningAssembly';

/** Le nom de la tache aupres du systeme. Il change avec le module : l'ancienne (`background-fetch`) est morte avec lui. */
export const TACHE_ENTRETIEN = 'ukit-entretien';

/** La date du dernier entretien joue, quelle qu'en soit l'issue : c'est elle qui decide du suivant. */
const CLE_DERNIER_ENTRETIEN = 'entretien@1';

/** Diffuse apres chaque entretien, pour le menu de developpement. */
export const EVENEMENT_ENTRETIEN = 'entretienJoue';

/** Le delai entre deux intervalles de la tache, en **minutes** : l'unite du module, pas celle de l'ancien. */
const INTERVALLE_TACHE_MIN = INTERVALLE_ENTRETIEN_MS / 60_000;

/** Les favoris changent souvent d'un coup (l'accueil, une bascule) : on attend que la rafale passe. */
const DELAI_FAVORIS_MS = 1500;

export type OrigineEntretien = Exclude<OrigineSynchro, 'manuel'>;

export interface BilanEntretien {
    readonly origine: OrigineEntretien;
    readonly at: number;
    /** `trop-tot` : la derniere tentative est trop recente ; `inutile` : rien a synchroniser. */
    readonly synchro: 'jouee' | 'echec' | 'inutile' | 'trop-tot' | 'inactive';
    readonly rappels: 'replanifies' | 'inactifs' | 'sans-cours' | 'echec' | 'trop-tot';
    /** Le depot du jeton push (6.1.x-E), joue a chaque passage : il ne coute rien quand rien n'a change. */
    readonly push: EtatDepot;
}

export interface EtatTacheDeFond {
    /** `expo-go` : l'hote ne porte pas la tache, un build est necessaire pour la sonder. */
    readonly statut: 'disponible' | 'restreint' | 'expo-go' | 'inconnu';
    readonly enregistree: boolean;
}

let enCours: Promise<BilanEntretien> | null = null;
let dernierBilan: BilanEntretien | null = null;
let minuteurFavoris: ReturnType<typeof setTimeout> | null = null;

/** Le dernier bilan, pour le menu de developpement. `null` tant que rien n'a ete joue. */
export function dernierEntretien(): BilanEntretien | null {
    return dernierBilan;
}

function journaliser(message: string): void {
    console.info(`[entretien] ${message}`);
}

/** Les origines qui ne demandent pas la permission de l'echeance : le systeme, la sonde, un reglage. */
function force(origine: OrigineEntretien): boolean {
    return origine === 'tache' || origine === 'sonde' || origine === 'favoris' || origine === 'activation';
}

/**
 * Joue l'entretien **apres** celui qui court, s'il y en a un. Un second appel ordinaire rejoint le
 * premier ; ici on veut le contraire — rallumer la synchronisation puis choisir la cible, deux gestes
 * a une seconde d'intervalle, doivent chacun produire leur passage, sinon le second est avale et
 * l'agenda reste vide.
 */
function rejouerApres(origine: OrigineEntretien): void {
    const precedent = enCours ?? Promise.resolve();
    void precedent.then(() => jouerEntretien(origine));
}

async function dernierEntretienAt(): Promise<number | null> {
    const brut = await AsyncStorage.getItem(CLE_DERNIER_ENTRETIEN);
    const at = brut === null ? NaN : Number(brut);
    return Number.isFinite(at) ? at : null;
}

/**
 * La permission de notification, demandee au premier passage utile et jamais pendant l'accueil.
 *
 * C'est la seule permission du depot dont l'usage n'a **pas de geste** : les rappels et les messages
 * sont actifs par defaut, personne n'appuie sur rien, et la regle « au moment de l'usage » ne
 * designe aucun moment (docs/plateforme.md). Elle se demande donc ici, une fois — l'invite systeme
 * ne parait qu'une fois de toute facon — et jamais par-dessus le parcours d'accueil, qui a ses
 * propres questions. Ne leve jamais : un refus de l'invite n'est pas un echec d'entretien.
 */
async function demanderLaPermissionAuBesoin(): Promise<void> {
    if (SettingsManager.isFirstLoad()) return;
    if (!SettingsManager.getMessagesEnNotification() && !SettingsManager.getCourseNotificationsEnabled()) return;
    try {
        await NotificationManager.demanderPermissionSiJamaisDemandee();
    } catch (erreur) {
        journaliser(`permission non demandee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

async function synchroniser(origine: OrigineEntretien): Promise<BilanEntretien['synchro']> {
    if (!SettingsManager.getCalendarSyncEnabled()) return 'inactive';
    if (SettingsManager.getSyncCalendar() === -1 || SettingsManager.getFavoriteGroups().length === 0) return 'inutile';
    return (await SettingsManager.syncCalendar(origine)) ? 'jouee' : 'echec';
}

async function replanifierLesRappels(): Promise<BilanEntretien['rappels']> {
    if (!SettingsManager.getCourseNotificationsEnabled()) return 'inactifs';
    const favoris = SettingsManager.getFavoriteGroups();
    if (favoris.length === 0) return 'sans-cours';

    const courant = moment();
    const semaine = await PlanningApiService.fetchCalendarWeek(favoris, { year: courant.isoWeekYear(), week: courant.isoWeek() });
    if (semaine.ok === false) return 'echec';

    // Les memes cours que le Planning notifie : les UE posees, le filtre des favoris applique.
    const cours: PlanningEvent[] = semaine.week.flatMap((jour) => jour.courses);
    await NotificationManager.scheduleCourseNotifications(
        CourseManager.preparerPourAffichage(cours, true, SettingsManager.getFilters()),
    );
    return 'replanifies';
}

async function jouer(origine: OrigineEntretien): Promise<BilanEntretien> {
    const at = Date.now();
    // Hors echeance, et dans cet ordre : sans permission, il n'y a pas de jeton a deposer.
    await demanderLaPermissionAuBesoin();
    const push = await deposerLeJeton();

    const du = force(origine) || estDu(await dernierEntretienAt(), maintenantMs());

    if (!du) {
        return { origine, at, synchro: 'trop-tot', rappels: 'trop-tot', push };
    }

    const synchro = await synchroniser(origine);
    let rappels: BilanEntretien['rappels'];
    try {
        rappels = await replanifierLesRappels();
    } catch (erreur) {
        journaliser(`rappels non replanifies : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        rappels = 'echec';
    }

    // L'horloge reelle : c'est une trace, comme les horodatages de cache (docs/qualite.md). La
    // comparaison, elle, lit l'heure simulable, pour qu'un saut de douze heures au menu de
    // developpement fasse partir l'entretien suivant.
    await AsyncStorage.setItem(CLE_DERNIER_ENTRETIEN, String(at));
    return { origine, at, synchro, rappels, push };
}

/**
 * Joue l'entretien, ou rejoint celui qui court.
 *
 * Ne leve jamais : un entretien est un service rendu en silence, et son echec se lit dans le bilan.
 */
export function jouerEntretien(origine: OrigineEntretien): Promise<BilanEntretien> {
    if (enCours !== null) return enCours;

    enCours = jouer(origine)
        .catch((erreur: unknown): BilanEntretien => {
            journaliser(`interrompu : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
            return { origine, at: Date.now(), synchro: 'echec', rappels: 'echec', push: 'echec' };
        })
        .then((bilan) => {
            dernierBilan = bilan;
            journaliser(`${bilan.origine} : synchro ${bilan.synchro}, rappels ${bilan.rappels}, push ${bilan.push}`);
            DeviceEventEmitter.emit(EVENEMENT_ENTRETIEN, bilan);
            return bilan;
        })
        .finally(() => {
            enCours = null;
        });
    return enCours;
}

/** Ou en est la tache aupres du systeme. Pour le menu de developpement. */
export async function etatDeLaTacheDeFond(): Promise<EtatTacheDeFond> {
    if (isRunningInExpoGo()) return { statut: 'expo-go', enregistree: false };
    try {
        const statut = await BackgroundTask.getStatusAsync();
        const enregistree = await TaskManager.isTaskRegisteredAsync(TACHE_ENTRETIEN);
        return {
            statut: statut === BackgroundTask.BackgroundTaskStatus.Available ? 'disponible' : 'restreint',
            enregistree,
        };
    } catch {
        return { statut: 'inconnu', enregistree: false };
    }
}

/**
 * Enregistre la tache si la synchronisation est active, la retire sinon.
 *
 * **Attendu et rattrape**, ce que l'ancien code ne faisait pas : un refus du systeme se lit dans la
 * console au lieu de devenir un rejet non gere. Idempotent — le systeme garde une tache enregistree
 * d'un lancement a l'autre, mais rien ne coute moins qu'une verification, et c'est precisement ce
 * qui manquait.
 */
export async function armerLaTacheDeFond(): Promise<void> {
    // Sous Expo Go le module refuse et avertit a chaque appel : autant le dire une fois, clairement.
    if (isRunningInExpoGo()) {
        journaliser('tache de fond indisponible sous Expo Go — un build de developpement la porte');
        return;
    }
    const active = SettingsManager.getCalendarSyncEnabled() || SettingsManager.getCourseNotificationsEnabled();
    try {
        const enregistree = await TaskManager.isTaskRegisteredAsync(TACHE_ENTRETIEN);
        if (active && !enregistree) {
            await BackgroundTask.registerTaskAsync(TACHE_ENTRETIEN, { minimumInterval: INTERVALLE_TACHE_MIN });
            journaliser('tache de fond enregistree');
        } else if (!active && enregistree) {
            await BackgroundTask.unregisterTaskAsync(TACHE_ENTRETIEN);
            journaliser('tache de fond retiree');
        }
    } catch (erreur) {
        journaliser(`tache de fond non armee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/**
 * Oublie l'echeance : le prochain lancement jouera l'entretien comme si douze heures etaient passees.
 *
 * Pour le menu de developpement. La date simulee ne survit pas a une fermeture de l'application, donc
 * « avancer de douze heures, tuer, rouvrir » ne teste rien — au relancement, l'horloge est la vraie
 * (retour iPhone du 2026-09-07). Ceci est le seul moyen de verifier le chemin du lancement.
 */
export async function oublierLEcheance(): Promise<void> {
    await AsyncStorage.removeItem(CLE_DERNIER_ENTRETIEN);
}

/** Fait tourner la tache tout de suite. Developpement seulement : le systeme refuse en production. */
export async function declencherLaTacheDeFond(): Promise<boolean> {
    try {
        return await BackgroundTask.triggerTaskWorkerForTestingAsync();
    } catch (erreur) {
        journaliser(`declenchement refuse : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return false;
    }
}

/**
 * Le branchement, une fois, apres `loadSettings` : la tache selon le reglage, puis l'entretien du
 * lancement, puis les abonnements — le retour au premier plan, l'interrupteur, les favoris.
 */
export function armerLEntretien(): void {
    void armerLaTacheDeFond();
    void jouerEntretien('lancement');

    onRetourAuPremierPlan(() => {
        void jouerEntretien('premier-plan');
    });
    // Rallumer synchronise tout de suite (retour iPhone du 2026-09-07) : eteindre a retire les cours
    // et la date, et rallumer laissait « Jamais synchronise » jusqu'au prochain entretien. Le choix
    // de la cible aussi — rallumer sans cible ne peut rien ecrire, c'est le choix qui remplit.
    SettingsManager.on('calendarSyncEnabled', (state: boolean) => {
        void armerLaTacheDeFond();
        if (state) rejouerApres('activation');
    });
    SettingsManager.on('calendar', (cible: string | number) => {
        if (SettingsManager.getCalendarSyncEnabled() && cible !== -1) rejouerApres('activation');
    });
    // Le jeton suit le reglage et le campus sans attendre un passage : couper retire, changer de
    // fac redepose — la base cible sur le campus, elle doit connaitre le bon (6.1.x-E).
    SettingsManager.on('messagesEnNotification', (actif: boolean) => {
        void (actif ? deposerLeJeton() : retirerLeJeton());
    });
    SettingsManager.on('etablissement', () => { void deposerLeJeton(); });
    // La fin du parcours d'accueil est le premier instant ou une invite systeme est acceptable : le
    // lancement, lui, l'aurait posee par-dessus l'accueil. Un entretien complet serait de trop.
    SettingsManager.on('firstload', (premier: boolean) => {
        if (premier) return;
        void demanderLaPermissionAuBesoin().then(() => deposerLeJeton());
    });
    SettingsManager.on('courseNotificationsEnabled', () => {
        void armerLaTacheDeFond();
    });
    SettingsManager.on('favoriteGroups', () => {
        if (!SettingsManager.getCalendarSyncEnabled()) return;
        if (minuteurFavoris !== null) clearTimeout(minuteurFavoris);
        minuteurFavoris = setTimeout(() => {
            minuteurFavoris = null;
            void jouerEntretien('favoris');
        }, DELAI_FAVORIS_MS);
    });
}

// Au niveau du module, comme le module l'exige : la tache doit etre definie avant que le systeme ne
// la reveille, donc avant tout rendu. Le verdict rendu au systeme est celui de la synchronisation ;
// des rappels non replanifies ne valent pas une relance de la tache.
TaskManager.defineTask(TACHE_ENTRETIEN, async () => {
    const bilan = await jouerEntretien('tache');
    return bilan.synchro === 'echec'
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success;
});
