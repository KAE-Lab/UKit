/**
 * La remise a zero complete, pour le menu de developpement : ce qu'une desinstallation ferait.
 *
 * « Reinitialiser l'application » des Reglages rouvre le parcours d'accueil mais garde ce qui n'est
 * pas un reglage : le cache du catalogue, celui des Blueprints, les caches de planning, et surtout
 * l'etat en memoire — le premier rafraichissement du catalogue a deja repondu, les modules sont
 * charges. Pour verifier ce qu'un **tout nouvel etudiant** voit — l'attente de la liste des
 * etablissements, le socle hors ligne —, il faut tout effacer **et relancer** le JavaScript, ce que
 * seul un rechargement fait. C'est un instrument de sonde, pas une capacite utilisateur : il vit
 * derriere le menu de developpement (docs/qualite.md).
 *
 * Trois magasins, dans cet ordre : le trousseau (session, dossier, widgets, liens, propositions), le
 * repertoire prive de l'application (les documents ranges), puis AsyncStorage en entier — reglages,
 * `firstload`, caches et surcouches publiees. Puis le rechargement — apres avoir range les simulations
 * du menu (HORS LIGNE, date), que la relance perdait : c'est en HORS LIGNE qu'on veut voir ce qu'un
 * nouvel etudiant sans reseau voit (`simulations.ts`, 6.1-C).
 *
 * **Chaque etape est jouee quoi qu'il arrive aux autres**, et chacune se journalise : une remise a
 * zero qui s'arrete a la premiere erreur sans rien dire laisse un appareil a moitie vide, et un
 * bouton qui a l'air de ne rien faire (constate le 2026-09-02). Lire `[reinitialisation]` dans Metro.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, DevSettings } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import { reloadAppAsync } from 'expo';

import { purgerTrousseau } from '../etablissements/purge';
import { garderLesSimulationsPourLaRelance } from './simulations';
import SecureStoreService from './SecureStoreService';

/** Le temps laisse au rechargement avant de conclure qu'il n'aura pas lieu. */
const DELAI_RELANCE_MS = 2000;

async function etape(nom: string, action: () => Promise<unknown> | unknown): Promise<void> {
    try {
        await action();
        console.log(`[reinitialisation] ${nom} : fait`);
    } catch (erreur) {
        console.warn(`[reinitialisation] ${nom} : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

/** Vide le repertoire prive de l'application, entree par entree. */
function viderLesDocuments(): void {
    const racine = new Directory(Paths.document);
    for (const entree of racine.list()) {
        try {
            entree.delete();
        } catch (erreur) {
            console.warn(`[reinitialisation] ${entree.uri} non supprime : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        }
    }
}

/**
 * Recharge le JavaScript. `reloadAppAsync` d'`expo` et non `expo-updates` : ce dernier refusait en
 * developpement et sous Expo Go — sa promesse etait rejetee, c'etait ecrit — et sous l'Expo Go du
 * SDK 57 il ne rejetait plus, il FERMAIT Expo Go (constate sur iPhone le 2026-09-06). L'API du socle
 * recharge l'application partout, build comme Expo Go ; le rechargement des outils de developpement,
 * celui du `r` de Metro, reste en relais si elle refuse.
 */
async function relancer(): Promise<void> {
    try {
        await reloadAppAsync('reinitialisation complete');
    } catch (erreur) {
        console.log(`[reinitialisation] le socle ne recharge pas ici (${erreur instanceof Error ? erreur.message.split('.')[0] : String(erreur)}) : rechargement de developpement`);
        DevSettings.reload('reinitialisation complete');
    }
    // Un rechargement qui a lieu emporte ce minuteur avec le contexte JavaScript ; s'il sonne, rien n'a
    // recharge — un Android 9 sous Expo Go reste la, tout efface, sans le dire (Galaxy A8, 2026-09-13).
    setTimeout(() => {
        console.warn('[reinitialisation] aucun rechargement : relance manuelle');
        Alert.alert('Réinitialisation faite', 'Cet appareil ne recharge pas l’application tout seul : ferme-la et rouvre-la.');
    }, DELAI_RELANCE_MS);
}

export async function reinitialiserCompletement(): Promise<void> {
    console.log('[reinitialisation] debut');
    await etape('trousseau', purgerTrousseau);
    // L'identifiant testeur n'est pas un magasin, il tient a l'appareil : il s'effacait ici jusqu'en
    // 6.2.x, et c'est ce qui faisait perdre son inscription a un testeur qui sondait. Depuis, on ne
    // « devient » plus quelqu'un d'autre depuis l'appareil ; revoquer, c'est supprimer la ligne dans
    // la console (shared/testeur/identifiant.ts).
    await etape('widgets', () => SecureStoreService.deleteWidgets());
    await etape('documents', viderLesDocuments);
    await etape('AsyncStorage', () => AsyncStorage.clear());
    await etape('simulations du menu', garderLesSimulationsPourLaRelance);
    await relancer();
}
