import React, { useState, useRef, useContext, useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, TouchableOpacity, View, Modal, Text, StyleSheet, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import { URL } from '../../shared/services/DataService';
import SecureStoreService from '../../shared/services/SecureStoreService';
import Translator from '../../shared/i18n/Translator';

const entrypoints = {
	ent: 'https://ent.u-bordeaux.fr',
	email: 'https://webmel.u-bordeaux.fr',
	cas: 'https://cas.u-bordeaux.fr',
	apogee: 'https://apogee.u-bordeaux.fr',
};

interface FloatingActionBarProps {
    theme: import('../../shared/theme/Theme').AppThemeType;
    insets: import('react-native-safe-area-context').EdgeInsets | null;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
    openURL: () => void;
    onQuit: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    loading: boolean;
}

const FloatingActionBar = ({ theme, insets, onBack, onForward, onRefresh, openURL, onQuit, canGoBack, canGoForward, loading }: FloatingActionBarProps) => {
    const buttonContainerWidth = 290; 
    const translateX = useSharedValue(0); // Start open

    const context = useSharedValue({ startX: 0 });
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { startX: translateX.value };
        })
        .onUpdate((e) => {
            let nextX = context.value.startX + e.translationX;
            nextX = Math.max(0, Math.min(nextX, buttonContainerWidth));
            translateX.value = nextX;
        })
        .onEnd((e) => {
            if (e.velocityX > 500 || translateX.value > buttonContainerWidth / 2) {
                // Swipe right or passed halfway -> close
                translateX.value = withTiming(buttonContainerWidth, { duration: 250 });
            } else {
                // Swipe left or didn't pass halfway -> open
                translateX.value = withTiming(0, { duration: 250 });
            }
        });

    const toggleOpen = () => {
        if (translateX.value > 0) {
            translateX.value = withTiming(0, { duration: 250 });
        } else {
            translateX.value = withTiming(buttonContainerWidth, { duration: 250 });
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }]
        };
    });

    const chevronStyle = useAnimatedStyle(() => {
        const rotate = (buttonContainerWidth - translateX.value) / buttonContainerWidth * 180;
        return {
            transform: [{ rotate: `${rotate}deg` }]
        };
    });

    interface NavButtonProps {
        onPress: () => void;
        disabled?: boolean;
        iconName: React.ComponentProps<typeof MaterialIcons>['name'] | React.ComponentProps<typeof MaterialCommunityIcons>['name'] | string;
        iconLib?: 'material' | 'community';
        size?: number;
        colorOverride?: string;
    }

    const NavButton = ({ onPress, disabled, iconName, iconLib = 'material', size = 24, colorOverride }: NavButtonProps) => {
        const color = disabled ? theme.primary + '44' : (colorOverride || theme.primary);
        const Icon = iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;

        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: tokens.radius.md,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginHorizontal: 5,
                    backgroundColor: disabled ? 'transparent' : `${color}15`,
                }}>
                <Icon name={iconName as never} size={size} color={color} />
            </TouchableOpacity>
        );
    };

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[
                styles.floatingBar, 
                { 
                    backgroundColor: theme.cardBackground, 
                    borderColor: theme.border, 
                    bottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15) 
                }, 
                animatedStyle
            ]}>
                <TouchableOpacity onPress={toggleOpen} style={styles.handle}>
                    <Animated.View style={chevronStyle}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.fontSecondary} />
                    </Animated.View>
                </TouchableOpacity>

                <View style={styles.buttonsContainer}>
                    <NavButton onPress={onQuit} iconName="door-open" iconLib="community" size={26} colorOverride="#EF5350" />
                    <NavButton onPress={onBack} disabled={!canGoBack} iconName="navigate-before" size={28} />
                    <NavButton onPress={onForward} disabled={!canGoForward} iconName="navigate-next" size={28} />
                    <NavButton onPress={onRefresh} disabled={loading} iconName="refresh" size={24} />
                    <NavButton onPress={openURL} iconName={Platform.OS === 'ios' ? 'apple-safari' : 'google-chrome'} iconLib="community" size={22} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

export interface WebBrowserScreenProps {
	navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void };
	route: { params?: { entrypoint?: 'ent' | 'email' | 'cas' | 'apogee'; href?: string } };
	onDismiss?: () => void;
}

