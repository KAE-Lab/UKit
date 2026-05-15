import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import SecureStoreService from '../../shared/services/SecureStoreService';
import PortalPreviewWidget from './components/PortalPreviewWidget';

// ─── Portal definitions ───────────────────────────────────────────────────────

const PORTALS = [
    {
        key: 'ent',
        entrypoint: 'ent',
        url: 'https://ent.u-bordeaux.fr',
        title: 'ENT',
        icon: 'view-dashboard-outline',
        colorIndex: 4,
    },
    {
        key: 'email',
        entrypoint: 'email',
        url: 'https://webmel.u-bordeaux.fr',
        title: () => Translator.get('MAILBOX') || 'Boîte mail',
        icon: 'email-outline',
        colorIndex: 5,
    },
    {
        key: 'apogee',
        entrypoint: 'apogee',
        url: 'https://apogee.u-bordeaux.fr',
        title: 'Apogée',
        icon: 'school-outline',
        colorIndex: 0,
    },
];

// ─── Main screen ─────────────────────────────────────────────────────────────

const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const [credentials, setCredentials] = useState(null);
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;
    const portalRefs = useRef({});

    useEffect(() => {
        SecureStoreService.getCredentials().then((creds) => {
            setCredentials(creds);
            setCredentialsLoaded(true);
        });
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            SecureStoreService.getCredentials().then((creds) => {
                setCredentials(creds);
                setCredentialsLoaded(true);
            });
        });
        return unsubscribe;
    }, [navigation]);

    const renderHeader = (insets) => {
        const topPadding = insets?.top || 0;

        const opacity = scrollY.interpolate({
            inputRange: [0, 50],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[styles.headerContainer, { paddingTop: topPadding, opacity }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                    <Text style={[styles.greetingText, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                        {Translator.get('SCOLARITY') || 'Scolarité'}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    if (!credentialsLoaded) return null;

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
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingTop: (insets?.top || 0) + 60,
                            paddingBottom: tokens.space.xxl + 80,
                        }}
                    >
                        {PORTALS.map((portal) => {
                            const portalTitle = typeof portal.title === 'function' ? portal.title() : portal.title;
                            return (
                                <View key={portal.key} style={{ marginTop: tokens.space.md }}>
                                    {/* Titre de section cliquable — ouvre la modale */}
                                    <TouchableOpacity
                                        onPress={() => portalRefs.current[portal.key]?.open()}
                                        activeOpacity={0.7}
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                                    >
                                        <Text style={[styles.sectionTitle, { color: theme.font }]}>
                                            {portalTitle}
                                        </Text>
                                        <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
                                    </TouchableOpacity>

                                    <PortalPreviewWidget
                                        ref={(r) => { portalRefs.current[portal.key] = r; }}
                                        title={portalTitle}
                                        icon={portal.icon}
                                        entrypoint={portal.entrypoint}
                                        url={portal.url}
                                        color={theme.sectionsHeaders[portal.colorIndex] || theme.primary}
                                        credentials={credentials}
                                        navigation={navigation}
                                    />
                                </View>
                            );
                        })}
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
        paddingBottom: tokens.space.sm,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 34,
        fontWeight: tokens.fontWeight.bold,
        marginBottom: tokens.space.md,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
    },
});

export default ScolariteDashboard;
