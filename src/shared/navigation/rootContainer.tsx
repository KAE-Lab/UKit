import React, { useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AetheriusConfirm, AetheriusWebView } from '@aetherius/react-native';

import StackNavigator from './StackNavigator';
import { CredentialsProvider } from '../../features/Scolarite/services/CredentialsContext';
import { PropositionsModal } from '../../features/Scolarite/components/PropositionsModal';
import { refreshBlueprints } from '../aetherius';
import { rafraichirSalutations } from '../../features/Scolarite/salutations';
import { refreshBuildings } from '../locations';
import { refreshVisuels } from '../visuels';
import { refreshEtablissements } from '../etablissements';
import { rafraichirMessages } from '../messages';
import { MessagesDeServiceHote } from '../messages/MessagesDeServiceHote';
import { AppContextProvider } from '../services/AppCore';
import { onRetourAuPremierPlan } from '../services/premierPlan';
import { marquer } from '../services/Chrono';
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
	/*
	 * La date simulee du menu developpeur.
	 *
	 * Meme motif que la langue juste au-dessus : seul le setter sert. Le poser reprovoque un rendu de
	 * toute l'application, ce qui fait relire l'heure a tout ce qui en depend — la salutation de
	 * l'onglet Scolarite, les etats « ouvert / ferme », les bornes de semaine.
	 *
	 * Sans lui, `DayView` etait **le seul** ecran a s'abonner a la simulation : changer la date y
	 * fonctionnait et nulle part ailleurs, ce qui donnait l'impression que le mock ne marchait que
	 * pour certains etablissements (signale le 2026-08-29). L'abonnement local de `DayView` reste : il
	 * fait plus que rendre a nouveau, il recharge sa journee.
	 */
	const [, setInstantSimule] = useState(0);
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
	 * Les six rafraichissements de donnee publiee, aux deux declencheurs : le demarrage, et le retour
	 * au premier plan — le vrai, apres un passage en arriere-plan (shared/services/premierPlan). Ils
	 * partaient sur **tout** passage a `active`, donc aussi apres un centre de controle tire ou une
	 * invite systeme : six requetes pour rien (6.1-C).
	 *
	 * Jamais dans le chemin d'un run ni d'un rendu — aucune des six ne leve, aucune n'est attendue,
	 * donc un point de publication en panne ne retarde ni ne casse le demarrage. Le socle embarque a
	 * deja repondu avant que ces requetes ne partent. Les visuels n'en ont pas, de socle : sans
	 * surcouche, les images restent celles que les sources publient.
	 */
	function rafraichirLaDonneePubliee() {
		void refreshBlueprints();
		void refreshBuildings();
		void refreshVisuels();
		rafraichirCatalogue();
		// La cinquieme, et la plus legere : quelques lignes qui decident du mot en haut de l'onglet
		// Scolarite. Elle suit la langue, parce que les messages publies ne passent pas par
		// `Translator` — ils portent leur propre table par langue.
		void rafraichirSalutations(SettingsManager.getLanguage());
		// La sixieme (jalon 6.1-B) : les messages de service, precedes du statut de testeur qui
		// decide de ce qu'ils laissent voir. Sans socle, comme les visuels — un message de service
		// est par nature ce qu'on ne connaissait pas a la construction du binaire.
		void rafraichirMessages();
	}

	/** `reloadData` se declenche sur **toutes** les transitions, comme depuis toujours. */
	function onAppStateChange() {
		reloadData();
	}

	useEffect(() => {
		marquer('conteneur racine monte');
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
		// **Rattraper ce qui a change avant l'abonnement** (7-J). React joue les effets des enfants
		// avant ceux du parent : au premier lancement, l'accueil pose le theme et la langue du
		// telephone avant que cet effet ne s'abonne, et l'evenement se perdait. La racine restait en
		// clair sous un accueil sombre — la barre de statut avec elle, heure noire sur fond noir
		// (defauts-fonctionnels.md, constate le 2026-11-04, cause etablie le 2026-11-05).
		setThemeName(SettingsManager.getTheme());
		setLanguage(SettingsManager.getLanguage());

		const eventSubscription = AppState.addEventListener('change', onAppStateChange);
		const desabonnerRetour = onRetourAuPremierPlan(rafraichirLaDonneePubliee);
		const abonnementTemps = DeviceEventEmitter.addListener(
			'timeMockChanged',
			() => setInstantSimule((revision) => revision + 1),
		);

		rafraichirLaDonneePubliee();

		return () => {
			SettingsManager.unsubscribe('theme', onTheme);
			SettingsManager.unsubscribe('favoriteGroups', onFavoriteGroups);
			SettingsManager.unsubscribe('firstload', onFirstLoad);
			SettingsManager.unsubscribe('language', onLanguage);
			SettingsManager.unsubscribe('filter', onFilter);
			SettingsManager.unsubscribe('etablissement', onEtablissement);
			eventSubscription.remove();
			desabonnerRetour();
			abonnementTemps.remove();
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
                {/*
                  * Les messages de service (jalon 6.1-B), pour la meme raison que la modale
                  * ci-dessus : un bandeau ou une feuille doit pouvoir apparaitre au-dessus de
                  * n'importe quel ecran, au moment ou une lecture aboutit. Inactif pendant l'accueil,
                  * qui ne doit pas etre interrompu et n'a pas encore d'etablissement.
                  */}
                <MessagesDeServiceHote actif={!isFirstLoad} />
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
                <WebViewDuMoteur />
                <AetheriusConfirm
                    approveLabel={Translator.get('CONFIRM')}
                    rejectLabel={Translator.get('CANCEL')}
                />
			</AppContextProvider>
		</View>
	);
};

/**
 * La WebView du moteur, retiree des lecteurs d'ecran sans etre deplacee.
 *
 * Elle est posee par-dessus l'application, transparente — le paquet explique pourquoi elle ne peut
 * etre ni derriere ni hors de l'ecran — et ses pages, la boite de reception ou Moodle, etaient dans
 * l'arbre d'accessibilite (audit du lot 1, 2026-11-10). L'enveloppe couvre la fenetre a la meme
 * origine que son conteneur et ne prend aucun toucher.
 */
function WebViewDuMoteur() {
    return (
        // `collapsable={false}` : sans lui, la nouvelle architecture aplatit une vue qui ne dessine rien,
        // et l'interdiction d'accessibilite disparaissait avec elle (constate au banc le 2026-11-10).
        <View
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            collapsable={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
        >
            <AetheriusWebView />
        </View>
    );
}
