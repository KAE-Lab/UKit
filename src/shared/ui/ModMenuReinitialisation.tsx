/**
 * Le bouton de remise a zero complete du menu de developpement.
 *
 * A part de `ModMenu.tsx`, qui approche la limite de lignes. Les libelles sont hors des
 * dictionnaires, comme tout le menu : ce n'est pas une capacite utilisateur.
 */

import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';

import { tokens, type AppThemeType } from '../theme/Theme';
import { reinitialiserCompletement } from '../services/ReinitialisationComplete';

function confirmer(): void {
    Alert.alert(
        'Reinitialisation complete',
        'Tout effacer — reglages, caches, trousseau, documents — puis relancer, comme une nouvelle installation ?',
        [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Tout effacer', style: 'destructive', onPress: () => { void reinitialiserCompletement(); } },
        ],
    );
}

export default function ModMenuReinitialisation({ theme }: { theme: AppThemeType }) {
    return (
        <TouchableOpacity
            onPress={confirmer}
            activeOpacity={0.8}
            style={{
                marginTop: tokens.space.md, paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md,
                borderRadius: tokens.radius.md, borderWidth: 1, borderColor: theme.danger, alignItems: 'center',
            }}
        >
            <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: tokens.fontSize.sm }}>
                Reinitialisation complete
            </Text>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, textAlign: 'center' }}>
                reglages, caches, trousseau, documents — puis relance, comme une nouvelle installation
            </Text>
        </TouchableOpacity>
    );
}
