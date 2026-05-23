import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';

/**
 * Porte biométrique : protège son contenu par une authentification locale.
 * Une seule demande par session app (authPassedRef persiste entre renders).
 */
const BiometryGate = ({ children, theme, color }) => {
    const authPassedRef = useRef(false);
    const [authenticated, setAuthenticated] = React.useState(false);
    const [failed, setFailed] = React.useState(false);

    const authenticate = useCallback(async () => {
        if (authPassedRef.current) return;
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: Translator.get('BIOMETRY_PROMPT'),
                fallbackLabel: Translator.get('BIOMETRY_FALLBACK'),
                disableDeviceFallback: false,
            });
            if (result.success) {
                authPassedRef.current = true;
                setAuthenticated(true);
                setFailed(false);
            } else {
                setFailed(true);
            }
        } catch {
            setFailed(true);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (!authPassedRef.current) {
                authenticate();
            }
        }, [authenticate])
    );

    if (authenticated) return children;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.icon, { color }]}>🔒</Text>
            <Text style={[styles.message, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                {Translator.get('BIOMETRY_PROMPT')}
            </Text>
            {failed && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: color }]}
                    onPress={authenticate}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.buttonText, { fontFamily: 'Montserrat_600SemiBold' }]}>
                        {Translator.get('BIOMETRY_RETRY')}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.space.md,
        paddingHorizontal: tokens.space.xl,
    },
    icon: {
        fontSize: 48,
    },
    message: {
        fontSize: tokens.fontSize.md,
        textAlign: 'center',
        lineHeight: 22,
    },
    button: {
        marginTop: tokens.space.sm,
        paddingVertical: tokens.space.sm,
        paddingHorizontal: tokens.space.xl,
        borderRadius: tokens.radius.md,
    },
    buttonText: {
        color: '#fff',
        fontSize: tokens.fontSize.md,
    },
});

export default BiometryGate;
