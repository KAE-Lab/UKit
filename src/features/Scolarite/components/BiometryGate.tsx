import React, { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';

import Translator from '../../../shared/i18n/Translator';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ScreenState } from '../../../shared/ui/ScreenState';

/**
 * Porte biométrique : protège son contenu par une authentification locale.
 * Une seule demande par session app (authPassedRef persiste entre renders).
 */
const BiometryGate = ({ children, theme }) => {
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

    /*
     * La porte prend le vocabulaire des autres etats plein ecran.
     *
     * Elle portait un **cadenas emoji** de 48 points en guise d'icone et un `#fff` en dur sur son
     * bouton : deux regles du depot enfreintes au meme endroit — aucun emoji, aucune couleur en dur —
     * et un rendu qui variait avec la police d'emoji du systeme. L'icone est desormais un glyphe de la
     * meme famille que partout ailleurs, dans le meme disque, et le bouton est celui de tous les
     * etats.
     */
    return (
        <ScreenState theme={theme}>
            <EmptyState
                variant="plain"
                icon="lock-outline"
                title={Translator.get('BIOMETRY_TITLE')}
                message={Translator.get('BIOMETRY_PROMPT')}
                theme={theme}
                action={failed ? { label: Translator.get('BIOMETRY_RETRY'), onPress: authenticate, icon: 'refresh' } : null}
            />
        </ScreenState>
    );
};

export default BiometryGate;
