import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';

const LibraryWidget = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    return (
        <WidgetCard 
            title={Translator.get('LIBRARIES') || "Bibliothèques (BU)"}
            icon="bookshelf"
            onPress={() => navigation.navigate('Stack', { screen: 'Library' })}
            fullWidth
            color={theme.sectionsHeaders[2] || theme.primary}
        >
            <View style={styles.container}>
                <Text style={[styles.description, { color: theme.fontSecondary }]}>
                    Vérifiez les horaires d'ouverture et trouvez une place disponible pour réviser dans les BUs du campus.
                </Text>
                <Text style={[styles.action, { color: theme.sectionsHeaders[2] || theme.primary }]}>
                    Explorer les BUs
                </Text>
            </View>
        </WidgetCard>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: tokens.space.xs,
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

export default LibraryWidget;
