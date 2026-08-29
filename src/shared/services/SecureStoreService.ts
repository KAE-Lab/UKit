import * as SecureStore from 'expo-secure-store';

import { getCodeEtablissementActif } from '../etablissements/catalogue';
import {
    fusionnerEntree,
    lireComptes,
    lireDossiers,
    migrerVersTable,
    type CompteEnregistre,
} from '../etablissements/comptes';

/**
 * Les cles d'avant le cloisonnement : une session unique, celle de la derniere fac visitee.
 *
 * Elles ne sont plus **ecrites**. Elles sont lues une derniere fois, converties vers la table de
 * l'etablissement selectionne, puis supprimees — sans quoi la correction deconnecterait tout le parc
 * installe le jour de sa mise a jour, produisant une fois exactement le defaut qu'elle supprime.
 */
const CAS_CREDENTIALS_V1 = 'UKIT_CAS_CREDENTIALS';
const COLD_DATA_V1 = 'UKIT_COLD_DATA';

/**
 * Les cles cloisonnees : une table `{ code d'etablissement: valeur }`.
 *
 * Une cle nouvelle plutot qu'un changement de forme sous la meme cle, et c'est deliberé : distinguer
 * les deux formes demanderait de renifler le contenu, ce qui marche pour des identifiants (deux
 * champs connus) et **pas** pour un dossier froid, dont la forme appartient a la scolarite. Une cle
 * dit sans ambiguite ce qu'elle porte.
 */
const CAS_COMPTES_KEY = 'UKIT_CAS_COMPTES';
const COLD_DATA_KEY = 'UKIT_COLD_DATA_PAR_ETAB';

/**
 * Les dernieres valeurs lues par les widgets de Scolarite, par etablissement.
 *
 * **Au trousseau et non dans les reglages**, comme le dossier froid et pour la meme raison : ce sont
 * des donnees personnelles de l'etudiant — le nombre de messages qui l'attendent, le titre du devoir
 * qu'il doit rendre. La regle du depot range ce qui est personnel dans `SecureStore`, et
 * `AsyncStorage` n'est pas chiffre (docs/donnees-et-persistance.md).
 *
 * **Pourquoi les persister alors que la messagerie ne l'etait pas** : sans cache, chaque lancement
 * affichait un indicateur tournant a la place du compteur, et hors ligne il n'y avait rien du tout.
 * La valeur d'hier vaut mieux que le vide — c'est ce qui permet a la page de s'ouvrir pleine, et au
 * rafraichissement de se faire dessous.
 *
 * Aucune conversion a prevoir : la cle est neuve, une absence vaut table vide.
 */
const WIDGETS_KEY = 'UKIT_WIDGETS_PAR_ETAB';

/**
 * Les liens d'abonnement a un emploi du temps, **par etablissement** (jalon 6-J).
 *
 * Ils vivent dans le trousseau et non dans les reglages, et ce n'est pas de la prudence de principe :
 * un lien d'abonnement personnel ouvre un emploi du temps **nominatif** sans demander d'identifiant.
 * Il vaut donc un mot de passe, et il se range avec les mots de passe.
 *
 * Une seule cle porte **tous** les etablissements, sous la forme `{ code: lien }`. Deux raisons :
 * `expo-secure-store` est fait pour un petit nombre de petites valeurs — une cle par etablissement
 * ferait grandir le trousseau avec le catalogue —, et une table unique rend le cloisonnement lisible
 * au meme endroit que sa lecture.
 */
const EDT_LIENS_KEY = 'UKIT_EDT_LIENS';
/**
 * Les emplois du temps personnels trouves dans le dossier, indexes par etablissement.
 *
 * Au trousseau et non dans les reglages, et c'est une mesure : l'export anonyme d'ADE accepte
 * n'importe quel identifiant de ressource et rend l'emploi du temps correspondant, sans
 * authentification. Ce nombre vaut donc un secret (shared/etablissements/edtPersonnel.ts).
 */
const EDT_PERSONNELS_KEY = 'UKIT_EDT_PERSONNELS';
/**
 * Les propositions du dossier qui n'ont pas encore recu de reponse, par etablissement.
 *
 * Au trousseau parce qu'elles portent l'identifiant ADE, qui vaut un secret — et parce qu'elles
 * doivent survivre a un redemarrage : le planning d'une universite est vide tout l'ete, donc une
 * connexion d'ete n'a rien a comparer et la proposition attendrait la rentree
 * (features/Scolarite/services/PropositionsEnAttente.ts).
 */
const PROPOSITIONS_KEY = 'UKIT_PROPOSITIONS';

/**
 * La conversion des cles d'avant le cloisonnement, jouee au plus une fois.
 *
 * Lue **paresseusement**, au premier acces plutot qu'au demarrage : la mettre sur le chemin de
 * lancement ajouterait deux lectures de trousseau que la plupart des sessions n'utilisent jamais. La
 * suppression de l'ancienne cle vient **apres** l'ecriture de la nouvelle : dans l'ordre inverse, une
 * interruption entre les deux perdrait la session.
 */
