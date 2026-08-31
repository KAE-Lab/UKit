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
import { appliquerEdtsPersonnels } from './edtPersonnel';
import { appliquerLiensEdt } from './lienEdt';

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
 * Efface les caches locaux de l'etablissement quitte.
 *
 * **La session universitaire n'en fait plus partie**, et c'est la correction du 2026-08-22. Elle en
 * faisait partie depuis le jalon 6-G, pour une raison juste — les identifiants et l'identite
 * appartiennent au portail quitte, et les garder afficherait le nom d'un etudiant d'une fac sous le
 * nom d'une autre. Le remede l'etait moins : il deconnectait a chaque aller-retour, alors que tout le
 * reste survivait, ce qui le faisait passer pour un defaut plutot que pour une regle.
 *
 * Le depot avait deja tranche ce dilemme deux fois — les groupes favoris au 6-I, les liens
 * d'abonnement au 6-J — et la formule vaut ici mot pour mot : **effacer repond a la mauvaise
 * question, la regle est que les donnees de deux facs ne se melangent pas, pas qu'il faille les
 * oublier.** La session est donc **cloisonnee** par etablissement (`etablissements/comptes.ts`), ce
 * qui tient les deux bouts : on ne lit jamais que l'entree de l'etablissement actif, donc rien ne se
 * melange, et un retour retrouve sa session.
 *
 * Ce que la reinitialisation efface, elle, est ailleurs : `purgerTrousseau`.
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
}

/**
 * Efface **tout le trousseau** : la session universitaire, les liens d'abonnement, les emplois du
 * temps personnels et les propositions en attente, de tous les etablissements.
 *
 * Reservee a la reinitialisation, et c'est ce qui la distingue d'une bascule : les deux contenus sont
 * cloisonnes par etablissement, donc un aller-retour les retrouve — ici on ne va nulle part, on
 * efface. Laisser un compte connecte ou un emploi du temps rempli a quelqu'un qui vient de tout
 * reinitialiser serait un residu, et le parcours d'accueil redemande de toute facon l'etablissement.
 *
 * Les deux effacements sont **regroupes** parce qu'ils repondent a une seule question — « que garde
 * une bascule, et qu'efface une remise a zero ? » — et qu'un appelant qui n'en jouerait qu'un
 * laisserait la moitie du trousseau derriere lui.
 *
 * Ne leve jamais : un trousseau qui refuse une suppression ne doit pas empecher la reinitialisation
 * d'aboutir.
 */
export async function purgerTrousseau(): Promise<void> {
    appliquerLiensEdt(null);
    appliquerEdtsPersonnels(null);
    try {
        await SecureStoreService.deleteEdtLiens();
        await SecureStoreService.deleteEdtsPersonnels();
        await SecureStoreService.deletePropositions();
        await SecureStoreService.deleteAllComptes();
    } catch (erreur) {
        console.warn(`[etablissements] trousseau non efface : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
}

