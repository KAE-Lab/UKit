import React, { useContext, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import { presenterEchec } from '../services/ScolariteMapping';
import { portailAbsent } from '../services/ScolariteSession';
import { useCredentials } from '../services/CredentialsContext';
import ScolariteLoginView from '../components/ScolariteLoginView';
import GreetingBlock from '../components/GreetingBlock';
import MailboxRow from '../components/MailboxRow';
import BiometryGate from '../components/BiometryGate';
import ScolariteLoadingScreen from '../components/ScolariteLoadingScreen';

const SectionHeader = ({ title, theme }) => (
    <Text style={[styles.sectionHeader, { color: theme.fontSecondary }]}>
        {title.toUpperCase()}
    </Text>
);

/**
 * La messagerie, quand l'etablissement en publie une d'extractible.
 *
 * Elle **disparait** sinon : il n'y a alors rien qui echoue, donc rien a montrer. Une carte en panne
 * permanente pour un service inexistant serait un mensonge repete a chaque lancement (jalon 6-G).
 */
const MessagerieSection = ({ disponible, mailData, coldData, scrapeStatus, sessionFailure, theme, accent, onPress }) => {
    if (!disponible) return null;

    return (
        <>
            <SectionHeader title={Translator.get('MESSAGING')} theme={theme} />
            <MailboxRow
                mailData={mailData}
                coldData={coldData}
                status={scrapeStatus}
                failure={sessionFailure}
                color={theme.sectionsHeaders[5] || accent}
                theme={theme}
                onPress={onPress}
            />
        </>
    );
};

const ScolariteDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const accent = theme.accent ?? theme.primary;

    const {
        credentials, credentialsLoaded, coldData, mailData, messagerieDisponible, portailDisponible,
        scrapeStatus, scrapeProgress, sessionMode, sessionFailure, retrySession,
    } = useCredentials();

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

    /**
     * L'echec qui prend tout l'ecran : la session a echoue **et** il n'y a aucune identite a
     * afficher. Quand des donnees froides existent — deja en trousseau, ou lues a un lancement
     * precedent — le tableau de bord reste montrable et c'est la ligne de messagerie qui porte
     * l'echec. Un run annule ne montre rien : l'utilisateur est deja parti.
     */
    const echecBloquant = scrapeStatus === 'error' && coldData === null
        && sessionFailure !== null && !sessionFailure.silent
        ? presenterEchec(sessionFailure)
        : null;

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}

                    {/*
                      * L'absence de portail passe **devant** l'absence de compte, et l'ordre n'est pas
                      * indifferent — c'est le meme raisonnement que l'onglet Planning au jalon 6-G.
                      * Un etablissement qui ne publie aucun portail n'a jamais d'identifiants
                      * enregistres : la branche « pas de compte » gagnait donc toujours, et proposait
                      * un formulaire de connexion qui ne pouvait mener nulle part. Le dire est le bon
                      * comportement, et c'est ce qui rend un etablissement sans portail utilisable
                      * plutot que menteur (jalon 6-J).
                      */}
                    {!portailDisponible ? (
                        <View style={{ flex: 1, justifyContent: 'center', paddingTop: (insets?.top || 0) + 70 }}>
                            <SourceFailureNotice failure={portailAbsent()} theme={theme} />
                        </View>
                    ) : !credentials ? (
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
                    ) : echecBloquant ? (
                        <View style={{ flex: 1, justifyContent: 'center', paddingTop: (insets?.top || 0) + 70 }}>
                            <SourceFailureNotice
                                failure={echecBloquant}
                                theme={theme}
                                onRetry={retrySession}
                            />
                        </View>
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
                                <MessagerieSection
                                    disponible={messagerieDisponible}
                                    mailData={mailData}
                                    coldData={coldData}
                                    scrapeStatus={scrapeStatus}
                                    sessionFailure={sessionFailure}
                                    theme={theme}
                                    accent={accent}
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
