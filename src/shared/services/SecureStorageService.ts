import * as Keychain from 'react-native-keychain';

export class SecureStorageService {
    static async saveCredentials(username?: string, password?: string): Promise<boolean> {
        if (!username || !password) {
            return false;
        }
        try {
            await Keychain.setGenericPassword(username, password);
            return true;
        } catch (error) {
            return false;
        }
    }

    static async getCredentials(): Promise<Keychain.UserCredentials | null> {
        try {
            const credentials = await Keychain.getGenericPassword();
            if (credentials) {
                return credentials;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    static async clearCredentials(): Promise<boolean> {
        try {
            await Keychain.resetGenericPassword();
            return true;
        } catch (error) {
            return false;
        }
    }
}
