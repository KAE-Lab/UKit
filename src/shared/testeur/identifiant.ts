/**
 * L'identifiant de cet appareil, derive d'une graine que l'application ne cree ni n'efface jamais.
 *
 * Il ne sert qu'a une chose — dire si cet appareil est un testeur — et il doit survivre a tout :
 * « Reinitialiser », la reinitialisation complete du menu, une desinstallation. Jusqu'en 6.2.x c'etait
 * un UUID tire au hasard dans le trousseau. Sur Android, `expo-secure-store` exclut ses preferences
 * de la sauvegarde du systeme : l'identifiant mourait a la desinstallation. Sur iOS, la
 * reinitialisation complete l'effacait a dessein, et une lecture du trousseau **en erreur** etait
 * prise pour une absence — un nouvel identifiant ecrasait l'ancien. Les deux testeurs se
 * reinscrivaient sans cesse.
 *
 * La graine, par plateforme — la seule couture de plateforme du module :
 *   - **Android** : le SSAID (`Application.getAndroidId()`), stable par appareil, cle de signature et
 *     utilisateur. Il survit a la desinstallation et a « Effacer les donnees », change au
 *     retablissement d'usine — et differe entre un build EAS, la version du Play, Expo Go et un build
 *     local, qui n'ont pas la meme cle : un telephone de test porte donc plusieurs identifiants ;
 *   - **iOS** : un secret du trousseau, pose une fois et **jamais reecrit**. La plateforme n'offre
 *     aucun identifiant d'appareil qui survive a une desinstallation — `identifierForVendor` se
 *     reinitialise quand la derniere application de l'editeur part, et UKit est la seule. Le
 *     trousseau, lui, survit. Une lecture en erreur rend un identifiant de **session**, sans ecriture
 *     et sans memoisation : le prochain appel relit.
 *
 * Dans les deux cas l'identifiant est une empreinte SHA-256 de la graine mise en forme d'UUID
 * (derivation.ts) : la colonne `testeurs.id` reste `uuid`, la console colle pareil, et le SSAID ne
 * parait nulle part, pas meme a l'ecran. **Il ne quitte jamais l'appareil** : l'application lit la
 * liste des testeurs et compare chez elle (statut.ts). Le seul endroit ou il s'affiche est le panneau
 * Testeur du menu de developpement, pour que son proprietaire le recopie dans la console.
 *
 * `expo-crypto` et `expo-application` sont des modules que l'Expo Go des stores embarque : le menu
 * de developpement reste jouable sans build.
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync, randomUUID } from 'expo-crypto';

import SecureStoreService from '../services/SecureStoreService';
import { texteAHacher, uuidDepuisEmpreinte } from './derivation';

/** D'ou vient l'identifiant. `session` : la graine etait illisible, rien n'est enregistrable ce tour. */
export type SourceDIdentifiant = 'appareil' | 'trousseau' | 'session';

export interface Identifiant {
    readonly valeur: string;
    readonly source: SourceDIdentifiant;
}

interface Graine {
    readonly valeur: string;
    readonly source: 'appareil' | 'trousseau';
}

let identifiant: Identifiant | null = null;

/** L'identifiant de cet appareil et sa source. Memoise pour la session, sauf une identite de session. */
export async function lireIdentifiant(): Promise<Identifiant> {
    if (identifiant !== null) return identifiant;

    const graine = await graineDAppareil();
    if (graine === null) {
        return { valeur: randomUUID(), source: 'session' };
    }
    identifiant = { valeur: await deriver(graine.valeur), source: graine.source };
    return identifiant;
}

/** L'identifiant seul, pour qui n'a pas besoin de sa source. */
export async function identifiantInstallation(): Promise<string> {
    return (await lireIdentifiant()).valeur;
}

/** L'identifiant deja lu, sans toucher a rien. `null` avant la premiere lecture. */
export function identifiantConnu(): string | null {
    return identifiant?.valeur ?? null;
}

async function graineDAppareil(): Promise<Graine | null> {
    if (Platform.OS === 'android') {
        const ssaid = ssaidAndroid();
        if (ssaid !== null) return { valeur: ssaid, source: 'appareil' };
        console.warn('[testeur] SSAID indisponible, repli sur le trousseau');
    }
    return graineDuTrousseau();
}

/** Le SSAID, ou `null` : la constante est declaree `string` mais une ROM peut ne rien fournir. */
function ssaidAndroid(): string | null {
    try {
        const brut: unknown = Application.getAndroidId();
        return texteAHacher(brut) === null ? null : (brut as string);
    } catch {
        return null;
    }
}

/**
 * Le secret du trousseau, cree une seule fois. Absence et erreur sont deux choses : une erreur de
 * lecture ne cree rien — ecrire par-dessus un secret qu'on n'a pas pu lire, c'etait changer d'identite.
 */
async function graineDuTrousseau(): Promise<Graine | null> {
    let existant: string | null;
    try {
        existant = await SecureStoreService.getInstallationId();
    } catch (erreur) {
        console.warn(`[testeur] trousseau illisible, identifiant de session : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        return null;
    }
    if (existant !== null) return { valeur: existant, source: 'trousseau' };

    const neuf = randomUUID();
    if (!(await SecureStoreService.saveInstallationId(neuf))) {
        console.warn('[testeur] secret non enregistre dans le trousseau, identifiant de session');
        return null;
    }
    return { valeur: neuf, source: 'trousseau' };
}

async function deriver(graine: string): Promise<string> {
    const texte = texteAHacher(graine);
    if (texte === null) throw new Error('graine inutilisable');
    const empreinte = await digestStringAsync(CryptoDigestAlgorithm.SHA256, texte, { encoding: CryptoEncoding.HEX });
    return uuidDepuisEmpreinte(empreinte);
}
