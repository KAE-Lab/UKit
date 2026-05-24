import * as SecureStore from 'expo-secure-store';

const CAS_CREDENTIALS_KEY = 'UKIT_CAS_CREDENTIALS';
const COLD_DATA_KEY = 'UKIT_COLD_DATA';

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

    static async getColdData(): Promise<any> {
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
}
