import React, { useContext, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import { useCredentials } from './services/CredentialsContext';
import ScolariteLoginView from './components/ScolariteLoginView';
import GreetingBlock from './components/GreetingBlock';
import MailboxRow from './components/MailboxRow';
import BiometryGate from './components/BiometryGate';
import ScolariteLoadingScreen from './components/ScolariteLoadingScreen';

const SectionHeader = ({ title, theme }) => (
    <Text style={[styles.sectionHeader, { color: theme.fontSecondary }]}>
        {title.toUpperCase()}
    </Text>
);

const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const accent = theme.accent ?? theme.primary;

    const { credentials, credentialsLoaded, coldData, mailData, scrapeStatus, scrapeProgress, sessionMode } = useCredentials();

    const scrollY = useRef(new Animated.Value(0)).current;

    const renderHeader = (insets) => {
        const opacity = scrollY.interpolate({
            inputRange: [0, 50],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <Animated.View style={[styles.headerContainer, { paddingTop: insets?.top || 0, opacity }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                    <Text style={[styles.greetingText, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
                        {Translator.get('SCOLARITY')}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    if (!credentialsLoaded) return null;

    const isColdLoading = sessionMode === 'cold' && (scrapeStatus === 'connecting' || scrapeStatus === 'scraping');

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}

                    {!credentials ? (
                        <ScolariteLoginView
                            theme={theme}
                            color={accent}
                            topPadding={insets?.top || 0}
                        />
                    ) : isColdLoading ? (
                        <ScolariteLoadingScreen
                            scrapeProgress={scrapeProgress}
                            theme={theme}
                            color={accent}
                        />
                    ) : (
                        <BiometryGate theme={theme} color={accent}>
                            <Animated.ScrollView
                                onScroll={Animated.event(
                                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                    { useNativeDriver: true }
                                )}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    paddingTop: (insets?.top || 0) + 70,
                                    paddingBottom: tokens.space.xxl + 80,
                                }}
                            >
                                <GreetingBlock coldData={coldData} color={accent} theme={theme} />

                                <SectionHeader title={Translator.get('MESSAGING')} theme={theme} />
                                <MailboxRow
                                    mailData={mailData}
                                    coldData={coldData}
                                    status={scrapeStatus}
                                    color={theme.sectionsHeaders[5] || accent}
                                    theme={theme}
                                    onPress={() => navigation.navigate('WebBrowser', { entrypoint: 'email' })}
                                />
                            </Animated.ScrollView>
                        </BiometryGate>
                    )}
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
    sectionHeader: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
        letterSpacing: 0.8,
        marginLeft: tokens.space.md,
        marginBottom: tokens.space.sm,
        fontFamily: 'Montserrat_600SemiBold',
    },
});

export default ScolariteDashboard;
