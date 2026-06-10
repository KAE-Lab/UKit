import { SecureStorageService } from '../../../shared/services/SecureStorageService';

export type InstitutionDomain =
    | 'SCIENCES_TECH'
    | 'DROIT_ECO_GESTION'
    | 'SANTE'
    | 'SCIENCES_HOMME'
    | 'IUT_BORDEAUX'
    | 'BORDEAUX_MONTAIGNE'
    | 'BORDEAUX_INP';

export type LoginProgressStep = 'connecting' | 'authenticating' | 'fetching';

export interface AuthenticationResult {
    success: boolean;
    data?: any;
    error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockLogin = async (
    domain: string,
    casHost: string,
    entHost: string,
    username?: string,
    password?: string,
    onProgress?: (step: LoginProgressStep) => void
): Promise<AuthenticationResult> => {
    // Phase 1: Connexion au portail CAS
    if (onProgress) onProgress('connecting');
    await sleep(600);
    
    // Phase 2: Soumission du formulaire et vérification
    if (onProgress) onProgress('authenticating');
    await sleep(800);
    
    if (username === 'test' && password === 'vrai') {
        // Phase 3: Récupération de l'emploi du temps depuis l'ENT
        if (onProgress) onProgress('fetching');
        await sleep(1000);
        await SecureStorageService.saveCredentials(username, password);
        return { success: true, data: { scheduleUrl: `mock_url_${domain}` } };
    } else {
        return { success: false, error: 'LOGIN_FAILED' };
    }
};

export class AuthenticationService {
    static async login(
        domain: InstitutionDomain, 
        username?: string, 
        password?: string,
        onProgress?: (step: LoginProgressStep) => void
    ): Promise<AuthenticationResult> {
        switch (domain) {
            case 'SCIENCES_TECH':
            case 'DROIT_ECO_GESTION':
            case 'SANTE':
            case 'SCIENCES_HOMME':
            case 'IUT_BORDEAUX':
                return mockLogin('u_bordeaux', 'cas.u-bordeaux.fr', 'ent.u-bordeaux.fr', username, password, onProgress);
            case 'BORDEAUX_MONTAIGNE':
                return mockLogin('montaigne', 'cas.u-bordeaux-montaigne.fr', 'ent.u-bordeaux-montaigne.fr', username, password, onProgress);
            case 'BORDEAUX_INP':
                return mockLogin('inp', 'cas.bordeaux-inp.fr', 'ent.bordeaux-inp.fr', username, password, onProgress);
            default:
                return { success: false, error: 'INVALID_DOMAIN' };
        }
    }
}
