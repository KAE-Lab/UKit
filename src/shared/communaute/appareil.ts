/**
 * L'identite de l'appareil aupres de la communaute, et ses preuves (docs/phase-8/1-base-communautaire.md).
 * La couture de plateforme : `@expo/app-integrity` — App Attest sur iOS, Play Integrity sur Android —,
 * `expo-crypto`, le trousseau et AsyncStorage.
 *
 * **Jamais l'identifiant d'installation** (PRIVACY.md, 4 ter : il ne quitte pas l'appareil). La cle
 * serveur est, sur un iPhone qui a App Attest, l'identifiant de la cle attestee ; partout ailleurs,
 * l'empreinte d'un secret tire ici et garde au trousseau, que chaque contribution emporte et que la
 * base ne garde jamais. Une contribution sans preuve passe quand meme : elle ne compte pas.
 *
 * `@expo/app-integrity` est charge a la demande, et son absence — un build d'avant le module — vaut
 * « pas d'attestation », jamais une exception au chargement : le menu de developpement importe ce
 * module des le lancement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { CryptoDigestAlgorithm, CryptoEncoding, digest, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { Platform } from 'react-native';

import SecureStoreService from '../services/SecureStoreService';
import { base64Url, depuisBase64, versBase64 } from './donnees';
import { appelerLaFonction, demanderUnDefi } from './fonction';

type ModuleDIntegrite = typeof import('@expo/app-integrity');

export type Identite =
    | { readonly nature: 'app_attest'; readonly cle: string }
    | { readonly nature: 'secret'; readonly plateforme: 'ios' | 'android'; readonly secret: string; readonly cle: string };

/** `{ cle, enregistree }` : l'identifiant de la cle App Attest, et si la fonction l'a enregistree. */
const CLE_APP_ATTEST = 'communaute-appattest@1';
/**
 * La marque de cette installation. Le trousseau d'iOS survit a une desinstallation, AsyncStorage non :
 * un secret trouve sans elle est celui d'une installation passee, et se remplace — une reinstallation
 * fait une autre cle partout, comme la specification le promet.
 */
const CLE_INSTALLATION = 'communaute-installation@1';

let moduleDIntegrite: Promise<ModuleDIntegrite | null> | null = null;
let appAttestRefuse = false;
let secretDeSession: string | null = null;
let fournisseurPret: Promise<boolean> | null = null;

function integrite(): Promise<ModuleDIntegrite | null> {
    moduleDIntegrite ??= import('@expo/app-integrity').catch(() => null);
    return moduleDIntegrite;
}

function codeDe(erreur: unknown): string | null {
    const code = (erreur as { code?: unknown } | null)?.code;
    return typeof code === 'string' ? code : null;
}

/** Le numero du projet Google Cloud de Play Integrity, par la configuration du binaire ; absent, Android n'atteste rien. */
function projetPlayIntegrity(): string | null {
    const valeur = (Constants.expoConfig?.extra as { playIntegrityProjet?: unknown } | undefined)?.playIntegrityProjet;
    return typeof valeur === 'string' && /^\d{6,20}$/.test(valeur) ? valeur : null;
}

// ---------------------------------------------------------------------------
// Le secret
// ---------------------------------------------------------------------------

/**
 * Le secret de l'appareil, tire une fois. Un trousseau illisible donne un secret de session, sans
 * ecraser celui qui existe peut-etre : une lecture ratee n'est pas une absence (testeur/identifiant.ts).
 */
async function secretDeLAppareil(): Promise<string> {
    try {
        const installee = (await AsyncStorage.getItem(CLE_INSTALLATION)) !== null;
        const lu = installee ? await SecureStoreService.getSecretCommunaute() : null;
        if (lu !== null && depuisBase64(lu)?.length === 32) return lu;
        const neuf = versBase64(getRandomBytes(32));
        if (await SecureStoreService.saveSecretCommunaute(neuf)) {
            await AsyncStorage.setItem(CLE_INSTALLATION, '1');
            return neuf;
        }
    } catch {
        // Le trousseau ne repond pas : un secret de session, et rien n'est ecrit.
    }
    secretDeSession ??= versBase64(getRandomBytes(32));
    return secretDeSession;
}

async function identiteParSecret(): Promise<Identite> {
    const secret = await secretDeLAppareil();
    const cle = versBase64(new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, depuisBase64(secret) as Uint8Array<ArrayBuffer>)));
    return { nature: 'secret', plateforme: Platform.OS === 'ios' ? 'ios' : 'android', secret, cle };
}

// ---------------------------------------------------------------------------
// App Attest
// ---------------------------------------------------------------------------

interface MemoireAppAttest {
    readonly cle: string;
    readonly enregistree: boolean;
}

async function lireMemoire(): Promise<MemoireAppAttest | null> {
    try {
        const brut = JSON.parse((await AsyncStorage.getItem(CLE_APP_ATTEST)) ?? 'null') as Partial<MemoireAppAttest> | null;
        return typeof brut?.cle === 'string' ? { cle: brut.cle, enregistree: brut.enregistree === true } : null;
    } catch {
        return null;
    }
}

async function ecrireMemoire(memoire: MemoireAppAttest | null): Promise<void> {
    try {
        if (memoire === null) await AsyncStorage.removeItem(CLE_APP_ATTEST);
        else await AsyncStorage.setItem(CLE_APP_ATTEST, JSON.stringify(memoire));
    } catch {
        // Une memoire perdue fait une cle de plus au prochain essai, rien de pire.
    }
}

