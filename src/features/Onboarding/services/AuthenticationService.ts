import { SecureStorageService } from '../../../shared/services/SecureStorageService';

export type InstitutionDomain =
    | 'SCIENCES_TECH'
    | 'DROIT_ECO_GESTION'
    | 'SANTE'
    | 'SCIENCES_HOMME'
    | 'IUT_BORDEAUX'
    | 'BORDEAUX_MONTAIGNE'
    | 'BORDEAUX_INP';

export interface InstitutionEndpoints {
    casHost: string;
    entHost?: string;
    intranet?: string;
    intranetSpecific?: string;
    dossierWeb?: string;
    apogee?: string;
    documents?: string;
    schedule?: string;
    webmel?: string;
}

export const INSTITUTION_ENDPOINTS: Record<string, InstitutionEndpoints> = {
    U_BORDEAUX: {
        casHost: 'cas.u-bordeaux.fr',
        entHost: 'ent.u-bordeaux.fr',
        intranet: 'intranet.u-bordeaux.fr',
        intranetSpecific: 'intranet.iut.u-bordeaux.fr/main/doku.php?id=etudiant:start',
        dossierWeb: 'mondossierweb.u-bordeaux.fr',
        apogee: 'apogee.u-bordeaux.fr',
        documents: 'renard.u-bordeaux.fr',
        schedule: 'celcat.u-bordeaux.fr',
        webmel: 'webmel.u-bordeaux.fr'
    },
    BORDEAUX_MONTAIGNE: {
        casHost: 'sso.u-bordeaux-montaigne.fr/cas/login',
        entHost: 'etu.u-bordeaux-montaigne.fr/fr/outils/mon-compte.html',
        intranet: 'intranet.iut.u-bordeaux-montaigne.fr/moncompte/',
        webmel: 'carbonio.u-bordeaux-montaigne.fr',
        schedule: 'edt.iut.u-bordeaux-montaigne.fr/portal'
    },
    BORDEAUX_INP: {
        casHost: 'cas.bordeaux-inp.fr',
        entHost: 'ent.bordeaux-inp.fr',
        dossierWeb: 'mondossierweb.bordeaux-inp.fr',
        documents: 'spagobi.bordeaux-inp.fr',
        webmel: 'partage.bordeaux-inp.fr',
        schedule: 'ade.bordeaux-inp.fr'
    }
};

export type LoginProgressStep = 'connecting' | 'authenticating' | 'fetching';

export interface AuthenticationResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockLogin = async (
    domain: string,
    endpoints: InstitutionEndpoints,
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
                return mockLogin('u_bordeaux', INSTITUTION_ENDPOINTS.U_BORDEAUX, username, password, onProgress);
            case 'BORDEAUX_MONTAIGNE':
                return mockLogin('montaigne', INSTITUTION_ENDPOINTS.BORDEAUX_MONTAIGNE, username, password, onProgress);
            case 'BORDEAUX_INP':
                return mockLogin('inp', INSTITUTION_ENDPOINTS.BORDEAUX_INP, username, password, onProgress);
            default:
                return { success: false, error: 'INVALID_DOMAIN' };
        }
    }
}
