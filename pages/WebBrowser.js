import React, { useState, useRef, useContext } from 'react';
import { ActivityIndicator, Linking, Platform, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import style, { tokens } from '../Style';
import { AppContext } from '../utils/DeviceUtils';
import URL from '../utils/URL';

const entrypoints = {
	ent: 'https://ent.u-bordeaux.fr',
	email: 'https://webmel.u-bordeaux.fr',
	cas: 'https://cas.u-bordeaux.fr',
	apogee: 'https://apogee.u-bordeaux.fr',
};

export default function WebBrowser({ navigation, route }) {
	const { themeName } = useContext(AppContext);

	const webViewRef = useRef(null);

	let initialUri = URL.UKIT_WEBSITE;
	if (route.params) {
		const { entrypoint, href } = route.params;
		if (entrypoint && entrypoints[entrypoint]) initialUri = entrypoints[entrypoint];
		else if (href) initialUri = href;
	}

	const [uri] = useState(initialUri);
	const [url, setUrl] = useState(initialUri);
	const [canGoBack, setCanGoBack] = useState(false);
	const [canGoForward, setCanGoForward] = useState(false);
	const [loading, setLoading] = useState(true);

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

	const javascript = Platform.OS !== 'ios' ? 'window.scrollTo(0,0);' : null;

	// ── Bouton de la barre de navigation ──────────────────────────────────────
	const NavButton = ({ onPress, disabled, iconName, iconLib = 'material', size = 24 }) => {
		const color = disabled ? theme.border : theme.icon;
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
					backgroundColor: disabled ? 'transparent' : theme.greyBackground,
				}}>
				<Icon name={iconName} size={size} color={color} />
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
			<WebView
				ref={webViewRef}
				javaScriptEnabled={true}
				domStorageEnabled={true}
				startInLoadingState={true}
				renderLoading={renderLoading}
				injectedJavaScript={javascript}
				onNavigationStateChange={(e) => {
					if (!e.loading) {
						setUrl(e.url);
						setCanGoBack(e.canGoBack);
						setCanGoForward(e.canGoForward);
						setLoading(e.loading);
						if (e.title) navigation.setParams({ title: e.title });
					}
				}}
				source={{ uri }}
			/>

			{/* ── Barre de navigation ───────────────────────────────── */}
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-around',
					alignItems: 'center',
					paddingHorizontal: tokens.space.sm,
					paddingVertical: tokens.space.xs,
					backgroundColor: theme.cardBackground,
					borderTopWidth: 1,
					borderTopColor: theme.border,
				}}>
				<NavButton
					onPress={onBack}
					disabled={!canGoBack}
					iconName="navigate-before"
					size={28}
				/>
				<NavButton
					onPress={onForward}
					disabled={!canGoForward}
					iconName="navigate-next"
					size={28}
				/>
				<NavButton onPress={onRefresh} disabled={loading} iconName="refresh" size={24} />
				<NavButton
					onPress={openURL}
					disabled={false}
					iconName={Platform.OS === 'ios' ? 'apple-safari' : 'google-chrome'}
					iconLib="community"
					size={22}
				/>
			</View>
		</SafeAreaView>
	);
}
