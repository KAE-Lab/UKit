/**
 * Le magasin des lectures de l'emploi du temps : la base a laquelle chaque lecture se compare
 * (changements.ts, docs/phase-8/6-intelligence.md). Une cle, relue et reecrite a chaque lecture
 * fraiche ; les ecritures se suivent une a une, pour qu'une relecture au focus n'efface pas celle qui
 * la precede.
 *
 * La cle se purge avec les caches de planning (shared/etablissements/purge.ts, qui la nomme en
 * toutes lettres) : une bascule d'etablissement et une deconnexion du compte l'effacent comme eux, la
 * reinitialisation vide tout le magasin.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import { maintenantMs } from '../../../shared/services/Temps';
import { getCodeEtablissementActif } from '../../../shared/etablissements';
import { connus, lectureParJour, lireLaMemoire, noter, type ChangementsParJour, type EmpreinteDeCours } from './changements';
import type { PlanningEvent } from './PlanningAssembly';

const CLE_DES_LECTURES = 'planning-lectures@1';

let fileDAttente: Promise<unknown> = Promise.resolve();

function ensuite<T>(geste: () => Promise<T>): Promise<T> {
    const suite = fileDAttente.then(geste, geste);
    fileDAttente = suite.catch(() => undefined);
    return suite;
}

async function relire() {
    return lireLaMemoire(await AsyncStorage.getItem(CLE_DES_LECTURES).catch(() => null));
}

/**
 * Note une lecture fraiche des favoris et rend les changements des jours lus. Ne leve jamais : un
 * magasin qui refuse rend « aucun changement », et le Planning s'affiche comme avant.
 */
function noterUneLecture(identite: string, lecture: ReadonlyMap<string, readonly EmpreinteDeCours[]>): Promise<ChangementsParJour> {
    return ensuite(async () => {
        try {
            const instant = maintenantMs();
            const { memoire, changements } = noter(await relire(), identite, lecture, instant, moment(instant).format('YYYY-MM-DD'));
            await AsyncStorage.setItem(CLE_DES_LECTURES, JSON.stringify(memoire));
            return changements;
        } catch (erreur) {
            console.warn('[planning] lectures non notees', erreur);
            return new Map();
        }
    });
}

/** Les changements connus des jours demandes, sans rien noter : le repli d'un cache servi. */
function changementsConnus(identite: string, jours: readonly string[]): Promise<ChangementsParJour> {
    return ensuite(async () => {
        try {
            return connus(await relire(), identite, jours, maintenantMs());
        } catch (erreur) {
            console.warn('[planning] lectures illisibles', erreur);
            return new Map();
        }
    });
}

/** Oublie toutes les lectures : un autre lien d'abonnement n'est plus le meme emploi du temps. */
export function oublierLesLectures(): Promise<void> {
    return ensuite(() => AsyncStorage.removeItem(CLE_DES_LECTURES).catch((erreur) => console.warn('[planning] lectures non oubliees', erreur)));
}

/** Ce qu'une lecture compare, fige au depart du run : l'etablissement, les favoris, les jours affiches. */
export interface CadreDeLecture {
    readonly identite: string;
    readonly jours: readonly string[];
}

/**
 * Le cadre d'une lecture des favoris, ou `null` pour le planning d'un groupe cherche, qui est celui de
 * quelqu'un d'autre. L'identite est l'etablissement et les favoris : un abonnement n'a pas de groupe, et
 * deux campus a abonnement se compareraient sinon. Pris avant le reseau : un autre jour ou un autre
 * campus choisi pendant la lecture ne recoit pas ses cours.
 */
export function cadreDeLecture(groupName: string | readonly string[], jours: readonly moment.Moment[]): CadreDeLecture | null {
    if (!Array.isArray(groupName)) return null;
    return { identite: `${getCodeEtablissementActif()}|${groupName.join('+')}`, jours: jours.map((jour) => jour.format('YYYY-MM-DD')) };
}

/**
 * La porte du Planning : la lecture brute se note et se compare ; `null` — un cache servi, ou une
 * lecture a laquelle des favoris manquent — ne note rien et rend ce qui etait deja connu.
 */
export function changementsDeLaLecture(cadre: CadreDeLecture, lus: readonly PlanningEvent[] | null): Promise<ChangementsParJour> {
    return lus === null ? changementsConnus(cadre.identite, cadre.jours) : noterUneLecture(cadre.identite, lectureParJour(lus, cadre.jours));
}
