import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AetheriusConfirm, AetheriusWebView } from '@aetherius/react-native';

import StackNavigator from './StackNavigator';
import { CredentialsProvider } from '../../features/Scolarite/services/CredentialsContext';
import { PropositionsModal } from '../../features/Scolarite/components/PropositionsModal';
import { refreshBlueprints } from '../aetherius';
import { refreshBuildings } from '../locations';
import { refreshVisuels } from '../visuels';
import { refreshEtablissements } from '../etablissements';
import { AppContextProvider } from '../services/AppCore';
import { SettingsManager } from '../services/AppCore';
import WelcomeScreen from '../../features/Onboarding/WelcomeScreen';
import Style from '../theme/Theme';
import Translator from '../i18n/Translator';
import { StatusBar } from '../ui/AppUI';
import ModMenu from '../ui/ModMenu';

export default function RootContainer() {
	const [isFirstLoad, setFirstLoad] = useState(SettingsManager.isFirstLoad());
	const [themeName, setThemeName] = useState(SettingsManager.getTheme());
	const [favoriteGroups, setFavoriteGroups] = useState(SettingsManager.getFavoriteGroups());
	// Seul le setter sert : la valeur n'est pas lue, mais la poser reprovoque un rendu quand la
	// langue change, ce qui reevalue tous les libelles traduits.
	const [, setLanguage] = useState(SettingsManager.getLanguage());
	const [filters, setFilters] = useState(SettingsManager.getFilters());
	const [etablissement, setEtablissement] = useState(SettingsManager.getEtablissement());
	const [catalogue, setCatalogue] = useState(0);

	/**
	 * Le catalogue publie, et un rendu **seulement** s'il a change.
	 *
	 * Bousculer le compteur a chaque retour au premier plan repeindrait toute l'application pour
	 * rien ; ne jamais le bousculer laissait un etablissement retire invisible jusqu'au premier geste
	 * qui provoquait un rendu par ailleurs — mesure sur appareil au jalon 6-G.
	 */
	function rafraichirCatalogue() {
		void refreshEtablissements().then((rapport) => {
			if (rapport.change === true) setCatalogue((revision) => revision + 1);
		});
	}

	function reloadData() {
		SettingsManager.loadCalendars();
	}

	/**
	 * Le retour au premier plan, et lui seul.
	 *
	 * `reloadData` se declenche sur **toutes** les transitions et continue de le faire — c'est son
	 * comportement depuis toujours. Les quatre rafraichissements de donnee publiee, eux, n'ont de sens
	 * qu'au retour : les declencher en passant en arriere-plan ferait des requetes que personne ne
	 * regarde.
	 */
	function onAppStateChange(nextAppState) {
		reloadData();
		if (nextAppState === 'active') {
			void refreshBlueprints();
			void refreshBuildings();
			void refreshVisuels();
			rafraichirCatalogue();
		}
	}

	useEffect(() => {
		const onTheme = (newTheme) => setThemeName(newTheme);
		const onFavoriteGroups = (newGroups) => setFavoriteGroups(newGroups);
		const onFirstLoad = (newFirstLoad) => setFirstLoad(newFirstLoad);
		const onLanguage = (newLang) => setLanguage(newLang);
		const onFilter = (newFilter) => setFilters(newFilter);
		// Sans cet abonnement, un ecran deja monte ne saurait jamais que l'etablissement a change :
		// la section des salles libres restait masquee apres un retour a Bordeaux, et le tableau de
		// bord n'avait aucune raison de rendre a nouveau (constate sur appareil, jalon 6-G).
		const onEtablissement = (code) => setEtablissement(code);

		SettingsManager.on('theme', onTheme);
		SettingsManager.on('favoriteGroups', onFavoriteGroups);
		SettingsManager.on('firstload', onFirstLoad);
		SettingsManager.on('language', onLanguage);
		SettingsManager.on('filter', onFilter);
		SettingsManager.on('etablissement', onEtablissement);

		const eventSubscription = AppState.addEventListener('change', onAppStateChange);

		// Les deux declencheurs de la donnee publiee : le demarrage, et le retour au premier plan.
		// Jamais dans le chemin d'un run ni d'un rendu — aucune des quatre ne leve, aucune n'est
		// attendue, donc un point de publication en panne ne retarde ni ne casse le demarrage. Le
		// socle embarque a deja repondu avant que ces requetes ne partent. Les visuels n'en ont pas,
		// de socle : sans surcouche, les images restent celles que les sources publient.
		void refreshBlueprints();
		void refreshBuildings();
		void refreshVisuels();
		rafraichirCatalogue();

		return () => {
			SettingsManager.unsubscribe('theme', onTheme);
			SettingsManager.unsubscribe('favoriteGroups', onFavoriteGroups);
			SettingsManager.unsubscribe('firstload', onFirstLoad);
			SettingsManager.unsubscribe('language', onLanguage);
			SettingsManager.unsubscribe('filter', onFilter);
			SettingsManager.unsubscribe('etablissement', onEtablissement);
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
			<AppContextProvider value={{ themeName, favoriteGroups, filters, etablissement, catalogue }}>
				<StatusBar />
                {/*
                  * La session universitaire enveloppe **les deux** branches depuis le jalon 6-J.
                  * Elle vivait dans `StackNavigator`, ce qui allait tant que le compte ne se demandait
                  * qu'une fois l'application ouverte ; l'accueil le propose desormais, et il est rendu
                  * a la place de la navigation. Sans cette remontee, l'accueil aurait eu besoin de son
                  * propre formulaire de connexion — un second chemin vers le trousseau, c'est-a-dire
                  * exactement ce que le contexte existe pour ne pas avoir.
                  *
                  * Le provider ne touche a aucune navigation : il ne lit que `AppState`, le trousseau
                  * et les reglages. La remontee est donc sans effet sur ce qu'il fait deja.
                  */}
                <CredentialsProvider>
                    {isFirstLoad ? <WelcomeScreen /> : (
                        <NavigationContainer theme={customTheme}>
                            <StackNavigator />
                        </NavigationContainer>
                    )}
                    {/*
                      * Ce que la connexion universitaire a trouve, et qu'elle propose d'appliquer.
                      * Rendue ici plutot que dans un ecran pour deux raisons : elle doit pouvoir
                      * apparaitre **pendant** le parcours d'accueil, qui remplace la navigation, et
                      * elle attend un moment qui n'appartient a aucun ecran — celui ou le planning du
                      * groupe choisi a livre ses UE. Elle ne rend rien tant qu'il n'y a rien a
                      * demander (features/Scolarite/services/PropositionsDecision.ts).
                      */}
                    <PropositionsModal />
                </CredentialsProvider>
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