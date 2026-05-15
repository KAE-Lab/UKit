import React, { useRef, useState, useEffect, useContext, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions,
    Animated, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import WebBrowserScreen from '../../Browser/WebBrowserScreen';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Loading state — message centré + point pulsant ──────────────────────────

const ConnectingView = ({ theme, color }) => {
    const pulse = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <View style={loadingStyles.container}>
            <Animated.View style={[loadingStyles.dot, { backgroundColor: color, opacity: pulse }]} />
            <Text style={[loadingStyles.text, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
                {Translator.get('PORTAL_CONNECTING')}
            </Text>
        </View>
    );
};

const loadingStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    text: {
        fontSize: tokens.fontSize.sm,
        fontWeight: '500',
    },
});

// ─── No-credentials state ─────────────────────────────────────────────────────

const NoCredentialsView = ({ theme, color, icon, onAddCredentials, onOpenAnyway }) => (
    <View style={noCredStyles.container}>
        <View style={[noCredStyles.iconBg, { backgroundColor: `${color}12` }]}>
            <MaterialCommunityIcons name={icon} size={26} color={color} />
        </View>
        <Text style={[noCredStyles.title, { color: theme.font, fontFamily: 'Montserrat_600SemiBold' }]}>
            {Translator.get('PORTAL_NO_CREDENTIALS_TITLE')}
        </Text>
        <Text style={[noCredStyles.desc, { color: theme.fontSecondary }]}>
            {Translator.get('PORTAL_NO_CREDENTIALS_DESC')}
        </Text>
        <View style={noCredStyles.buttonsRow}>
            {/* Bouton principal : ajouter identifiants */}
            <TouchableOpacity
                onPress={onAddCredentials}
                activeOpacity={0.8}
                style={[noCredStyles.button, { backgroundColor: color }]}
            >
                <MaterialCommunityIcons name="account-key-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[noCredStyles.buttonTextPrimary, { fontFamily: 'Montserrat_600SemiBold' }]}>
                    {Translator.get('PORTAL_ADD_CREDENTIALS')}
                </Text>
            </TouchableOpacity>
            {/* Bouton secondaire : ouvrir quand même */}
            <TouchableOpacity
                onPress={onOpenAnyway}
                activeOpacity={0.8}
                style={[noCredStyles.buttonSecondary, { backgroundColor: theme.field, borderColor: theme.border }]}
            >
                <MaterialCommunityIcons name="open-in-new" size={14} color={theme.fontSecondary} style={{ marginRight: 6 }} />
                <Text style={[noCredStyles.buttonTextSecondary, { color: theme.fontSecondary, fontFamily: 'Montserrat_500Medium' }]}>
                    {Translator.get('PORTAL_TAP_TO_OPEN')}
                </Text>
            </TouchableOpacity>
        </View>
    </View>
);

const noCredStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: tokens.space.lg,
        paddingVertical: tokens.space.sm,
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: tokens.space.sm,
    },
    title: {
        fontSize: tokens.fontSize.sm,
        fontWeight: '600',
        marginBottom: tokens.space.xs,
        textAlign: 'center',
    },
    desc: {
        fontSize: tokens.fontSize.xs,
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: tokens.space.md,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: tokens.space.sm,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        borderRadius: tokens.radius.md,
    },
    buttonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.sm,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
    },
    buttonTextPrimary: {
        fontSize: tokens.fontSize.xs,
        fontWeight: '600',
        color: '#fff',
    },
    buttonTextSecondary: {
        fontSize: tokens.fontSize.xs,
        fontWeight: '500',
    },
});

// ─── CAS script ───────────────────────────────────────────────────────────────

const getCASScript = (credentials) => `
    (function() {
        if (!window.location.href.includes('cas.u-bordeaux.fr/cas/login')) return;
        let attempts = 0;
        const iv = setInterval(function() {
            attempts++;
            if (attempts > 50) { clearInterval(iv); return; }
            const u = document.getElementById('username');
            const p = document.getElementById('password');
            const f = document.getElementById('fm1');
            if (u && p && f) {
                clearInterval(iv);
                const err = document.querySelector('.alert-danger') || document.querySelector('#msg.errors');
                if (!err && '${credentials?.username || ''}' !== '') {
                    u.value = '${credentials?.username || ''}';
                    p.value = '${credentials?.password || ''}';
                    const btn = document.querySelector('input[type="submit"], button[type="submit"], .btn-submit');
                    if (btn) btn.click(); else f.submit();
                }
            }
        }, 100);
    })();
    true;
`;

