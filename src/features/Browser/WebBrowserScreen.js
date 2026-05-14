import React, { useState, useRef, useContext, useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, TouchableOpacity, View, Modal, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import { URL } from '../../shared/services/DataService';
import { withStaticHeader } from '../../shared/navigation/NavHelpers';
import SecureStoreService from '../../shared/services/SecureStoreService';
import Translator from '../../shared/i18n/Translator';

const entrypoints = {
	ent: 'https://ent.u-bordeaux.fr',
	email: 'https://webmel.u-bordeaux.fr',
	cas: 'https://cas.u-bordeaux.fr',
	apogee: 'https://apogee.u-bordeaux.fr',
};

function WebBrowserScreen({ navigation, route, headerPadding }) {
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

	useEffect(() => {
		loadCredentials();
	}, []);

	const loadCredentials = async () => {
		const creds = await SecureStoreService.getCredentials();
		setSavedCredentials(creds);
	};

	// Force la mise à jour de l'URL si React Navigation recycle le composant
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

	const onRefresh = () => webViewRef.current?.reload();
	const onBack = () => webViewRef.current?.goBack();
	const onForward = () => webViewRef.current?.goForward();

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

	const handleMessage = (event) => {
		try {
			const data = JSON.parse(event.nativeEvent.data);
			if (data.type === 'CAS_CREDENTIALS') {
				// Prevent saving if we already have these exact credentials saved
				if (savedCredentials && savedCredentials.username === data.username && savedCredentials.password === data.password) {
					return;
				}
				setTempCredentials({ username: data.username, password: data.password });
				setShowSaveModal(true);
			}
		} catch (e) {
			// Not JSON
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

	const getInjectedJavaScriptBeforeContentLoaded = () => {
		let script = '';
		if (Platform.OS !== 'ios') {
			// No scrollTo here as DOM might not exist yet
		}

		script += `
			(function() {
                let attempts = 0;
                const checkInterval = setInterval(function() {
                    attempts++;
                    if (attempts > 50) { clearInterval(checkInterval); return; } // Stop after 5 seconds

                    if (window.location.href.includes('cas.u-bordeaux.fr/cas/login')) {
                        const usernameInput = document.getElementById('username');
                        const passwordInput = document.getElementById('password');
                        const form = document.getElementById('fm1');
                        const errorElement = document.querySelector('.alert-danger') || document.querySelector('#msg.errors') || document.querySelector('.errors');

                        if (usernameInput && passwordInput && form) {
                            clearInterval(checkInterval);

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
                    } else {
                        clearInterval(checkInterval);
                    }
                }, 100);
			})();
			true;
		`;
		return script;
	};

	const NavButton = ({ onPress, disabled, iconName, iconLib = 'material', size = 24 }) => {
		const color = disabled ? theme.primary + '44' : theme.primary;
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
					backgroundColor: disabled ? 'transparent' : theme.cardBackground,
				}}>
				<Icon name={iconName} size={size} color={color} />
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={{ flex: 1, paddingTop: (insets.top || 0) + 65 }}>
                <WebView
				ref={webViewRef}
				style={{ flex: 1, backgroundColor: theme.background }}
				startInLoadingState={true}
				renderLoading={renderLoading}
				javaScriptEnabled={true}
				domStorageEnabled={true}
				injectedJavaScript={Platform.OS !== 'ios' ? 'window.scrollTo(0,0); true;' : null}
				injectedJavaScriptBeforeContentLoaded={getInjectedJavaScriptBeforeContentLoaded()}
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
                        
						if (e.title && !route.params?.entrypoint) {
							navigation.setParams({ title: e.title });
						}
					}
				}}
				source={{ uri }}
			/>

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

			<SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.background }}>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-around',
						alignItems: 'center',
						paddingHorizontal: tokens.space.sm,
						paddingTop: tokens.space.sm + 2,
						backgroundColor: 'transparent',
						borderTopWidth: 1,
						borderTopColor: theme.border,
					}}>
					<NavButton onPress={onBack} disabled={!canGoBack} iconName="navigate-before" size={28} />
					<NavButton onPress={onForward} disabled={!canGoForward} iconName="navigate-next" size={28} />
					<NavButton onPress={onRefresh} disabled={loading} iconName="refresh" size={24} />
					<NavButton onPress={openURL} disabled={false} iconName={Platform.OS === 'ios' ? 'apple-safari' : 'google-chrome'} iconLib="community" size={22} />
				</View>
			</SafeAreaView>
		</View>
		</SafeAreaView>
	);
}

export default withStaticHeader(WebBrowserScreen);