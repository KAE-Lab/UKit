import React, { useEffect, useContext } from 'react';
import { StatusBar as RNStatusBar, Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';

import { AppContext } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { URL } from '../constants/urls';
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
export const UpdateAlert = () => {
    const promptAlert = () => {
        Alert.alert(
            Translator.get('UPDATE_UKIT') + ' UKit',
            Translator.get('UPDATE_UKIT_DESCRIPTION'),
            [{ text: Translator.get('CANCEL') }, { text: Translator.get('UPDATE_UKIT'), onPress: openURL }],
            { cancelable: true },
        );
    };

    const openURL = () => Linking.openURL(Platform.OS === 'ios' ? URL.APPLE_APP : URL.GOOGLE_APP);

    const getCurrentVersion = () => String(Constants.expoConfig?.version || (Constants as unknown as { manifest?: { version?: string } }).manifest?.version || '1.0.0').trim();

    useEffect(() => {
        const checkVersionDiff = async () => {
            try {
                const request = await axios.get(URL.VERSION_STORE);
                if (request.status === 200 && String(request.data).trim() !== getCurrentVersion()) {
                    promptAlert();
                }
            } catch { /* Ignore réseau */ }
        };
        checkVersionDiff();
    }, []);

    return null;
};