// ─── Scroll-to-target script ──────────────────────────────────────────────────

const buildScrollScript = (selector, margin = 0) => `
    (function() {
        var el = document.querySelector('${selector}');
        if (!el) return;
        var top = el.getBoundingClientRect().top + window.pageYOffset + (${margin});
        document.body.style.transform = 'translateY(-' + top + 'px)';
        document.body.style.transformOrigin = 'top left';
    })();
    true;
`;

// ─── Main Widget Component ────────────────────────────────────────────────────

const PortalPreviewWidget = forwardRef(({ title, icon, entrypoint, url, color, credentials, navigation, scrollTarget, scrollMargin = 0 }, ref) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const [webviewReady, setWebviewReady] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    const widgetRef = useRef(null);
    const previewWebViewRef = useRef(null);
    const widgetLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const closeTimerRef = useRef(null);

    const animX = useRef(new Animated.Value(0)).current;
    const animY = useRef(new Animated.Value(0)).current;
    const animW = useRef(new Animated.Value(0)).current;
    const animH = useRef(new Animated.Value(0)).current;
    const animBorderRadius = useRef(new Animated.Value(tokens.radius.xl)).current;

    const hasCredentials = !!credentials;

    // Fallback 8s
    useEffect(() => {
        if (!hasCredentials) return;
        const t = setTimeout(() => {
            setConnecting(false);
            setWebviewReady(true);
        }, 8000);
        return () => clearTimeout(t);
    }, [hasCredentials]);

    // Nettoyage timer à la destruction
    useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

    const handleNavigationChange = useCallback((state) => {
        if (state.url && !state.url.includes('cas.u-bordeaux.fr') && !state.loading) {
            setConnecting(false);
            setTimeout(() => setWebviewReady(true), 800);
        }
    }, []);

    const handlePreviewLoadEnd = useCallback((e) => {
        const loadedUrl = e.nativeEvent.url;
        if (!scrollTarget || !loadedUrl || loadedUrl.includes('cas.u-bordeaux.fr')) return;
        // Petit délai pour laisser le JS de la page finir de positionner les éléments
        setTimeout(() => {
            previewWebViewRef.current?.injectJavaScript(buildScrollScript(scrollTarget, scrollMargin));
        }, 300);
    }, [scrollTarget, scrollMargin]);

    // ── Expand ────────────────────────────────────────────────────────────────

    const openPortal = useCallback(() => {
        widgetRef.current?.measure((_fx, _fy, w, h, px, py) => {
            widgetLayout.current = { x: px, y: py, width: w, height: h };

            animX.setValue(px);
            animY.setValue(py);
            animW.setValue(w);
            animH.setValue(h);
            animBorderRadius.setValue(tokens.radius.xl);

            setModalVisible(true);

            Animated.parallel([
                Animated.spring(animX, { toValue: 0, useNativeDriver: false, damping: 22, stiffness: 200 }),
                Animated.spring(animY, { toValue: 0, useNativeDriver: false, damping: 22, stiffness: 200 }),
                Animated.spring(animW, { toValue: SCREEN_W, useNativeDriver: false, damping: 22, stiffness: 200 }),
                Animated.spring(animH, { toValue: SCREEN_H, useNativeDriver: false, damping: 22, stiffness: 200 }),
                Animated.timing(animBorderRadius, { toValue: 0, duration: 280, useNativeDriver: false }),
            ]).start();
        });
    }, []);

    // ── Collapse — timing rapide + dismiss immédiat sans attendre la fin ──────

    const closePortal = useCallback(() => {
        const { x, y, width, height } = widgetLayout.current;

        Animated.parallel([
            Animated.timing(animX, { toValue: x, duration: 220, useNativeDriver: false }),
            Animated.timing(animY, { toValue: y, duration: 220, useNativeDriver: false }),
            Animated.timing(animW, { toValue: width, duration: 220, useNativeDriver: false }),
            Animated.timing(animH, { toValue: height, duration: 220, useNativeDriver: false }),
            Animated.timing(animBorderRadius, { toValue: tokens.radius.xl, duration: 200, useNativeDriver: false }),
        ]).start();

        // Ferme le modal légèrement avant la fin de l'animation : pas de freeze
        closeTimerRef.current = setTimeout(() => setModalVisible(false), 180);
    }, []);

    // Expose openPortal au parent via ref
    useImperativeHandle(ref, () => ({ open: openPortal }), [openPortal]);

    // ── Render ────────────────────────────────────────────────────────────────

    const PREVIEW_HEIGHT = Math.round(SCREEN_H / 5.5);

    return (
        <>
            {/* ── Widget preview ─────────────────────────────────────────── */}
            <TouchableOpacity
                ref={widgetRef}
                activeOpacity={0.92}
                onPress={openPortal}
                style={[widgetStyles.card, { backgroundColor: theme.cardBackground }]}
            >
                <View style={[widgetStyles.previewContainer, { height: PREVIEW_HEIGHT }]}>
                    {!hasCredentials ? (
                        <NoCredentialsView
                            theme={theme}
                            color={color}
                            icon={icon}
                            onAddCredentials={() => navigation.navigate('CredentialsSettings')}
                            onOpenAnyway={openPortal}
                        />
                    ) : (
                        <>
                            {/* WebView preview */}
                            <View style={StyleSheet.absoluteFill}>
                                <WebView
                                    ref={previewWebViewRef}
                                    style={[widgetStyles.webview, { opacity: webviewReady ? 1 : 0 }]}
                                    source={{ uri: url }}
                                    javaScriptEnabled
                                    domStorageEnabled
                                    scalesPageToFit
                                    scrollEnabled={false}
                                    injectedJavaScript={getCASScript(credentials)}
                                    onNavigationStateChange={handleNavigationChange}
                                    onLoadEnd={handlePreviewLoadEnd}
                                    pointerEvents="none"
                                    injectedJavaScriptAfterDocumentCreation={`
                                        (function() {
                                            var s = document.createElement('style');
                                            s.textContent = [
                                                '.cookie-banner','#cookie-consent',
                                                '.alert-info','#portal-header .notifications',
                                                '.overlay','[class*="cookie"]','[id*="cookie"]'
                                            ].join(',') + '{display:none!important}';
                                            document.head && document.head.appendChild(s);
                                        })();
                                        true;
                                    `}
                                    originWhitelist={['*']}
                                    onShouldStartLoadWithRequest={() => true}
                                />
                            </View>

                            {/* Overlay de connexion */}
                            {(!webviewReady || connecting) && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.cardBackground }]}>
                                    <ConnectingView theme={theme} color={color} />
                                </View>
                            )}

                            {/* Fade bas de preview */}
                        </>
                    )}
                </View>
            </TouchableOpacity>

            {/* ── Modal plein-écran ──────────────────────────────────────── */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={closePortal}
            >
                <Animated.View
                    style={[
                        widgetStyles.expandedContainer,
                        {
                            left: animX,
                            top: animY,
                            width: animW,
                            height: animH,
                            borderRadius: animBorderRadius,
                            overflow: 'hidden',
                        },
                    ]}
                >
                    <WebBrowserScreen
                        navigation={navigation}
                        route={{ params: { entrypoint, title } }}
                        onDismiss={closePortal}
                    />
                </Animated.View>
            </Modal>
        </>
    );
});

// ── Styles ──────────────────────────────────────────────────────────────────

const widgetStyles = StyleSheet.create({
    card: {
        borderRadius: tokens.radius.xl,
        marginHorizontal: tokens.space.md,
        marginBottom: tokens.space.sm,
        overflow: 'hidden',
        ...tokens.shadow.sm,
    },
    previewContainer: {
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    expandedContainer: {
        position: 'absolute',
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
        elevation: 20,
    },
});

export default PortalPreviewWidget;
