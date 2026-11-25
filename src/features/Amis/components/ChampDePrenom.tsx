/**
 * Le prenom, dans une rangee de groupe (docs/phase-8/8-amis.md) : celui que l'etudiant montre quand il
 * partage, ou celui sous lequel il range un ami. Un prenom, pas une phrase : `NOM_MAXIMUM` caracteres.
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { NOM_MAXIMUM } from '../services/lienAmi';

export function ChampDePrenom({ theme, libelle, valeur, onChange, indication, lePropre = false }: {
    theme: AppThemeType;
    libelle: string;
    valeur: string;
    onChange: (valeur: string) => void;
    indication?: string;
    /** Son propre prenom : iOS peut le proposer. Pas celui d'un ami, ou iOS proposerait le sien. */
    lePropre?: boolean;
}) {
    return (
        <View style={styles.rangee}>
            <Text style={[styles.libelle, { color: theme.font }]}>{libelle}</Text>
            <TextInput
                style={[styles.champ, { color: theme.font }]}
                value={valeur}
                onChangeText={onChange}
                placeholder={indication}
                placeholderTextColor={theme.fontTertiary}
                maxLength={NOM_MAXIMUM}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                accessibilityLabel={libelle}
                textContentType={lePropre ? 'givenName' : 'none'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    rangee: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        gap: tokens.space.md,
    },
    libelle: {
        fontSize: tokens.fontSize.md,
    },
    champ: {
        flex: 1,
        minHeight: 44,
        textAlign: 'right',
        fontSize: tokens.fontSize.md,
    },
});
