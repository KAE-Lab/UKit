import React, { useContext, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import { demandeUneRessaisie, presenterEchec } from '../services/ScolariteMapping';
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


/**
 * Ce qui s'affiche **avant** le contenu, et dans cet ordre.
 *
 * L'ordre n'est pas indifferent — c'est le meme raisonnement que l'onglet Planning au jalon 6-G.
 * L'absence de portail passe devant l'absence de compte : un etablissement qui ne publie aucun
 * portail n'a jamais d'identifiants enregistres, la branche « pas de compte » gagnerait donc toujours
 * et proposerait un formulaire qui ne peut mener nulle part.
 *
 * Sorti de l'ecran au jalon 6-K pour le garder sous la limite de lignes.
 */
const EtatsAvantContenu = ({
    portailDisponible, credentials, isColdLoading, echecBloquant, sessionFailure,
    scrapeProgress, theme, accent, insets, onRetry, onRessaisir,
}) => {
    const hautDePage = { flex: 1, justifyContent: 'center' as const, paddingTop: (insets?.top || 0) + 70 };

    if (!portailDisponible) {
        return <View style={hautDePage}><SourceFailureNotice failure={portailAbsent()} theme={theme} /></View>;
    }
    if (!credentials) {
        return <ScolariteLoginView theme={theme} color={accent} topPadding={insets?.top || 0} />;
    }
    if (isColdLoading) {
        return <ScolariteLoadingScreen scrapeProgress={scrapeProgress} theme={theme} color={accent} />;
    }
    if (!echecBloquant) return null;

    return (
        <View style={hautDePage}>
            {/*
              * Un mot de passe refuse ne se repare pas en rejouant : il se repare en le ressaisissant.
              * On envoie donc au formulaire **sans deconnecter** — vider le trousseau effacerait aussi
              * l'identite deja lue et obligerait a retaper l'identifiant, pour un mot de passe qui a
              * change tout seul.
              */}
            <SourceFailureNotice
                failure={echecBloquant}
                theme={theme}
                onRetry={onRetry}
                action={demandeUneRessaisie(sessionFailure) ? {
                    label: Translator.get('REENTER_CREDENTIALS'),
                    onPress: onRessaisir,
                    icon: 'account-key-outline',
                } : undefined}
            />
        </View>
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
                    <Text style={[styles.greetingText, { color: theme.font }]}>
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

    /**
     * Ou mene la ligne de messagerie.
     *
     * Quand elle dit « identifiants incorrects », la toucher doit mener a les **corriger**, pas ouvrir
     * une messagerie a laquelle on n'a plus acces. C'est l'autre moitie de l'impasse : celle qui se
     * produit quand des donnees froides existent deja, donc que l'ecran d'echec plein ne s'affiche pas
     * (`echecBloquant` exige `coldData === null`).
     */
    const ouvrirRessaisie = () => navigation.navigate('CredentialsSettings', { ressaisie: true });

    const ouvrirMessagerie = () => (demandeUneRessaisie(sessionFailure)
        ? ouvrirRessaisie()
        : navigation.navigate('WebBrowser', { entrypoint: 'email' }));

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}

                    <EtatsAvantContenu
                        portailDisponible={portailDisponible}
                        credentials={credentials}
                        isColdLoading={isColdLoading}
                        echecBloquant={echecBloquant}
                        sessionFailure={sessionFailure}
                        scrapeProgress={scrapeProgress}
                        theme={theme}
                        accent={accent}
                        insets={insets}
                        onRetry={retrySession}
                        onRessaisir={ouvrirRessaisie}
                    />
                    {portailDisponible && credentials && !isColdLoading && !echecBloquant ? (
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
                                    onPress={ouvrirMessagerie}
                                />
                            </Animated.ScrollView>
                        </BiometryGate>
                    ) : null}
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
    },
});

export default ScolariteDashboard;