function WebBrowserScreen({ navigation, route, onDismiss }: WebBrowserScreenProps) {
	const { themeName } = useContext(AppContext);
	const webViewRef = useRef(null);
	const insets = useSafeAreaInsets();

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

	useEffect(() => {
		loadCredentials();
	}, []);

	const loadCredentials = async () => {
		const creds = await SecureStoreService.getCredentials();
		setSavedCredentials(creds);
	};

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
        // En mode modal (onDismiss fourni), on ne touche pas aux options de navigation
        if (onDismiss) return;

        // Pour iOS : Désactive le swipe-back global de l'app si la WebView a un historique,
        // pour laisser le swipe-back natif de la WebView prendre le relais.
        navigation.setOptions({ gestureEnabled: !canGoBack });

        // Pour Android : Intercepte le bouton physique/geste de retour
        const onBackPress = () => {
            if (canGoBack && webViewRef.current) {
                webViewRef.current.goBack();
                return true; // Bloque la fermeture de l'écran
            }
            return false; // Laisse l'écran se fermer
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [canGoBack, navigation, onDismiss]);

	const onRefresh = () => webViewRef.current?.reload();
	const onBack = () => webViewRef.current?.goBack();
	const onForward = () => webViewRef.current?.goForward();
    const onQuit = () => {
        // Cache la FloatingBar immédiatement pour qu'elle ne reste pas visible
        // pendant l'animation de fermeture du widget
        setDismissing(true);
        if (onDismiss) {
            onDismiss();
        } else {
            navigation.goBack();
        }
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

	const getCASInjectedScript = () => {
		// Ce script se relance à chaque chargement de page dans la WebView (navigations internes comprises).
		// Il ne gère QUE la logique CAS — le décalage haut est géré nativement (contentInset iOS / SafeAreaView Android).
		return `
			(function() {
                if (!window.location.href.includes('cas.u-bordeaux.fr/cas/login')) return;

                let attempts = 0;
                const checkInterval = setInterval(function() {
                    attempts++;
                    if (attempts > 50) { clearInterval(checkInterval); return; }

                    const usernameInput = document.getElementById('username');
                    const passwordInput = document.getElementById('password');
                    const form = document.getElementById('fm1');

                    if (usernameInput && passwordInput && form) {
                        clearInterval(checkInterval);
                        const errorElement = document.querySelector('.alert-danger') || document.querySelector('#msg.errors') || document.querySelector('.errors');

                        if (!errorElement && '${savedCredentials?.username || ''}' !== '') {
                            usernameInput.value = '${savedCredentials?.username || ''}';
                            passwordInput.value = '${savedCredentials?.password || ''}';
                            const submitBtn = document.querySelector('input[name="submit"], button[name="submit"], input[type="submit"], button[type="submit"], .btn-submit');
                            if (submitBtn) {
                                submitBtn.click();
                            } else {
                                form.submit();
                            }
                        } else {
                            form.addEventListener('submit', function(e) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'CAS_CREDENTIALS',
                                    username: usernameInput.value,
                                    password: passwordInput.value
                                }));
                            });
                        }
                    }
                }, 100);
			})();
			true;
		`;
	};
	


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
                    injectedJavaScript={getCASInjectedScript()}
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

			<Modal
				animationType="fade"
				transparent={true}
				visible={showSaveModal}
				onRequestClose={() => setShowSaveModal(false)}
			>
				<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
					<View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.lg, borderRadius: tokens.radius.lg, width: '85%', alignItems: 'center', ...tokens.shadow.lg }}>
						<MaterialCommunityIcons name="shield-check" size={48} color={theme.primary} style={{ marginBottom: tokens.space.md }} />
						<Text style={{ fontSize: tokens.fontSize.md, color: theme.font, textAlign: 'center', marginBottom: tokens.space.lg, fontFamily: 'Montserrat_500Medium' }}>
							{Translator.get('SAVE_CREDENTIALS_PROMPT')}
						</Text>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
							<TouchableOpacity 
								style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.background, borderRadius: tokens.radius.md, marginRight: tokens.space.sm, borderWidth: 1, borderColor: theme.border }}
								onPress={() => setShowSaveModal(false)}
							>
								<Text style={{ color: theme.fontSecondary, fontWeight: 'bold' }}>{Translator.get('NO')}</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								style={{ flex: 1, padding: tokens.space.md, alignItems: 'center', backgroundColor: theme.primary, borderRadius: tokens.radius.md, marginLeft: tokens.space.sm }}
								onPress={saveCredentials}
							>
								<Text style={{ color: 'white', fontWeight: 'bold' }}>{Translator.get('YES')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
    floatingBar: {
        position: 'absolute',
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopLeftRadius: tokens.radius.md,
        borderBottomLeftRadius: tokens.radius.md,
        borderWidth: 1,
        borderRightWidth: 0,
        height: 75,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        paddingLeft: tokens.space.xs,
    },
    handle: {
        paddingHorizontal: tokens.space.xs,
        paddingVertical: tokens.space.sm,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: tokens.space.sm,
        height: '100%',
    }
});

export default WebBrowserScreen;