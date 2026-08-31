/**
 * L'authentification locale, demandee **en deux temps**.
 *
 * Le defaut qui a motive ce module : sur iPhone, l'application demandait le code de l'appareil sans
 * jamais tenter Face ID, alors que l'empreinte se declenchait normalement sur Android. Les deux
 * appels d'origine — `BiometryGate` et la revelation du mot de passe — passaient
 * `disableDeviceFallback: false`, ce qui demande a iOS la politique `deviceOwnerAuthentication` :
 * celle qui **autorise** le systeme a court-circuiter la biometrie et a presenter directement le
 * code. C'est une decision d'iOS, pas un defaut de la bibliotheque, et aucune option ne la rend
 * previsible.
 *
 * Le remede standard demande les deux politiques dans l'ordre :
 *
 *   1. `disableDeviceFallback: true` — `deviceOwnerAuthenticationWithBiometrics`. iOS ne peut plus
 *      court-circuiter : c'est Face ID ou rien ;
 *   2. sur echec, une seconde demande **avec** le repli, pour que le code reste atteignable.
 *
 * **Deux temps ne veut pas dire deux fenetres imposees** : `doitProposerLeCode` tient cette
 * frontiere, et elle vit dans `decision.ts` parce qu'elle doit se verifier sans appareil.
 *
 * Ce fichier porte la plateforme, donc il n'est pas jouable sous Node — c'est la meme separation
 * qu'entre `referentiel.ts` et `index.ts` du cote des lieux et des visuels.
 *
 * Voir docs/features/scolarite.md et docs/qualite.md.
 */

import * as LocalAuthentication from 'expo-local-authentication';

import Translator from '../i18n/Translator';
import { doitProposerLeCode, type ErreurBiometrie } from './decision';

export { ANNULATIONS, doitProposerLeCode } from './decision';
export type { ErreurBiometrie } from './decision';

/** Ce que l'appareil sait faire, avant toute demande. Aucune fenetre n'est ouverte. */
export interface CapacitesBiometrie {
    /** L'appareil a un capteur. Faux sur un simulateur, ou un telephone qui n'en a pas. */
    readonly materiel: boolean;
    /** Au moins une empreinte ou un visage est enregistre sur l'appareil. */
    readonly enrole: boolean;
    /** Les modalites reconnues, en clair : `visage`, `empreinte`, `iris`. */
    readonly modalites: readonly string[];
    /** Le niveau reellement enrole : `aucun`, `code`, `biometrie faible`, `biometrie forte`. */
    readonly niveau: string;
    /**
     * L'appareil a **un** verrou, quel qu'il soit : biometrie ou simple code.
     *
     * Faux veut dire qu'aucune demande ne peut jamais aboutir. Un ecran qui insiste dans ce cas
     * n'offre pas une protection, il offre un bouton « Reessayer » qui ment.
     */
    readonly verrouille: boolean;
}

/** Ce que rend une demande : le verdict, et par quelle porte il est passe. */
export interface ResultatBiometrie {
    readonly success: boolean;
    readonly error?: ErreurBiometrie;
    readonly warning?: string;
    /** `biometrie` si le premier temps a suffi ou a tranche, `code` si le repli a pris la main. */
    readonly etape: 'biometrie' | 'code';
    /**
     * Ce qu'a fait le **premier** temps : reussi, echoue, ou pas meme tente.
     *
     * `ignoree` veut dire que l'appareil ne declare ni materiel ni enrolement, donc que la sequence a
     * saute directement au code. C'est un diagnostic tres different d'un echec, et les confondre
     * cachait la seule question qui compte quand Face ID ne se declenche pas.
     */
    readonly biometrie: 'reussie' | 'echouee' | 'ignoree';
    /**
     * Pourquoi le premier temps n'a pas suffi, **meme quand le code a fini par reussir**.
     *
     * Sans ce champ, une sequence qui aboutit par le code rendait `success: true` et rien d'autre :
     * la cause de l'absence de Face ID etait perdue au moment precis ou on la cherchait. C'est le
     * defaut qui a rendu la premiere campagne de sonde muette.
     */
    readonly erreurBiometrie?: ErreurBiometrie;
}

