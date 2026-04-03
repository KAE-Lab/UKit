import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import Drawer from './Drawer';
import { AppContextProvider } from '../services/AppCore';
import { SettingsManager } from '../services/AppCore';
import WelcomeScreen from '../../features/Onboarding/WelcomeScreen'; 
import Style from '../theme/Theme';
import { StatusBar, UpdateAlert } from '../ui/AppUI';

export default (props) => {
	const [isFirstLoad, setFirstLoad] = useState(SettingsManager.isFirstLoad());
	const [themeName, setThemeName] = useState(SettingsManager.getTheme());
	const [favoriteGroups, setFavoriteGroups] = useState(SettingsManager.getFavoriteGroups());
	const [language, setLanguage] = useState(SettingsManager.getLanguage());
	const [filters, setFilters] = useState(SettingsManager.getFilters());

	function reloadData() {
		SettingsManager.loadCalendars();
	}

	useEffect(() => {
		SettingsManager.on('theme', (newTheme) => setThemeName(newTheme));
		SettingsManager.on('favoriteGroups', (newGroups) => setFavoriteGroups(newGroups));
		SettingsManager.on('firstload', (newFistLoad) => setFirstLoad(newFistLoad));
		SettingsManager.on('language', (newLang) => setLanguage(newLang));
		SettingsManager.on('filter', (newFilter) => setFilters(newFilter));

		const eventSubscription = AppState.addEventListener('change', reloadData);

		return () => eventSubscription.remove();
	}, []);

	const theme = Style.Theme[themeName];

	return (
		<View style={{ flex: 1 }}>
			<AppContextProvider value={{ themeName, favoriteGroups, filters }}>
				<StatusBar />
				{isFirstLoad ? <WelcomeScreen /> : <Drawer background={theme.background} />}
			</AppContextProvider>
		</View>
	);
};