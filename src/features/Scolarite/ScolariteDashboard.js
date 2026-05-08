import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import WidgetCard from '../Dashboard/components/WidgetCard';

export const ShortcutTile = ({ title, icon, color, onPress, theme, style }) => {
    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={onPress}
            style={[{
                backgroundColor: theme.cardBackground,
                borderRadius: tokens.radius.md,
                padding: tokens.space.md,
                alignItems: 'center',
                justifyContent: 'center',
                ...tokens.shadow.sm,
            }, style]}
        >
            <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${color}15`,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: tokens.space.xs,
            }}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <Text style={{ 
                fontSize: tokens.fontSize.sm, 
                fontWeight: tokens.fontWeight.bold, 
                color: theme.font, 
                textAlign: 'center',
                fontFamily: 'Montserrat_600SemiBold',
            }} numberOfLines={1}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const renderHeader = (insets) => {
        const topPadding = (insets?.top || 0);
        return (
            <View style={[styles.headerContainer, { paddingTop: topPadding, backgroundColor: 'transparent' }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.sm }]}>
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        {Translator.get('SCOLARITY') || 'Scolarité'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: tokens.space.xxl + 80 }}
                    >
                        {renderHeader(insets)}
                        
                        {/* SECTION MON ESPACE */}
                        <WidgetCard
                            title={Translator.get('MY_SPACE') || 'Mon Espace'}
                            icon="account-circle-outline"
                            transparent={true}
                            fullWidth
                            color={theme.sectionsHeaders[3] || theme.primary}
                        >
                            <View style={{ paddingHorizontal: tokens.space.sm, flexDirection: 'row' }}>
                                <TouchableOpacity 
                                    activeOpacity={0.8}
                                    onPress={() => {}}
                                    style={{
                                        flex: 2,
                                        backgroundColor: theme.cardBackground,
                                        borderRadius: tokens.radius.md,
                                        padding: tokens.space.md,
                                        marginRight: tokens.space.xs,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        ...tokens.shadow.sm,
                                    }}
                                >
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        backgroundColor: `${theme.primary}15`,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: tokens.space.sm,
                                    }}>
                                        <MaterialCommunityIcons name="card-account-details-outline" size={24} color={theme.primary} />
                                    </View>
                                    <View style={{ flex: 1, justifyContent: 'center' }}>
                                        <Text style={{ 
                                            fontSize: tokens.fontSize.sm, 
                                            fontWeight: tokens.fontWeight.bold, 
                                            color: theme.font, 
                                            fontFamily: 'Montserrat_600SemiBold',
                                            marginBottom: 2,
                                        }}>
                                            {Translator.get('PROFILE') || 'Profil'}
                                        </Text>
                                        <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }} numberOfLines={1}>
                                            {Translator.get('DOCUMENTS') || 'Documents'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <ShortcutTile 
                                    title={Translator.get('GROUPS') || 'Groupes'} 
                                    icon="format-list-bulleted" 
                                    onPress={() => navigation.navigate('GroupSearch')}
                                    color={theme.sectionsHeaders[1] || theme.secondary}
                                    theme={theme}
                                    style={{ flex: 1, marginLeft: tokens.space.xs }}
                                />
                            </View>
                        </WidgetCard>

                        {/* SECTION OUTILS UNIVERSITAIRES */}
                        <WidgetCard
                            title={Translator.get('UNIVERSITY_TOOLS') || 'Outils Universitaires'}
                            icon="toolbox-outline"
                            transparent={true}
                            fullWidth
                            color={theme.sectionsHeaders[4] || theme.primary}
                        >
                            <View style={{ paddingHorizontal: tokens.space.sm, flexDirection: 'row' }}>
                                <ShortcutTile 
                                    title="ENT" 
                                    icon="view-dashboard" 
                                    onPress={() => navigation.navigate('WebBrowser', { entrypoint: 'ent', title: 'ENT' })}
                                    color={theme.sectionsHeaders[4] || theme.primary}
                                    theme={theme}
                                    style={{ flex: 1, marginRight: tokens.space.xs }}
                                />
                                <ShortcutTile 
                                    title={Translator.get('MAILBOX') || 'Boîte Mail'} 
                                    icon="email-outline" 
                                    onPress={() => navigation.navigate('WebBrowser', { entrypoint: 'email', title: Translator.get('MAILBOX') })}
                                    color={theme.sectionsHeaders[5] || theme.secondary}
                                    theme={theme}
                                    style={{ flex: 1, marginHorizontal: tokens.space.xs }}
                                />
                                <ShortcutTile 
                                    title="Apogée" 
                                    icon="school" 
                                    onPress={() => navigation.navigate('WebBrowser', { entrypoint: 'apogee', title: 'Apogée' })}
                                    color={theme.sectionsHeaders[0] || theme.primary}
                                    theme={theme}
                                    style={{ flex: 1, marginLeft: tokens.space.xs }}
                                />
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
        fontSize: 34,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: tokens.space.md,
    },
});

export default ScolariteDashboard;