const MODALITES: Readonly<Record<number, string>> = {
    [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'empreinte',
    [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'visage',
    [LocalAuthentication.AuthenticationType.IRIS]: 'iris',
};

const NIVEAUX: Readonly<Record<number, string>> = {
    [LocalAuthentication.SecurityLevel.NONE]: 'aucun',
    [LocalAuthentication.SecurityLevel.SECRET]: 'code',
    [LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK]: 'biometrie faible',
    [LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG]: 'biometrie forte',
};

/** Ce que l'appareil sait faire. Ne demande rien a l'utilisateur, donc appelable a tout moment. */
export async function capacites(): Promise<CapacitesBiometrie> {
    try {
        const [materiel, enrole, types, niveau] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
            LocalAuthentication.supportedAuthenticationTypesAsync(),
            LocalAuthentication.getEnrolledLevelAsync(),
        ]);

        return {
            materiel,
            enrole,
            modalites: types.map((type) => MODALITES[type] ?? `type ${type}`),
            niveau: NIVEAUX[niveau] ?? `niveau ${niveau}`,
            verrouille: niveau !== LocalAuthentication.SecurityLevel.NONE,
        };
    } catch (erreur) {
        // Un module de plateforme absent ne casse pas l'ecran qui interroge : l'appelant lit « pas de
        // materiel » et se comporte comme sur un appareil qui n'en a pas.
        console.warn(`[biometrie] capacites illisibles : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        // `verrouille: true` en repli, et non `false` : ne pas savoir ne doit pas ouvrir une porte.
        return { materiel: false, enrole: false, modalites: [], niveau: 'inconnu', verrouille: true };
    }
}

/** La biometrie est-elle utilisable ici ? Un ecran s'en sert pour cesser d'insister. */
export async function biometrieDisponible(): Promise<boolean> {
    const etat = await capacites();
    return etat.materiel && etat.enrole;
}

function options(disableDeviceFallback: boolean): LocalAuthentication.LocalAuthenticationOptions {
    return {
        promptMessage: Translator.get('BIOMETRY_PROMPT'),
        fallbackLabel: Translator.get('BIOMETRY_FALLBACK'),
        disableDeviceFallback,
    };
}

/**
 * Demande l'authentification, biometrie d'abord.
 *
 * Le premier temps est **saute** quand rien n'est enrole : le declencher produirait un echec
 * immediat et une fenetre pour rien, alors que l'appareil sait deja qu'il n'a rien a reconnaitre.
 *
 * Ne leve jamais. Un module de plateforme en erreur rend un echec ordinaire, que l'appelant traite
 * comme une authentification refusee : une porte qui plante n'est pas une porte fermee, c'est un
 * ecran blanc.
 */
export async function demander(): Promise<ResultatBiometrie> {
    try {
        let biometrie: 'reussie' | 'echouee' | 'ignoree' = 'ignoree';
        let erreurBiometrie: ErreurBiometrie | undefined;

        if (await biometrieDisponible()) {
            const biometrique = await LocalAuthentication.authenticateAsync(options(true));
            // `=== false` et non `!biometrique.success` : sans `strictNullChecks`, TypeScript ne
            // restreint pas une union sur la simple veracite du discriminant, et `.error` cesse
            // d'exister. Meme regle que les resultats de service (shared/aetherius/runBlueprint.ts).
            if (biometrique.success === false) {
                biometrie = 'echouee';
                erreurBiometrie = biometrique.error;
                if (!doitProposerLeCode(biometrique.error)) {
                    return {
                        success: false,
                        error: biometrique.error,
                        warning: biometrique.warning,
                        etape: 'biometrie',
                        biometrie,
                        erreurBiometrie,
                    };
                }
            } else {
                return { success: true, etape: 'biometrie', biometrie: 'reussie' };
            }
        }

        const parLeCode = await LocalAuthentication.authenticateAsync(options(false));
        if (parLeCode.success === false) {
            return {
                success: false,
                error: parLeCode.error,
                warning: parLeCode.warning,
                etape: 'code',
                biometrie,
                erreurBiometrie,
            };
        }
        // Le succes par le code garde la trace du premier temps : c'est exactement la ou la cause se
        // perdait, et exactement la ou on la cherche.
        return { success: true, etape: 'code', biometrie, erreurBiometrie };
    } catch (erreur) {
        console.warn(`[biometrie] demande impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return { success: false, error: 'unknown', etape: 'biometrie', biometrie: 'echouee' };
    }
}

/**
 * La demande **telle qu'elle etait avant le correctif**, reservee au panneau de sonde.
 *
 * Elle n'existe que pour qu'une seule session sur l'appareil puisse comparer les deux politiques
 * cote a cote : sans elle, diagnostiquer demanderait de revenir en arriere dans le code, mesurer,
 * puis remettre le correctif. Aucun ecran ne l'appelle, et c'est volontaire.
 */
export async function demanderPolitiqueHistorique(): Promise<ResultatBiometrie> {
    const resultat = await LocalAuthentication.authenticateAsync(options(false));
    if (resultat.success === false) {
        return { success: false, error: resultat.error, warning: resultat.warning, etape: 'code', biometrie: 'ignoree' };
    }
    return { success: true, etape: 'code', biometrie: 'ignoree' };
}