async function convertirSiNecessaire(cleV1: string, cleCloisonnee: string, quoi: string): Promise<void> {
    try {
        if ((await SecureStore.getItemAsync(cleCloisonnee)) !== null) return;

        const ancienne = await SecureStore.getItemAsync(cleV1);
        if (ancienne === null) return;

        const table = migrerVersTable<unknown>(JSON.parse(ancienne), getCodeEtablissementActif());
        if (table !== null) await SecureStore.setItemAsync(cleCloisonnee, JSON.stringify(table));
        await SecureStore.deleteItemAsync(cleV1);
    } catch (error) {
        // Une conversion ratee redemande la connexion : desagreable, jamais bloquant. Lever ici
        // empecherait l'ecran de s'afficher, ce qui serait pire que le desagrement.
        console.warn(`[trousseau] conversion de ${quoi} impossible`, error);
    }
}

async function lireTablePersistee(cle: string): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(cle);
    } catch (error) {
        console.error(`Error retrieving ${cle} from SecureStore`, error);
        return null;
    }
}

async function ecrireTablePersistee(cle: string, table: unknown): Promise<boolean> {
    try {
        await SecureStore.setItemAsync(cle, JSON.stringify(table));
        return true;
    } catch (error) {
        console.error(`Error saving ${cle} to SecureStore`, error);
        return false;
    }
}

export default class SecureStoreService {
    /**
     * Enregistre les identifiants **de l'etablissement selectionne**, sans toucher aux autres.
     *
     * La fusion est le point sensible : ecrire la seule entree courante effacerait les autres facs, et
     * le defaut serait invisible jusqu'a la prochaine bascule.
     */
    static async saveCredentials(username: string, password: string): Promise<boolean> {
        await convertirSiNecessaire(CAS_CREDENTIALS_V1, CAS_COMPTES_KEY, 'la session');
        const table = lireComptes(await lireTablePersistee(CAS_COMPTES_KEY));
        return ecrireTablePersistee(
            CAS_COMPTES_KEY,
            fusionnerEntree<CompteEnregistre>(table, getCodeEtablissementActif(), { username, password }),
        );
    }

    /** Les identifiants de l'etablissement selectionne, ou `null` s'il n'y en a pas encore. */
    static async getCredentials(): Promise<{ username: string; password: string } | null> {
        await convertirSiNecessaire(CAS_CREDENTIALS_V1, CAS_COMPTES_KEY, 'la session');
        const table = lireComptes(await lireTablePersistee(CAS_COMPTES_KEY));
        return table[getCodeEtablissementActif()] ?? null;
    }

    /**
     * Deconnecte **de l'etablissement selectionne**.
     *
     * Ce n'est plus ce qu'une bascule declenche : elle ne touche plus a la session (voir
     * `etablissements/purge.ts`). Reste le geste explicite — « Se deconnecter » — qui n'a aucune
     * raison d'emporter la session d'une autre fac.
     */
    static async deleteCredentials(): Promise<boolean> {
        await convertirSiNecessaire(CAS_CREDENTIALS_V1, CAS_COMPTES_KEY, 'la session');
        const table = lireComptes(await lireTablePersistee(CAS_COMPTES_KEY));
        return ecrireTablePersistee(
            CAS_COMPTES_KEY,
            fusionnerEntree<CompteEnregistre>(table, getCodeEtablissementActif(), null),
        );
    }

    static async saveColdData(data: unknown): Promise<boolean> {
        await convertirSiNecessaire(COLD_DATA_V1, COLD_DATA_KEY, 'le dossier');
        const table = lireDossiers(await lireTablePersistee(COLD_DATA_KEY));
        return ecrireTablePersistee(COLD_DATA_KEY, fusionnerEntree(table, getCodeEtablissementActif(), data));
    }

    static async getColdData(): Promise<unknown> {
        await convertirSiNecessaire(COLD_DATA_V1, COLD_DATA_KEY, 'le dossier');
        const table = lireDossiers(await lireTablePersistee(COLD_DATA_KEY));
        return table[getCodeEtablissementActif()] ?? null;
    }

    /**
     * Les valeurs de widgets de l'etablissement selectionne, telles quelles.
     *
     * Rend `null` plutot que de valider : la forme appartient a la scolarite, exactement comme pour
     * le dossier froid. Ce module range et rend, il n'interprete pas.
     */
    static async getWidgets(): Promise<unknown> {
        const table = lireDossiers(await lireTablePersistee(WIDGETS_KEY));
        return table[getCodeEtablissementActif()] ?? null;
    }

    static async saveWidgets(valeurs: unknown): Promise<boolean> {
        const table = lireDossiers(await lireTablePersistee(WIDGETS_KEY));
        return ecrireTablePersistee(WIDGETS_KEY, fusionnerEntree(table, getCodeEtablissementActif(), valeurs));
    }

