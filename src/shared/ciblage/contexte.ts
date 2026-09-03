/**
 * Ce que l'appareil sait de lui-meme au moment de presenter un contenu cible.
 *
 * La seule couture de plateforme du module : les regles (`ciblage.ts`, `versions.ts`) sont pures et
 * recoivent ce contexte en parametre, c'est l'appelant qui vient le chercher ici — meme partage que
 * `Temps.ts` pour l'heure.
 */

import Constants from 'expo-constants';

import { getCodeEtablissementActif } from '../etablissements/catalogue';
import { estTesteur } from '../testeur';
import type { ContexteDeCiblage } from './ciblage';

/** La version de l'application telle qu'app.config.ts la declare, ou `null` si le binaire ne la porte pas. */
export function versionApplication(): string | null {
    const version = Constants.expoConfig?.version;
    return typeof version === 'string' && version !== '' ? version : null;
}

export function contexteDeCiblage(): ContexteDeCiblage {
    return {
        testeur: estTesteur(),
        etablissement: getCodeEtablissementActif(),
        version: versionApplication(),
    };
}
