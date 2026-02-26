import React, { useEffect, useContext } from 'react';
import { Text, View, StatusBar as RNStatusBar, Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';

import { AppContext } from '../services/AppCore';
import Translator from '../i18n/Translator';
import { URL } from '../services/DataService';
import { tokens } from '../theme/Theme';

// ── SÉPARATEUR VISUEL ───────────────────────────────────────────
export class Split extends React.PureComponent {
    render() {
        const { noMargin, onlyBottomMargin, lineColor, title, color } = this.props;
        return (
            <View style={{ marginTop: noMargin || onlyBottomMargin ? 0 : tokens.space.md, marginBottom: noMargin ? 0 : tokens.space.xs }}>
                <View style={{ borderBottomWidth: 1, borderColor: lineColor ?? '#E0E4EA' }} />
                {title && (
                    <Text style={{
                        color: color, paddingLeft: tokens.space.md, paddingTop: tokens.space.sm, fontSize: tokens.fontSize.xs,
                        fontWeight: tokens.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7,
                    }}>
                        {title}
                    </Text>
                )}
            </View>
        );
    }
}

// ── BARRE DE STATUT ─────────────────────────────────────────
export const StatusBar = () => {
    const AppContextValues = useContext(AppContext);
    const theme = AppContextValues.themeName;
    return (
        <RNStatusBar
            barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={theme === 'light' ? '#006F9F' : '#000000'}
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

    const getCurrentVersion = () => String(Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0').trim();

    useEffect(() => {
        const checkVersionDiff = async () => {
            try {
                const request = await axios.get(URL.VERSION_STORE);
                if (request.status === 200 && String(request.data).trim() !== getCurrentVersion()) {
                    promptAlert();
                }
            } catch (e) { /* Ignore réseau */ }
        };
        checkVersionDiff();
    }, []);

    return null;
};