    static async deleteWidgets(): Promise<boolean> {
        const table = lireDossiers(await lireTablePersistee(WIDGETS_KEY));
        return ecrireTablePersistee(WIDGETS_KEY, fusionnerEntree(table, getCodeEtablissementActif(), null));
    }

    static async deleteColdData(): Promise<boolean> {
        await convertirSiNecessaire(COLD_DATA_V1, COLD_DATA_KEY, 'le dossier');
        const table = lireDossiers(await lireTablePersistee(COLD_DATA_KEY));
        return ecrireTablePersistee(COLD_DATA_KEY, fusionnerEntree(table, getCodeEtablissementActif(), null));
    }

    /**
     * Efface la session de **tous** les etablissements, cles d'avant comprises.
     *
     * Reservee a la reinitialisation, exactement comme `deleteEdtLiens` : une bascule cloisonne, une
     * reinitialisation efface. Les cles d'avant sont supprimees ici aussi, sans quoi une conversion
     * jouee plus tard ferait revenir une session que quelqu'un venait d'effacer.
     */
    static async deleteAllComptes(): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(CAS_COMPTES_KEY);
            await SecureStore.deleteItemAsync(COLD_DATA_KEY);
            await SecureStore.deleteItemAsync(WIDGETS_KEY);
            await SecureStore.deleteItemAsync(CAS_CREDENTIALS_V1);
            await SecureStore.deleteItemAsync(COLD_DATA_V1);
            return true;
        } catch (error) {
            console.error('Error deleting accounts from SecureStore', error);
            return false;
        }
    }

    /**
     * La table des liens, **telle quelle**. L'interpreter est le travail de `etablissements/lienEdt`.
     *
     * Ce module rend une chaine et n'en fait rien, exactement comme il le fait des identifiants : la
     * lecture defensive vit dans un module pur, donc jouable sous Node, donc verifiable — un lien
     * perdu en silence serait un emploi du temps vide sans explication.
     */
    static async getEdtLiens(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(EDT_LIENS_KEY);
        } catch (error) {
            console.error('Error retrieving edt links from SecureStore', error);
            return null;
        }
    }

    /** Ecrit la table entiere. La fusion appartient a l'appelant (`fusionnerLiens`). */
    static async saveEdtLiens(table: Readonly<Record<string, string>>): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(EDT_LIENS_KEY, JSON.stringify(table));
            return true;
        } catch (error) {
            console.error('Error saving edt links to SecureStore', error);
            return false;
        }
    }

    /**
     * La table des emplois du temps personnels, **telle quelle**, comme celle des liens.
     *
     * L'interpreter est le travail de `etablissements/edtPersonnel` : la lecture defensive vit dans
     * un module pur, donc jouable sous Node, donc verifiable.
     */
    static async getEdtsPersonnels(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(EDT_PERSONNELS_KEY);
        } catch (error) {
            console.error('Error retrieving personal timetables from SecureStore', error);
            return null;
        }
    }

    /** Ecrit la table entiere. La fusion appartient a l'appelant (`fusionnerEdtsPersonnels`). */
    static async saveEdtsPersonnels(table: Readonly<Record<string, unknown>>): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(EDT_PERSONNELS_KEY, JSON.stringify(table));
            return true;
        } catch (error) {
            console.error('Error saving personal timetables to SecureStore', error);
            return false;
        }
    }

    /** Les propositions en attente, **telles quelles**. Leur lecture vit dans un module pur. */
    static async getPropositions(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(PROPOSITIONS_KEY);
        } catch (error) {
            console.error('Error retrieving pending proposals from SecureStore', error);
            return null;
        }
    }

    /** Ecrit la table entiere. La fusion appartient a l'appelant. */
    static async savePropositions(table: Readonly<Record<string, unknown>>): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(PROPOSITIONS_KEY, JSON.stringify(table));
            return true;
        } catch (error) {
            console.error('Error saving pending proposals to SecureStore', error);
            return false;
        }
    }

    /** Efface les propositions en attente de **tous** les etablissements. Reinitialisation seule. */
    static async deletePropositions(): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(PROPOSITIONS_KEY);
            return true;
        } catch (error) {
            console.error('Error deleting pending proposals from SecureStore', error);
            return false;
        }
    }

    /** Efface les emplois du temps personnels de **tous** les etablissements. Reinitialisation seule. */
    static async deleteEdtsPersonnels(): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(EDT_PERSONNELS_KEY);
            return true;
        } catch (error) {
            console.error('Error deleting personal timetables from SecureStore', error);
            return false;
        }
    }

    /**
     * Efface les liens de **tous** les etablissements.
     *
     * Reserve a la reinitialisation. Un changement d'etablissement, lui, n'y touche pas : les liens
     * sont cloisonnes, et faire recoller un lien a chaque aller-retour serait une punition sans
     * raison — deux facs ne se melangent pas, ca ne veut pas dire qu'il faut les oublier
     * (docs/features/settings.md).
     */
    static async deleteEdtLiens(): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(EDT_LIENS_KEY);
            return true;
        } catch (error) {
            console.error('Error deleting edt links from SecureStore', error);
            return false;
        }
    }
}
