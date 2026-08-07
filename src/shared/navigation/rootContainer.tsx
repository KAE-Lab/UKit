import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AetheriusConfirm, AetheriusWebView } from '@aetherius/react-native';

import StackNavigator from './StackNavigator';
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

		const eventSubscription = AppState.addEventListener('change', reloadData);

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