import React, { useState, useRef, useContext, useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, TouchableOpacity, View, Modal, Text, StyleSheet, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { URL } from '../../../shared/constants/urls';
import SecureStoreService from '../../../shared/services/SecureStoreService';
import Translator from '../../../shared/i18n/Translator';

const entrypoints = {
    ent: 'https://ent.u-bordeaux.fr',
    email: 'https://webmel.u-bordeaux.fr',
    cas: 'https://cas.u-bordeaux.fr',
    apogee: 'https://apogee.u-bordeaux.fr',
};

import { FloatingActionBar, SaveCredentialsModal, getCASInjectedScript } from '../components/WebBrowserComponents';

export interface WebBrowserScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void };
    route: { params?: { entrypoint?: 'ent' | 'email' | 'cas' | 'apogee'; href?: string } };
    onDismiss?: () => void;
}

const useWebBrowser = (route, onDismiss, navigation) => {
    let initialUri = URL.UKIT_WEBSITE;
    if (route.params) {
        const { entrypoint, href } = route.params;
        if (entrypoint && entrypoints[entrypoint]) initialUri = entrypoints[entrypoint];
        else if (href) initialUri = href;
    }

    const [uri, setUri] = useState(initialUri);
    const [url, setUrl] = useState(initialUri);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [loading, setLoading] = useState(true);

    const [savedCredentials, setSavedCredentials] = useState(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [tempCredentials, setTempCredentials] = useState(null);
    const [dismissing, setDismissing] = useState(false);
    const webViewRef = useRef(null);

    useEffect(() => {
        SecureStoreService.getCredentials().then(setSavedCredentials);
    }, []);

    useEffect(() => {
        let newUri = URL.UKIT_WEBSITE;
        if (route.params) {
            const { entrypoint, href } = route.params;
            if (entrypoint && entrypoints[entrypoint]) newUri = entrypoints[entrypoint];
            else if (href) newUri = href;
        }
        if (newUri !== uri) {
            setUri(newUri);
            setUrl(newUri);
        }
    }, [route.params?.entrypoint, route.params?.href]);

    useEffect(() => {
        if (onDismiss) return;
        navigation.setOptions({ gestureEnabled: !canGoBack });
        const onBackPress = () => {
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [canGoBack, navigation, onDismiss]);

    const onRefresh = () => webViewRef.current?.reload();
    const onBack = () => webViewRef.current?.goBack();
    const onForward = () => webViewRef.current?.goForward();
    const onQuit = () => {
        setDismissing(true);
        if (onDismiss) onDismiss();
        else navigation.goBack();
    };

    const openURL = async () => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
        } catch (err) {
            console.error('An error occurred', err);
        }
    };

    const saveCredentials = async () => {
        if (tempCredentials) {
            await SecureStoreService.saveCredentials(tempCredentials.username, tempCredentials.password);
            setSavedCredentials(tempCredentials);
        }
        setShowSaveModal(false);
    };

    const handleMessage = (event: import('react-native-webview').WebViewMessageEvent) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'CAS_CREDENTIALS') {
                if (savedCredentials && savedCredentials.username === data.username && savedCredentials.password === data.password) {
                    return;
                }
                setTempCredentials({ username: data.username, password: data.password });
                setShowSaveModal(true);
            }
        } catch (e) {
        }
    };

    return {
        uri, url, canGoBack, canGoForward, loading,
        savedCredentials, showSaveModal, setShowSaveModal,
        dismissing, webViewRef, setUrl, setCanGoBack, setCanGoForward, setLoading,
        onRefresh, onBack, onForward, onQuit, openURL, saveCredentials, handleMessage
    };
};

function WebBrowserScreen({ navigation, route, onDismiss }: WebBrowserScreenProps) {
    const { themeName } = useContext(AppContext);
    const insets = useSafeAreaInsets();
    
    const {
        uri, canGoBack, canGoForward, loading, savedCredentials, showSaveModal, setShowSaveModal,
        dismissing, webViewRef, setUrl, setCanGoBack, setCanGoForward, setLoading,
        onRefresh, onBack, onForward, onQuit, openURL, saveCredentials, handleMessage
    } = useWebBrowser(route, onDismiss, navigation);

    const theme = style.Theme[themeName];

    const renderLoading = () => (
        <View
            style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: theme.background,
            }}>
            <ActivityIndicator size="large" color={theme.primary} />
        </View>
    );

    if (!uri) return renderLoading();


    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <SafeAreaView
                edges={onDismiss
                    ? ['top', 'left', 'right']           // mode modal : SafeAreaView gère le top
                    : (Platform.OS === 'ios'
                        ? ['left', 'right']              // mode normal iOS : contentInset gère le top
                        : ['top', 'left', 'right'])}
                style={{ flex: 1 }}
            >
                <WebView
                    ref={webViewRef}
                    style={{ flex: 1, backgroundColor: theme.background }}
                    startInLoadingState={true}
                    renderLoading={renderLoading}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    pullToRefreshEnabled={true}
                    // Désactiver le swipe-back iOS en mode modal (c'est le widget qui gère le dismiss)
                    allowsBackForwardNavigationGestures={onDismiss ? canGoBack : true}
                    contentInset={(!onDismiss && Platform.OS === 'ios') ? { top: insets.top || 0, left: 0, bottom: 0, right: 0 } : undefined}
                    contentInsetAdjustmentBehavior="never"
                    injectedJavaScript={getCASInjectedScript(savedCredentials)}
                    onMessage={handleMessage}
                    originWhitelist={['*']}
                    onShouldStartLoadWithRequest={(event) => {
                        if (event.url.startsWith('http://') || event.url.startsWith('https://') || event.url === 'about:blank') {
                            return true;
                        }

                        Linking.canOpenURL(event.url).then((supported) => {
                            if (supported) Linking.openURL(event.url);
                        }).catch(() => { });

                        return false;
                    }}
                    onNavigationStateChange={(e) => {
                        if (!e.loading) {
                            setUrl(e.url);
                            setCanGoBack(e.canGoBack);
                            setCanGoForward(e.canGoForward);
                            setLoading(e.loading);
                        }
                    }}
                    source={{ uri }}
                />
            </SafeAreaView>

            {!dismissing && (
                <FloatingActionBar
                    theme={theme}
                    insets={insets}
                    onBack={onBack}
                    onForward={onForward}
                    onRefresh={onRefresh}
                    openURL={openURL}
                    onQuit={onQuit}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    loading={loading}
                />
            )}

            <SaveCredentialsModal
                theme={theme}
                visible={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={saveCredentials}
            />
        </View>
    );
}

export default WebBrowserScreen;