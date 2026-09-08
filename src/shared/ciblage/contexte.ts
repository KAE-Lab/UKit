/**
 * Ce que l'appareil sait de lui-meme au moment de presenter un contenu cible.
 *
 * La seule couture de plateforme du module : les regles (`ciblage.ts`, `versions.ts`) sont pures et
 * recoivent ce contexte en parametre, c'est l'appelant qui vient le chercher ici — meme partage que
 * `Temps.ts` pour l'heure.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { getCodeEtablissementActif } from '../etablissements/catalogue';
import { estTesteur } from '../testeur';
import { PLATEFORMES, type ContexteDeCiblage, type Plateforme } from './ciblage';

/** La version de l'application telle qu'app.config.ts la declare, ou `null` si le binaire ne la porte pas. */
export function versionApplication(): string | null {
    const version = Constants.expoConfig?.version;
    return typeof version === 'string' && version !== '' ? version : null;
}

/** `Platform.OS` se lit ici, une fois, et jamais dans la regle : elle reste pure et jouable sous vitest. */
function plateforme(): ContexteDeCiblage['plateforme'] {
    return PLATEFORMES.includes(Platform.OS as Plateforme) ? (Platform.OS as Plateforme) : 'inconnue';
}

export function contexteDeCiblage(): ContexteDeCiblage {
    return {
        testeur: estTesteur(),
        etablissement: getCodeEtablissementActif(),
        version: versionApplication(),
        plateforme: plateforme(),
    };
}
