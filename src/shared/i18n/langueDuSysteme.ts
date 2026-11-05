/**
 * La langue du telephone, telle que l'accueil la propose au premier lancement.
 *
 * **Le defaut qu'elle corrige** (constate sur le banc Android le 2026-11-04,
 * docs/defauts-fonctionnels.md) : sous la nouvelle architecture, `NativeModules.I18nManager` n'expose
 * plus ses constantes en proprietes, seulement par `getConstants()`. `localeIdentifier` valait donc
 * `undefined`, la lecture retombait sur `en_US`, et tout nouvel utilisateur Android voyait l'accueil
 * en anglais sur un telephone en francais.
 *
 * La lecture essaie desormais, dans l'ordre : les constantes natives par `getConstants()`, leurs
 * proprietes historiques, puis la locale qu'`Intl` tient du systeme. La premiere qui repond decide.
 * La partie qui choisit est pure et testee (langues.ts) ; ce fichier-ci lit le systeme.
 */

import { I18nManager, NativeModules, Platform } from 'react-native';

import { langueDesLocales, type LangueProposee } from './langues';

type Constantes = Record<string, unknown> | undefined;

function constantes(module: { getConstants?: () => Constantes } | undefined): Constantes {
    try {
        return module?.getConstants?.();
    } catch {
        return undefined;
    }
}

function localeDIntl(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
        return undefined;
    }
}

/** Les locales que le systeme annonce, de la plus sure a la moins sure. */
export function localesDuSysteme(): (string | undefined)[] {
    if (Platform.OS === 'ios') {
        const reglages = (constantes(NativeModules.SettingsManager)?.settings ?? NativeModules.SettingsManager?.settings) as
            | { AppleLocale?: string; AppleLanguages?: string[] }
            | undefined;
        return [reglages?.AppleLocale, reglages?.AppleLanguages?.[0], localeDIntl()];
    }
    const i18n = constantes(I18nManager as unknown as { getConstants?: () => Constantes });
    return [
        i18n?.localeIdentifier as string | undefined,
        NativeModules.I18nManager?.localeIdentifier as string | undefined,
        localeDIntl(),
    ];
}

/** La langue a proposer au premier lancement. */
export function langueDuSysteme(): LangueProposee {
    return langueDesLocales(localesDuSysteme());
}
