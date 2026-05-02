import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';

const CrousWidget = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <WidgetCard 
            title={Translator.get('RESTAURANTS_U') || "Restos U & Cafets"}
            icon="food-fork-drink"
            onPress={() => navigation.navigate('Stack', { screen: 'Crous' })}
            fullWidth
            color={theme.sectionsHeaders[1] || theme.secondary}
        >
            <View style={styles.container}>
                <View style={styles.textContainer}>
                    <Text style={[styles.description, { color: theme.fontSecondary }]}>
                        Consultez les menus des restaurants universitaires, les horaires et l'affluence en temps réel.
                    </Text>
                    <Text style={[styles.action, { color: theme.sectionsHeaders[1] || theme.secondary }]}>
                        Voir les menus du jour
                    </Text>
                </View>
            </View>
        </WidgetCard>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: tokens.space.xs,
    },
    textContainer: {
        flex: 1,
    },
    description: {
        fontSize: tokens.fontSize.sm,
        lineHeight: 20,
        marginBottom: tokens.space.sm,
    },
    action: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.bold,
    }
});

export default CrousWidget;
