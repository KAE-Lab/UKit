/**
 * Les simulations du menu de developpement, gardees le temps d'une relance.
 *
 * L'interrupteur HORS LIGNE et la date simulee vivent en memoire, et c'est voulu : une simulation
 * qu'on oublie active est un faux bug qu'on cherchera longtemps, et un rechargement la remet a plat.
 * La reinitialisation complete est l'exception (2026-09-03) : elle efface tout **et relance le
 * JavaScript**, donc elle perdait aussi la simulation en cours — et c'est justement en HORS LIGNE
 * qu'on veut voir ce qu'un tout nouvel etudiant sans reseau voit. Elle range donc les simulations
 * actives sous une cle, ecrite **apres** l'effacement, et le demarrage suivant la relit puis l'efface :
 * un lancement ordinaire n'en trouve jamais. Le menu lui-meme rouvre avec elles : une simulation
 * active derriere un menu ferme, c'est un reglage qu'on ne voit pas (retour du 2026-09-03).
 * Voir docs/qualite.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { NetworkMockService } from './NetworkMockService';
import { TimeMockService } from './TimeMockService';

const CLE = 'dev/simulations@1';

interface SimulationsGardees {
    /** Le menu etait ouvert — il l'est toujours, la reinitialisation part de lui — et doit rouvrir. */
    readonly menuOuvert: boolean;
    readonly horsLigne: boolean;
    /** Le decalage de la date simulee, ou `null` si l'heure est la vraie. */
    readonly decalageMs: number | null;
}

/** Le menu doit-il rouvrir ? Lu une fois par le menu a son montage, puis oublie. */
let menuARouvrir = false;

export function menuAReouvrir(): boolean {
    const valeur = menuARouvrir;
    menuARouvrir = false;
    return valeur;
}

/** A appeler apres l'effacement du magasin, depuis le menu : il rouvrira, avec ses simulations. */
export async function garderLesSimulationsPourLaRelance(): Promise<void> {
    const gardees: SimulationsGardees = {
        menuOuvert: true,
        horsLigne: NetworkMockService.isOffline(),
        decalageMs: TimeMockService.isMockActive() ? TimeMockService.offset : null,
    };
    await AsyncStorage.setItem(CLE, JSON.stringify(gardees));
}

/**
 * A appeler au demarrage, **avant** les managers : l'interrupteur doit etre en place avant la
 * premiere requete, sinon la liste des batiments se met en cache pendant la relance et la sonde
 * hors ligne ne sonde rien.
 */
export async function restaurerLesSimulations(): Promise<void> {
    let brut: string | null = null;
    try {
        brut = await AsyncStorage.getItem(CLE);
        if (brut !== null) await AsyncStorage.removeItem(CLE);
    } catch {
        return;
    }
    if (brut === null) return;

    try {
        const gardees = JSON.parse(brut) as Partial<SimulationsGardees>;
        menuARouvrir = gardees.menuOuvert === true;
        if (gardees.horsLigne === true) NetworkMockService.setOffline(true);
        if (typeof gardees.decalageMs === 'number') await TimeMockService.setFakeTime(Date.now() + gardees.decalageMs);
        console.log('[simulations] menu de developpement restaure apres la reinitialisation complete');
    } catch {
        // Une valeur illisible vaut aucune simulation : rien a restaurer.
    }
}
