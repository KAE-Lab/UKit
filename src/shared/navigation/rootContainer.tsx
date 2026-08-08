import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AetheriusConfirm, AetheriusWebView } from '@aetherius/react-native';

import StackNavigator from './StackNavigator';
import { refreshBlueprints } from '../aetherius';
import { AppContextProvider } from '../services/AppCore';
import { SettingsManager } from '../services/AppCore';
import WelcomeScreen from '../../features/Onboarding/WelcomeScreen';
import Style from '../theme/Theme';
import Translator from '../i18n/Translator';
import { StatusBar, UpdateAlert } from '../ui/AppUI';
import ModMenu from '../ui/ModMenu';

export default function RootContainer() {
	const [isFirstLoad, setFirstLoad] = useState(SettingsManager.isFirstLoad());
	const [themeName, setThemeName] = useState(SettingsManager.getTheme());
	const [favoriteGroups, setFavoriteGroups] = useState(SettingsManager.getFavoriteGroups());
	const [language, setLanguage] = useState(SettingsManager.getLanguage());
	const [filters, setFilters] = useState(SettingsManager.getFilters());

	function reloadData() {
		SettingsManager.loadCalendars();
	}

	/**
	 * Le retour au premier plan, et lui seul.
	 *
	 * `reloadData` se declenche sur **toutes** les transitions et continue de le faire — c'est son
	 * comportement depuis toujours. Le rafraichissement de la livraison, lui, n'a de sens qu'au
	 * retour : le declencher en passant en arriere-plan ferait une requete que personne ne regarde.
	 */
	function onAppStateChange(nextAppState) {
		reloadData();
		if (nextAppState === 'active') void refreshBlueprints();
	}

	useEffect(() => {
		const onTheme = (newTheme) => setThemeName(newTheme);
		const onFavoriteGroups = (newGroups) => setFavoriteGroups(newGroups);
		const onFirstLoad = (newFirstLoad) => setFirstLoad(newFirstLoad);
		const onLanguage = (newLang) => setLanguage(newLang);
		const onFilter = (newFilter) => setFilters(newFilter);

		SettingsManager.on('theme', onTheme);
		SettingsManager.on('favoriteGroups', onFavoriteGroups);
		SettingsManager.on('firstload', onFirstLoad);
		SettingsManager.on('language', onLanguage);
		SettingsManager.on('filter', onFilter);

		const eventSubscription = AppState.addEventListener('change', onAppStateChange);

		// Les deux declencheurs de la livraison : le demarrage, et le retour au premier plan.
		// Jamais dans le chemin d'un run — `refreshBlueprints` ne leve pas et n'est pas attendue,
		// donc un point de publication en panne ne retarde ni ne casse le demarrage.
		void refreshBlueprints();

		return () => {
			SettingsManager.unsubscribe('theme', onTheme);
			SettingsManager.unsubscribe('favoriteGroups', onFavoriteGroups);
			SettingsManager.unsubscribe('firstload', onFirstLoad);
			SettingsManager.unsubscribe('language', onLanguage);
			SettingsManager.unsubscribe('filter', onFilter);
			eventSubscription.remove();
		};
	}, []);

	const theme = Style.Theme[themeName];
    const customTheme = {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: theme.background || DefaultTheme.colors.background },
    };

	return (
		<View style={{ flex: 1 }}>
			<AppContextProvider value={{ themeName, favoriteGroups, filters }}>
				<StatusBar />
				{isFirstLoad ? <WelcomeScreen /> : (
                    <NavigationContainer theme={customTheme}>
                        <StackNavigator />
                    </NavigationContainer>
                )}
                <ModMenu />

                {/*
                  * Le moteur Aetherius (docs/blueprints.md). Les deux vivent avec l'application, pas
                  * avec un run : la WebView cachee sert tous les Blueprints navigateur
                  * successivement, et le modal doit exister au moment ou une question est posee —
                  * personne qui ecoute veut dire refus immediat.
                  *
                  * La WebView ne cree sa vue native qu'au premier run navigateur, jamais au montage :
                  * le demarrage n'en porte rien.
                  */}
                <AetheriusWebView />
                <AetheriusConfirm
                    approveLabel={Translator.get('CONFIRM')}
                    rejectLabel={Translator.get('CANCEL')}
                />
			</AppContextProvider>
		</View>
	);
};