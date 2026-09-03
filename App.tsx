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

import RootContainer from './src/shared/navigation/rootContainer';
import { SettingsManager } from './src/shared/services/AppCore'
import { loadBuildings } from './src/shared/locations';
import { loadVisuels } from './src/shared/visuels';
import { chargerStatutTesteur } from './src/shared/testeur';
import { chargerMessages } from './src/shared/messages';
import { loadEdtsPersonnels, loadEtablissements, loadLiensEdt } from './src/shared/etablissements';
import { PlanningDataManager } from './src/features/Planning/services/PlanningDataManager';
import { CampusDataManager } from './src/features/Campus/services/CampusDataManager';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootSiblingParent } from 'react-native-root-siblings';

SplashScreen.preventAutoHideAsync();

/*
 * Il n'existe PAS de figeage global de l'echelle de police : `Text.defaultProps` a ete tente ici
 * (2026-08-31) et c'est un no-op — React 19 ne lit plus `defaultProps` sur les composants
 * fonction, et Expo managee n'offre aucune prise native. La tolerance aux grandes polices se fait
 * donc PAR LAYOUT : largeurs contraintes plutot que mesurees, `flex` sur les textes de rangees
 * (voir EmptyState, SettingsSections). Ne pas retenter le raccourci global.
 */

function AnimatedAppLoader({ children }) {
	const [appIsReady, setAppIsReady] = useState(false);
	const imageSrc = require('./assets/icons/icon.png');

	useEffect(() => {
		async function prepare() {
			try {
				const imageAssets = cacheImages([require('./assets/icons/logo.png')]);

				const fontAssets = cacheFonts([
					FontAwesome.font,
					Feather.font,
					Ionicons.font,
					MaterialCommunityIcons.font,
					MaterialIcons.font,
					SimpleLineIcons.font,
					Entypo.font,
				]);
				// Les surcouches connues, depuis le cache et sans reseau : les batiments doivent etre
				// complets des le premier rendu, et le catalogue doit pouvoir resoudre l'etablissement
				// que `loadSettings` va poser juste apres. Les rafraichissements distants, eux,
				// viennent apres (rootContainer).
				await loadEtablissements();
				await loadLiensEdt();
				// L'emploi du temps personnel trouve dans le dossier se fusionne au referentiel du
				// catalogue : il doit etre la avant que le premier ecran ne resolve un favori.
				await loadEdtsPersonnels();
				await loadBuildings();
				// Les visuels publies suivent les batiments, et pour la meme raison : une photo
				// corrigee ne doit pas redevenir fausse le temps qu'une requete revienne.
				await loadVisuels();
				// L'audience et les messages de service, depuis leur cache (jalon 6.1-B) : un incident
				// en cours doit se montrer des le premier rendu, pas une seconde apres. Le statut de
				// testeur vient d'abord, parce qu'il decide de ce que les messages laissent voir.
				await chargerStatutTesteur();
				await chargerMessages();

				// **Les reglages avant les managers**, et l'ordre inverse etait un defaut : ils
				// chargent des donnees qui appartiennent a un etablissement, et c'est `loadSettings`
				// qui dit lequel. Un etudiant de Bordeaux INP dont le cache de groupes avait expire
				// voyait donc partir, au demarrage, une requete vers le serveur de Bordeaux — la seule
				// source que le catalogue connaisse tant que le code n'est pas restaure — et la reponse
				// ecrasait sa liste. Corrige au jalon 6-J, avec le meme defaut trouve du cote de la
				// bascule d'etablissement (PlanningDataManager).
				await SettingsManager.loadSettings();
				await PlanningDataManager.loadData();
				await CampusDataManager.loadData();

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
							// L'ecran de demarrage est peint avant que le theme existe : ce repli suit
							// `app.config.ts`, pas la palette.
							// eslint-disable-next-line ukit/no-style-literals
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
		<SafeAreaProvider>
			{/*
			  * `RootSiblingParent` est ce qui rend les toasts **visibles**.
			  *
			  * `react-native-root-toast` le declare obligatoire au-dessus de React Native 0.62, et
			  * l'application est en 0.81 : sans lui, `Toast.show` ne leve pas, il ne rend rien. Les
			  * quatre messages de l'application etaient donc muets, dont trois qui annoncent un
			  * echec — un document qu'on n'a pas pu ajouter, des reglages illisibles, une absence de
			  * reseau. Constate le 2026-08-29 en cherchant pourquoi la confirmation de copie ne
			  * s'affichait pas.
			  *
			  * Sous `SafeAreaProvider` et au-dessus du reste : il doit englober tout ce qui peut
			  * appeler un toast.
			  */}
			<RootSiblingParent>
				<GestureHandlerRootView style={{ flex: 1 }}>
					<AnimatedAppLoader>
						<RootContainer />
					</AnimatedAppLoader>
				</GestureHandlerRootView>
			</RootSiblingParent>
		</SafeAreaProvider>
    );
}