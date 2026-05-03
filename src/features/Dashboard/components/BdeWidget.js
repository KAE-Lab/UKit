import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';

const BdeWidget = () => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <WidgetCard 
            title={Translator.get('STUDENT_LIFE') || "Vie Étudiante & BDE"}
            icon="party-popper"
            fullWidth
            transparent={true}
            color={theme.sectionsHeaders[3] || theme.accentFont}
        >
            <View style={[styles.container, { 
                backgroundColor: theme.cardBackground,
                borderRadius: tokens.radius.xl,
                marginHorizontal: tokens.space.sm,
                ...tokens.shadow.md,
                padding: tokens.space.md
            }]}>
                <View style={[styles.placeholder, { backgroundColor: theme.greyBackground, borderColor: theme.border }]}>
                    <Text style={[styles.placeholderText, { color: theme.fontSecondary }]}>
                        {Translator.get('BDE_PLACEHOLDER') || "Espace réservé aux annonces des BDE et associations étudiantes (Soirées, Événements, etc.)"}
                    </Text>
                </View>
            </View>
        </WidgetCard>
    );
};

const styles = StyleSheet.create({
    container: {
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
