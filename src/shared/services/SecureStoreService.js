import * as SecureStore from 'expo-secure-store';

const CAS_CREDENTIALS_KEY = 'UKIT_CAS_CREDENTIALS';

export default class SecureStoreService {
    static async saveCredentials(username, password) {
        try {
            const credentials = JSON.stringify({ username, password });
            await SecureStore.setItemAsync(CAS_CREDENTIALS_KEY, credentials);
            return true;
        } catch (error) {
            console.error('Error saving credentials to SecureStore', error);
            return false;
        }
    }

    static async getCredentials() {
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

    static async deleteCredentials() {
        try {
            await SecureStore.deleteItemAsync(CAS_CREDENTIALS_KEY);
            return true;
        } catch (error) {
            console.error('Error deleting credentials from SecureStore', error);
            return false;
        }
    }
}
