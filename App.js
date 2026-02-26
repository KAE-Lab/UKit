import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import {
	Entypo,
	Feather,
	FontAwesome,
	Ionicons,
	MaterialCommunityIcons,
	MaterialIcons,
	SimpleLineIcons,
} from '@expo/vector-icons';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat';

import RootContainer from './src/shared/navigation/rootContainer';
import SettingsManager from './utils/SettingsManager';
import DataManager from './utils/DataManager';

// Garder le splash screen visible pendant le chargement
SplashScreen.preventAutoHideAsync();

function AnimatedAppLoader({ children }) {
	const [appIsReady, setAppIsReady] = useState(false);
	const imageSrc = require('./assets/icons/splash.png');

	useEffect(() => {
		async function prepare() {
			try {
				await Font.loadAsync({ Montserrat_500Medium });

				const imageAssets = cacheImages([require('./assets/icons/app.png')]);

				const fontAssets = cacheFonts([
					FontAwesome.font,
					Feather.font,
					Ionicons.font,
					MaterialCommunityIcons.font,
					MaterialIcons.font,
					SimpleLineIcons.font,
					Entypo.font,
				]);
				await DataManager.loadData();
				await SettingsManager.loadSettings();

				await Promise.all([...imageAssets, ...fontAssets]);
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}

		prepare();
	}, []);

	if (!appIsReady) {
		return null;
	}

	return <AnimatedSplashScreen image={imageSrc}>{children}</AnimatedSplashScreen>;
}

function AnimatedSplashScreen({ children, image }) {
	const animation = useMemo(() => new Animated.Value(1), []);
	const [isAppReady, setAppReady] = useState(false);
	const [isSplashAnimationComplete, setAnimationComplete] = useState(false);

	useEffect(() => {
		if (isAppReady) {
			Animated.timing(animation, {
				toValue: 0,
				duration: 1000,
				useNativeDriver: true,
			}).start(() => setAnimationComplete(true));
		}
	}, [isAppReady]);

	const onImageLoaded = useCallback(async () => {
		try {
			await SplashScreen.hideAsync();
		} catch (e) {
			console.log('err', e);
		} finally {
			setAppReady(true);
		}
	}, []);

	// Correction de Constants.manifest vers Constants.expoConfig
	const splashConfig = Constants.expoConfig?.splash || {};

	return (
		<View style={{ flex: 1 }}>
			{isAppReady && children}
			{!isSplashAnimationComplete && (
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{
							backgroundColor: splashConfig.backgroundColor || '#ffffff',
							opacity: animation,
						},
					]}>
					<Animated.Image
						style={{
							width: '100%',
							height: '100%',
							resizeMode: splashConfig.resizeMode || 'contain',
						}}
						source={image}
						onError={(e) => console.log(e.nativeEvent.error)}
						onLoadEnd={onImageLoaded}
						fadeDuration={0}
					/>
				</Animated.View>
			)}
		</View>
	);
}

function cacheFonts(fonts) {
	return fonts.map((font) => Font.loadAsync(font));
}

function cacheImages(images) {
	return images.map((image) => {
		if (typeof image === 'string') {
			return Image.prefetch(image);
		} else {
			return Asset.fromModule(image).downloadAsync();
		}
	});
}

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AnimatedAppLoader>
                <RootContainer />
            </AnimatedAppLoader>
        </GestureHandlerRootView>
    );
}