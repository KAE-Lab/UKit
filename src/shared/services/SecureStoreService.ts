import * as SecureStore from 'expo-secure-store';

const CAS_CREDENTIALS_KEY = 'UKIT_CAS_CREDENTIALS';
const COLD_DATA_KEY = 'UKIT_COLD_DATA';

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

export default class SecureStoreService {
    static async saveCredentials(username: string, password: string): Promise<boolean> {
        try {
            const credentials = JSON.stringify({ username, password });
            await SecureStore.setItemAsync(CAS_CREDENTIALS_KEY, credentials);
            return true;
        } catch (error) {
            console.error('Error saving credentials to SecureStore', error);
            return false;
        }
    }

    static async getCredentials(): Promise<{ username: string; password: string } | null> {
        try {
            const credentials = await SecureStore.getItemAsync(CAS_CREDENTIALS_KEY);
            if (credentials) {
                return JSON.parse(credentials);
            }
            return null;
        } catch (error) {
            console.error('Error retrieving credentials from SecureStore', error);
            return null;
        }
    }

    static async deleteCredentials(): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(CAS_CREDENTIALS_KEY);
            return true;
        } catch (error) {
            console.error('Error deleting credentials from SecureStore', error);
            return false;
        }
    }

    static async saveColdData(data: unknown): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(COLD_DATA_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving cold data to SecureStore', error);
            return false;
        }
    }

    static async getColdData(): Promise<unknown> {
        try {
            const data = await SecureStore.getItemAsync(COLD_DATA_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error retrieving cold data from SecureStore', error);
            return null;
        }
    }

    static async deleteColdData(): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(COLD_DATA_KEY);
            return true;
        } catch (error) {
            console.error('Error deleting cold data from SecureStore', error);
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
