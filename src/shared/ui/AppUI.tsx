import React, { useEffect, useContext } from 'react';
import { StatusBar as RNStatusBar, Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

import { AppContext } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { getSupabase, type AppReleaseRow } from '../supabase';
import style from '../theme/Theme';

// ── BARRE DE STATUT ─────────────────────────────────────────
export const StatusBar = () => {
    const AppContextValues = useContext(AppContext);
    const theme = AppContextValues.themeName;
    return (
        <RNStatusBar
            barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={style.Theme[theme].statusBarBackground}
        />
    );
};

// ── ALERTE DE MISE À JOUR ───────────────────────────────────────────────
/**
 * La version courante vient de la table `app_release` (jalon 6-B), plus du fichier VERSION sur
 * GitHub raw : l'adresse pointait une branche `master` renommee depuis, et le controle echouait
 * en silence a chaque lancement. La table porte aussi le lien du store et un message facultatif
 * par plateforme — publier une version, changer le lien ou le mot qui l'accompagne est une
 * publication de donnees, pas une release. C'etait le dernier appelant d'axios.
 */
export const UpdateAlert = () => {
    const promptAlert = (message: string | null, lienStore: string) => {
        Alert.alert(
            Translator.get('UPDATE_UKIT') + ' UKit',
            message ?? Translator.get('UPDATE_UKIT_DESCRIPTION'),
            [
                { text: Translator.get('CANCEL') },
                { text: Translator.get('UPDATE_UKIT'), onPress: () => { void Linking.openURL(lienStore); } },
            ],
            { cancelable: true },
        );
    };

    const getCurrentVersion = () => String(Constants.expoConfig?.version || (Constants as unknown as { manifest?: { version?: string } }).manifest?.version || '1.0.0').trim();

    useEffect(() => {
        const checkVersionDiff = async () => {
            const supabase = getSupabase();
            if (supabase === null) return;

            // Un echec reseau ou une table vide ne montrent rien : une alerte de mise a jour
            // fausse serait pire qu'une absence d'alerte — la question reviendra au lancement
            // suivant.
            // Le generique explicite n'est pas cosmetique : laisse au parseur de `select`,
            // l'inference rendait un type que TypeScript ne restreignait plus apres la garde.
            const { data, error } = await supabase
                .from('app_release')
                .select('version_courante, lien_store, message')
                .eq('plateforme', Platform.OS)
                .maybeSingle<Pick<AppReleaseRow, 'version_courante' | 'lien_store' | 'message'>>();

            if (error !== null || data === null) return;
            if (data.version_courante.trim() !== getCurrentVersion()) {
                promptAlert(data.message, data.lien_store);
            }
        };
        void checkVersionDiff();
    }, []);

    return null;
};