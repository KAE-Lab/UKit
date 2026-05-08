import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import WidgetCard from '../Dashboard/components/WidgetCard';
import { ShortcutTile } from '../Scolarite/ScolariteDashboard';

const AutresDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const renderHeader = (insets) => {
        const topPadding = (insets?.top || 0);
        return (
            <View style={[styles.headerContainer, { paddingTop: topPadding, backgroundColor: theme.background }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.sm }]}>
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        {Translator.get('OTHER') || 'Autres'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}
                    
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: tokens.space.xxl + 80 }}
                    >
                        {/* SECTION AUTRES */}
                        <WidgetCard
                            title={Translator.get('OTHER') || 'Autres'}
                            icon="dots-horizontal-circle-outline"
                            transparent={true}
                            fullWidth
                            color={theme.fontSecondary}
                        >
                            <View style={{ paddingHorizontal: tokens.space.sm, flexDirection: 'row' }}>
                                <ShortcutTile 
                                    title={Translator.get('SETTINGS') || 'Paramètres'} 
                                    icon="cog" 
                                    onPress={() => navigation.navigate('Settings')}
                                    color={theme.fontSecondary}
                                    theme={theme}
                                    style={{ flex: 1, marginRight: tokens.space.xs }}
                                />
                                <ShortcutTile 
                                    title={Translator.get('ABOUT') || 'À propos'} 
                                    icon="information" 
                                    onPress={() => navigation.navigate('About')}
                                    color={theme.fontSecondary}
                                    theme={theme}
                                    style={{ flex: 1, marginLeft: tokens.space.xs, marginRight: tokens.space.xs }}
                                />
                                <View style={{ flex: 1, marginLeft: tokens.space.xs }} />
                            </View>
                        </WidgetCard>
                    </ScrollView>
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: tokens.fontSize.xl,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
    },
});

export default AutresDashboard;
