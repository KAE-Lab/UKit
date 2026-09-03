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
 * Trois magasins, dans cet ordre : le trousseau (session, dossier, widgets, liens, propositions,
 * identifiant d'installation), le
 * repertoire prive de l'application (les documents ranges), puis AsyncStorage en entier — reglages,
 * `firstload`, caches et surcouches publiees. Puis le rechargement.
 *
 * **Chaque etape est jouee quoi qu'il arrive aux autres**, et chacune se journalise : une remise a
 * zero qui s'arrete a la premiere erreur sans rien dire laisse un appareil a moitie vide, et un
 * bouton qui a l'air de ne rien faire (constate le 2026-09-02). Lire `[reinitialisation]` dans Metro.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

import { purgerTrousseau } from '../etablissements/purge';
import { effacerIdentifiantInstallation } from '../testeur/identifiant';
import SecureStoreService from './SecureStoreService';

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
 * Recharge le JavaScript. `expo-updates` refuse en developpement et sous Expo Go — sa promesse est
 * rejetee, c'est ecrit — et c'est alors le rechargement des outils de developpement qui prend le
 * relais, celui du `r` de Metro.
 */
async function relancer(): Promise<void> {
    try {
        await Updates.reloadAsync();
    } catch (erreur) {
        console.log(`[reinitialisation] expo-updates ne recharge pas ici (${erreur instanceof Error ? erreur.message.split('.')[0] : String(erreur)}) : rechargement de developpement`);
        DevSettings.reload('reinitialisation complete');
    }
}

export async function reinitialiserCompletement(): Promise<void> {
    console.log('[reinitialisation] debut');
    await etape('trousseau', purgerTrousseau);
    // L'identifiant d'installation ne s'efface qu'ici : « Reinitialiser » des Reglages le garde, pour
    // qu'un testeur le reste (shared/testeur/identifiant.ts).
    await etape('identifiant', effacerIdentifiantInstallation);
    await etape('widgets', () => SecureStoreService.deleteWidgets());
    await etape('documents', viderLesDocuments);
    await etape('AsyncStorage', () => AsyncStorage.clear());
    await relancer();
}
