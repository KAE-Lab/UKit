import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Image } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import WidgetCard from './components/WidgetCard';
import NextCourseWidget from './components/NextCourseWidget';
import CrousWidget from './components/CrousWidget';
import LibraryWidget from './components/LibraryWidget';
import BdeWidget from './components/BdeWidget';

const DashboardScreen = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const scrollY = React.useRef(new Animated.Value(0)).current;

    // Calcul de l'opacité du header pour l'effet "glassmorphism"
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 50],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const renderHeader = (insets) => {
        // Fallback for glassmorphism without native blur dependency
        const backgroundColor = themeName === 'dark' 
            ? 'rgba(0, 0, 0, 0.85)' 
            : 'rgba(242, 242, 247, 0.85)';

        return (
            <Animated.View style={[
                styles.headerContainer, 
                { 
                    paddingTop: Math.max(insets?.top || 20, 20),
                    backgroundColor: backgroundColor,
                    borderBottomColor: theme.border,
                    borderBottomWidth: headerOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, StyleSheet.hairlineWidth]
                    }),
                }
            ]}>
                <View style={styles.headerContent}>
                    <Image
                        style={styles.logo}
                        source={require('../../../assets/icons/logo.png')}
                    />
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        Bonjour !
                    </Text>
                </View>
            </Animated.View>
        );
    };

    const renderBentoGrid = () => (
        <View style={styles.bentoContainer}>
            {/* Ligne 1 */}
            <View style={styles.bentoRow}>
                <WidgetCard 
                    title="ENT" 
                    icon="dashboard" 
                    onPress={() => navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'ent', title: 'ENT' } })}
                    color={theme.sectionsHeaders[4] || theme.primary}
                />
                <WidgetCard 
                    title={Translator.get('MAILBOX')} 
                    icon="mail-outline" 
                    onPress={() => navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'email', title: Translator.get('MAILBOX') } })}
                    color={theme.sectionsHeaders[5] || theme.secondary}
                />
            </View>
            {/* Ligne 2 */}
            <View style={styles.bentoRow}>
                <WidgetCard 
                    title="Apogée" 
                    icon="school" 
                    onPress={() => navigation.navigate('Stack', { screen: 'WebBrowser', params: { entrypoint: 'apogee', title: 'Apogée' } })}
                    color={theme.sectionsHeaders[0] || theme.primary}
                />
                <WidgetCard 
                    title={Translator.get('GROUPS')} 
                    icon="magnify" 
                    onPress={() => navigation.navigate('Stack', { screen: 'GroupSearch' })}
                    color={theme.sectionsHeaders[1] || theme.secondary}
                />
            </View>
            {/* Ligne 3 */}
            <View style={styles.bentoRow}>
                <WidgetCard 
                    title={Translator.get('SETTINGS')} 
                    icon="settings" 
                    onPress={() => navigation.navigate('Stack', { screen: 'Settings' })}
                    color={theme.fontSecondary}
                />
                <WidgetCard 
                    title={Translator.get('ABOUT')} 
                    icon="info" 
                    onPress={() => navigation.navigate('Stack', { screen: 'About' })}
                    color={theme.fontSecondary}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}
                    
                    <Animated.ScrollView
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                        contentContainerStyle={[
                            styles.scrollContent, 
                            { paddingTop: (insets?.top || 20) + 70 }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Widgets Principaux (Full Width) */}
                        <NextCourseWidget navigation={navigation} />
                        <CrousWidget navigation={navigation} />
                        <LibraryWidget navigation={navigation} />
                        <BdeWidget />
                        
                        {/* Grille Bento (Tuiles secondaires) */}
                        <Text style={[styles.sectionTitle, { color: theme.fontSecondary }]}>
                            Raccourcis
                        </Text>
                        {renderBentoGrid()}
                        
                        {/* Espace en bas */}
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
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingBottom: tokens.space.sm,
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
        paddingHorizontal: tokens.space.md,
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
