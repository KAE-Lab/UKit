import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';

const BdeWidget = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <WidgetCard 
            title="Vie Étudiante & BDE"
            icon="party-popper"
            fullWidth
            color={theme.sectionsHeaders[3] || theme.accentFont}
        >
            <View style={styles.container}>
                <View style={[styles.placeholder, { backgroundColor: theme.greyBackground, borderColor: theme.border }]}>
                    <Text style={[styles.placeholderText, { color: theme.fontSecondary }]}>
                        Espace réservé aux annonces des BDE et associations étudiantes (Soirées, Événements, etc.)
                    </Text>
                </View>
            </View>
        </WidgetCard>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: tokens.space.xs,
        marginTop: tokens.space.xs,
    },
    placeholder: {
        borderRadius: tokens.radius.md,
        padding: tokens.space.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    placeholderText: {
        fontSize: tokens.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default BdeWidget;
