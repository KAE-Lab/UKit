import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Image, TouchableOpacity } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import NextCourseWidget from './components/NextCourseWidget';
import CrousWidget from './components/CrousWidget';
import LibraryWidget from './components/LibraryWidget';
import BdeWidget from './components/BdeWidget';
import WidgetCard from './components/WidgetCard';

const ShortcutTile = ({ title, icon, color, onPress, theme, style }) => {
    return (
        <TouchableOpacity 
            style={[{
                backgroundColor: theme.cardBackground,
                borderRadius: tokens.radius.xl,
                padding: tokens.space.md,
                alignItems: 'center',
                ...tokens.shadow.sm,
            }, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${color}15`,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: tokens.space.sm,
            }}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <Text 
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ 
                    fontSize: tokens.fontSize.xs, 
                    fontWeight: tokens.fontWeight.bold, 
                    color: theme.font, 
                    textAlign: 'center',
                    fontFamily: 'Montserrat_600SemiBold',
                }}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const DashboardScreen = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const scrollY = React.useRef(new Animated.Value(0)).current;

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 15],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const renderHeader = (insets) => {
        const topPadding = (insets?.top || 0) + 10;
        
        return (
            <View style={[
                styles.headerContainer, 
                { 
                    paddingTop: topPadding,
                    paddingBottom: 10,
                }
            ]}>
                {/* Background opaque animé avec native driver */}
                <Animated.View style={[
                    StyleSheet.absoluteFill,
                    { 
                        backgroundColor: themeName === 'dark' ? '#000000' : '#F2F2F7',
                        opacity: headerOpacity,
                    }
                ]} />
                
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.sm }]}>
                    <Image
                        style={styles.logo}
                        source={require('../../../assets/icons/logo.png')}
                    />
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        {Translator.get('HELLO_USER') || 'Bonjour !'}
                    </Text>
                </View>
                
                {/* Brouillard très discret qui déborde en dessous du header */}
                <Animated.View style={{ 
                    opacity: headerOpacity, 
                    height: 8, 
                    width: '100%', 
                    position: 'absolute', 
                    bottom: -8, 
                    left: 0 
                }}>
                    <LinearGradient
                        colors={[
                            themeName === 'dark' ? 'rgba(0,0,0,1)' : 'rgba(242,242,247,1)', 
                            themeName === 'dark' ? 'rgba(0,0,0,0)' : 'rgba(242,242,247,0)'
                        ]}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            </View>
        );
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}
                    
                    <Animated.ScrollView
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        contentContainerStyle={[
                            styles.scrollContent, 
                            { paddingTop: (insets?.top || 0) + 80 }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <NextCourseWidget navigation={navigation} />
                        <CrousWidget navigation={navigation} />
                        <LibraryWidget navigation={navigation} />
                        <BdeWidget />
                        
                        {/* SECTION MON ESPACE (Profil + Groupes) */}
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
                                        borderRadius: tokens.radius.xl,
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
                        
                        <View style={{ height: tokens.space.xxl }} />
                    </Animated.ScrollView>
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        elevation: 10,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 40,
        resizeMode: 'contain',
    },
    greetingText: {
        fontSize: tokens.fontSize.lg,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
    },
    scrollContent: {
        paddingBottom: tokens.space.xxl,
    },
    sectionTitle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
        marginTop: tokens.space.lg,
        marginBottom: tokens.space.md,
        marginLeft: tokens.space.xs,
        fontFamily: 'Montserrat_600SemiBold',
    },
    bentoContainer: {
        flex: 1,
    },
    bentoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    }
});

export default DashboardScreen;
