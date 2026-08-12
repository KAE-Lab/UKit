/**
 * Ce qu'on efface quand on quitte un etablissement — ou quand on reinitialise l'application.
 *
 * A part de `index.ts` pour une raison d'import et non de gout : la porte d'entree du catalogue tire
 * le client de la base, donc `@supabase/supabase-js`, et `AppCore` — chargé avant le premier rendu —
 * n'a aucune raison de mettre ca sur son chemin de demarrage. Ce fichier ne connait que le magasin
 * local et le trousseau, deux choses qu'`AppCore` manipule deja.
 *
 * La regle qu'il applique tient en une phrase : **meler les donnees de deux facs serait pire que de
 * tout redemander.** Un planning garde d'une universite s'afficherait sous une autre sans que rien ne
 * le dise, et c'est exactement la donnee fausse silencieuse que la Phase 6 existe pour supprimer.
 *
 * Voir docs/features/settings.md et docs/phase-6/6-g-etablissements.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import SecureStoreService from '../services/SecureStoreService';

/**
 * Les cles d'AsyncStorage produites par les sources **de l'etablissement**, et elles seules.
 *
 * Le decoupage n'est pas administratif : ce qui vient de Celcat — les groupes, les salles, les
 * batiments reconstruits, les semaines en cache — appartient a une universite et n'a aucun sens sous
 * une autre. Ce qui vient de sources **nationales** — les favoris de restaurants et de bibliotheques,
 * qui pointent Croustillant et Affluences — reste : un etudiant qui passe d'une fac bordelaise a
 * l'autre garde la meme bibliotheque preferee, et la lui effacer serait une regression deguisee en
 * proprete.
 */
const CLES_A_PURGER: readonly string[] = [
    'groupList',
    'groupListTimestamp',
    'groups',
    'buildingList',
    'buildingListTimestamp',
    'freeroom_favorites',
    'batiments@1',
];

/** Les caches de planning, dont la cle porte le nom des groupes : `<groupes>@Week<n>`, `<groupes>@AAAA/MM/JJ`. */
function estCacheDePlanning(cle: string): boolean {
    return cle.includes('@Week') || /@[0-9]{4}\/[0-9]{2}\/[0-9]{2}/.test(cle);
}

/**
 * Efface tout ce qui appartenait a l'etablissement quitte, session universitaire comprise.
 *
 * **La session en fait partie, et ce n'est pas un detail.** Les identifiants et l'identite du
 * trousseau appartiennent au portail quitte : les garder afficherait le nom d'un etudiant d'une fac
 * sous le nom d'une autre. C'est aussi ce qui manquait a la reinitialisation depuis toujours —
 * constate sur appareil en verifiant le jalon 6-G, sur un parcours qui redemande l'etablissement mais
 * laissait la session en place.
 *
 * Ne leve pas : un magasin qui refuse une suppression ne doit pas empecher la bascule, sans quoi
 * l'utilisateur resterait coince sur un etablissement qu'il vient de quitter.
 */
export async function purgerDonneesEtablissement(): Promise<void> {
    try {
        const toutes = await AsyncStorage.getAllKeys();
        const aEffacer = [...CLES_A_PURGER, ...toutes.filter(estCacheDePlanning)];
        await AsyncStorage.multiRemove(aEffacer);
    } catch (erreur) {
        console.warn(`[etablissements] purge incomplete : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }

    // Les deux cles se suppriment separement — le trousseau ne les tient pas ensemble
    // (SecureStoreService).
    try {
        await SecureStoreService.deleteCredentials();
        await SecureStoreService.deleteColdData();
    } catch (erreur) {
        console.warn(`[etablissements] session non effacee : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}