/**
 * Atteste une cle aupres d'Apple et la fait enregistrer par la fonction. Apple injoignable garde la cle
 * pour le prochain essai, toute autre erreur d'Apple l'oublie (documentation d'Expo) ; un refus de la
 * fonction l'oublie aussi, et suspend App Attest pour la session : ne pas reattester en boucle une
 * configuration fausse.
 */
async function attesterEtEnregistrer(module: ModuleDIntegrite, cle: string): Promise<boolean> {
    const defi = await demanderUnDefi();
    if (defi === null) return false;
    let attestation: string;
    try {
        attestation = await module.attestKeyAsync(cle, defi);
    } catch (erreur) {
        if (codeDe(erreur) !== 'ERR_APP_INTEGRITY_SERVER_UNAVAILABLE') await ecrireMemoire(null);
        return false;
    }
    const r = await appelerLaFonction({ action: 'enregistrer', cle, attestation, defi });
    if (r?.statut === 200) {
        await ecrireMemoire({ cle, enregistree: true });
        return true;
    }
    if (r !== null && r.statut >= 400 && r.statut < 500 && r.statut !== 429) {
        appAttestRefuse = true;
        await ecrireMemoire(null);
    }
    return false;
}

/**
 * Une cle App Attest enregistree aupres de la fonction, ou `null` — l'appareil contribue alors par son
 * secret, sans attestation. Une cle se cree et s'atteste une fois, puis signe chaque contribution.
 */
async function cleAppAttest(module: ModuleDIntegrite): Promise<string | null> {
    const memoire = await lireMemoire();
    if (memoire?.enregistree === true) return memoire.cle;
    if (appAttestRefuse) return null;
    let cle: string;
    try {
        cle = memoire?.cle ?? await module.generateKeyAsync();
    } catch {
        return null;
    }
    if (memoire === null) await ecrireMemoire({ cle, enregistree: false });
    return (await attesterEtEnregistrer(module, cle)) ? cle : null;
}

/**
 * La base ne connait plus la cle App Attest — `cle` : elle se reenregistre telle quelle — ou n'a pas
 * reconnu sa signature — `tout` : une autre cle la remplace.
 */
export async function oublierLaCleAppAttest(quoi: 'enregistrement' | 'tout'): Promise<void> {
    const memoire = await lireMemoire();
    if (memoire === null) return;
    await ecrireMemoire(quoi === 'tout' ? null : { cle: memoire.cle, enregistree: false });
}

/** L'identite sous laquelle contribuer : la cle attestee si l'iPhone en a une, sinon le secret. */
export async function identiteDeLAppareil(): Promise<Identite> {
    if (Platform.OS === 'ios') {
        const module = await integrite();
        if (module !== null && module.isSupported) {
            const cle = await cleAppAttest(module);
            if (cle !== null) return { nature: 'app_attest', cle };
        }
    }
    return identiteParSecret();
}

/** L'assertion App Attest du texte exact a envoyer, ou `null` : la cle n'est plus utilisable. */
export async function assertion(cle: string, donnees: string): Promise<string | null> {
    const module = await integrite();
    if (module === null) return null;
    try {
        return await module.generateAssertionAsync(cle, donnees);
    } catch {
        await ecrireMemoire(null);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Play Integrity
// ---------------------------------------------------------------------------

/** Le fournisseur de jetons, prepare une fois par session ; un echec se retente a la contribution suivante. */
function preparer(module: ModuleDIntegrite, projet: string): Promise<boolean> {
    fournisseurPret ??= module.prepareIntegrityTokenProviderAsync(projet).then(() => true, () => {
        fournisseurPret = null;
        return false;
    });
    return fournisseurPret;
}

/**
 * Un jeton Play Integrity lie au texte exact a envoyer (`requestHash` = SHA-256 du texte, en base64
 * URL), ou `null` : sans projet configure, sur un emulateur, ou sans les services Google Play. Un
 * fournisseur expire se prepare une fois de plus.
 */
export async function jetonPlayIntegrity(donnees: string): Promise<string | null> {
    const projet = projetPlayIntegrity();
    if (Platform.OS !== 'android' || projet === null) return null;
    const module = await integrite();
    if (module === null) return null;
    const empreinte = base64Url(await digestStringAsync(CryptoDigestAlgorithm.SHA256, donnees, { encoding: CryptoEncoding.BASE64 }));
    for (let essai = 0; essai < 2; essai++) {
        if (!(await preparer(module, projet))) return null;
        try {
            return await module.requestIntegrityCheckAsync(empreinte);
        } catch (erreur) {
            if (codeDe(erreur) !== 'ERR_APP_INTEGRITY_PROVIDER_INVALID') return null;
            fournisseurPret = null;
        }
    }
    return null;
}

/** Ce que l'appareil sait faire, pour le menu de developpement. */
export async function capacites(): Promise<{ readonly appAttest: boolean; readonly playIntegrity: boolean; readonly enregistree: boolean }> {
    const module = await integrite();
    return {
        appAttest: Platform.OS === 'ios' && module !== null && module.isSupported,
        playIntegrity: Platform.OS === 'android' && module !== null && projetPlayIntegrity() !== null,
        enregistree: (await lireMemoire())?.enregistree === true,
    };
}
