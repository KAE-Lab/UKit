import React from 'react';
import { Linking, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// `/legacy`, jamais la racine : ses souches levent a l'appel (shared/services/CalendarSyncHelpers.ts).
import * as Calendar from 'expo-calendar/legacy';
import * as Location from 'expo-location';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { getLocations, getLocationsInText, lieuxDesSites, ligneDeSalle } from '../../../shared/services/AppCore';
import type { LieuDeCours } from '../../../shared/locations/salles';
import { AppContext } from '../../../shared/services/AppCore';
import { EmbeddedMap } from '../../../shared/map/EmbeddedMap';
import { lienVersLePlan } from '../../../shared/map/lienVersLePlan';
import { withStaticHeader } from '../../../shared/navigation/NavHelpers';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import { CourseData } from '../components/CourseCard';
import { couleurDeCours, encreDeCours } from '../services/couleurDeCours';
import { FicheDuCours } from '../components/FicheDuCours';

export interface CourseProps {
	route: { params: { data: CourseData } };
	navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setParams: (params: unknown) => void };
	headerPadding?: import('react-native').ViewStyle;
}

/** Ce que la carte demande d'un lieu : un nom et des coordonnees. Un batiment du referentiel en est un. */
type PointNomme = Pick<LieuDeCours, 'title' | 'lat' | 'lng'>;

export interface CourseState {
	data: CourseData;
	locations: PointNomme[];
}

class CourseScreenComponent extends React.Component<CourseProps, CourseState> {
	static contextType = AppContext;
	/**
	 * Le contexte applicatif, type.
	 *
	 * `React.Component` declare `context: unknown` et `contextType` en fournit la **valeur**, pas le
	 * type. Redeclarer le champ ici l'**ecraserait** (TS2612), et le `declare` que TypeScript
	 * recommande est refuse par la couche Flow du preset Babel de React Native : l'application ne
	 * bundlerait plus. Un accesseur donne le meme confort sans toucher a la chaine de build.
	 */
	private get app(): React.ContextType<typeof AppContext> {
	    return this.context as React.ContextType<typeof AppContext>;
	}

	constructor(props: CourseProps) {
		super(props);
		const { data } = this.props.route.params;

		this.state = {
			data,
			locations: [],
		};
	}

	componentDidMount() {
		this.props.navigation.setParams({ title: this.state.data.UE || Translator.get('DETAILS') });

		// Pas de resolution contre le referentiel pour un evenement du telephone : « Chez Marie »
		// matcherait un batiment (6.1.x-D). Son lieu se situe par le geocodeur du systeme (6.2.x).
		if (this.duTelephone()) {
			void this.situerLeLieu();
			return;
		}
		const locations = this.resoudreLieux();
		if (locations.length > 0) {
			this.setState({ locations });
		}
	}

	duTelephone(): boolean {
		return this.state.data.source === 'telephone';
	}

	/** L'agenda du systeme, sur cette occurrence : les recurrents partagent leur identifiant sur iOS. */
	ouvrirDansCalendrier = async () => {
		const { idTelephone, date } = this.state.data;
		if (!idTelephone) return;
		try {
			await Calendar.openEventInCalendarAsync({ id: idTelephone, instanceStartDate: date.start });
		} catch {
			new ErrorAlert(Translator.get('OPEN_IN_CALENDAR_FAILED')).show();
		}
	};

	/**
	 * Le lieu d'un rendez-vous, situe par le geocodeur du **systeme** — celui de l'application de plans
	 * du telephone, pas un service tiers de l'application — pour la meme carte que celle d'un cours.
	 * Android exige la permission de localisation pour geocoder : on ne la demande pas pour ca, on
	 * l'utilise si le Campus l'a deja obtenue. Sans coordonnees — lieu introuvable, hors ligne, pas
	 * de permission — la fiche garde le bouton « S'y rendre », qui ouvre les plans sur le texte.
	 */
	situerLeLieu = async () => {
		const { lieu } = this.state.data;
		if (!lieu) return;
		try {
			if (Platform.OS === 'android' && (await Location.getForegroundPermissionsAsync()).status !== 'granted') return;
			const [point] = await Location.geocodeAsync(lieu);
			if (point !== undefined) this.setState({ locations: [{ title: lieu, lat: point.latitude, lng: point.longitude }] });
		} catch {
			// Sans carte : le bouton reste, et rien ne casse.
		}
	};

	/** L'application de plans du systeme, sur le lieu tel qu'il a ete ecrit, quand aucune carte n'a pu le situer. */
	ouvrirLePlan = () => {
		const { lieu } = this.state.data;
		if (!lieu) return;
		Linking.openURL(lienVersLePlan({ adresse: lieu })).catch(() => {
			new ErrorAlert(Translator.get('GETTING_THERE_FAILED')).show();
		});
	};

	/**
	 * Ou se donne ce cours : la donnee d'abord, l'heuristique ensuite.
	 *
	 * Celcat **declare** ses batiments (`sites`), et c'est ce qu'on lit en premier depuis qu'on
	 * l'extrait. Tout ce qui suit est du devinement dans du texte libre, et il rendait deux cours sans
	 * carte le meme jour : l'un vu depuis la semaine, dont la description etait vide, l'autre dont une
	 * double espace dans `modules` decalait le rang de la ligne de salle d'un cran — la « salle »
	 * devenait le nom de l'enseignant, silencieusement.
	 *
	 * Les trois replis restent, et ils servent : un evenement iCalendar n'a pas de `sites`, et les
	 * caches ecrits avant ce champ n'en portent pas non plus.
	 */
	resoudreLieux(): LieuDeCours[] {
		const declares = lieuxDesSites(this.state.data.sites);
		if (declares.length > 0) return declares;

		// La ligne susceptible de porter une salle, et le rang auquel la chercher, sont une donnee
		// d'etablissement depuis le jalon 6-I : une description Celcat porte la salle a partir de la
		// troisieme ligne, un evenement iCalendar la tient d'un champ separe remis en tete.
		const roomLine = ligneDeSalle(this.state.data.description ?? '');
		if (roomLine) {
			const parLibelle = getLocations(roomLine);
			if (parLibelle.length > 0) return parLibelle;

			const dansLeTexte = getLocationsInText(roomLine);
			if (dansLeTexte.length > 0) return dansLeTexte;
		}

		return getLocationsInText(this.state.data.subject ?? '');
	}

	renderMap(theme: import('../../../shared/theme/Theme').AppThemeType) {
		if (this.state.locations.length === 0) return null;

		// Le rendu de carte vit dans `shared/map/EmbeddedMap` : la fiche ne fournit que ses marqueurs.
		// Un lieu du referentiel peut ne pas porter de coordonnees ; il ne fait alors pas de marqueur —
		// l'ancien code l'interpolait en `undefined` dans le HTML, et la carte echouait en silence.
		const markers = this.state.locations
			.filter((location: PointNomme) => location.lat !== undefined && location.lng !== undefined)
			.map((location: PointNomme) => ({
				lat: location.lat as number,
				lng: location.lng as number,
				title: location.title || Translator.get('ROOM'),
			}));

		if (markers.length === 0) return null;

		return <EmbeddedMap markers={markers} theme={theme} zoom={17} />;
	}

	/** Les gestes d'un evenement du telephone : on lit, on ouvre l'editeur du systeme, on ne modifie rien (6.1.x-D). */
	renderActions(theme: import('../../../shared/theme/Theme').AppThemeType) {
		if (!this.duTelephone()) return null;
		return (
			<>
				<ActionButton
					theme={theme}
					variant="tonal"
					label={Translator.get('OPEN_IN_CALENDAR')}
					icon={{ name: 'calendar-export' }}
					onPress={this.ouvrirDansCalendrier}
					style={{ marginTop: tokens.space.sm }}
				/>
				{/* Seulement sans carte : situee, la carte porte deja son bouton vers les plans. Empile sous le
				    premier, pas a cote : deux libelles avec icone ne tiennent pas sur 360 dp. */}
				{this.state.data.lieu && this.state.locations.length === 0 && (
					<ActionButton
						theme={theme}
						variant="tonal"
						label={Translator.get('GETTING_THERE')}
						icon={{ name: 'map-marker-radius' }}
						onPress={this.ouvrirLePlan}
						style={{ marginTop: tokens.space.sm }}
					/>
				)}
			</>
		);
	}

	render() {
		const theme = style.Theme[this.app.themeName];
		const couleur = couleurDeCours(theme.courses, this.state.data.color);

		const map = this.renderMap(theme);

		return (
			<SafeAreaView
				edges={['bottom', 'left', 'right']}
				style={[{ flex: 1, backgroundColor: theme.courseBackground }, this.props.headerPadding]}
			>
				<FicheDuCours
					data={this.state.data}
					theme={theme}
					couleur={couleur}
					encre={encreDeCours(couleur, theme.cardBackground)}
					actions={this.renderActions(theme)}
				/>

				{/* ── CARTE GÉOGRAPHIQUE ── */}
				{map && (
					<View
						style={{
							flex: 1,
							marginHorizontal: tokens.space.md,
							marginTop: tokens.space.md,
							marginBottom: tokens.space.md,
							borderRadius: tokens.radius.xl,
							overflow: 'hidden',
							borderWidth: 1,
							borderColor: theme.border,
							...tokens.shadow.sm as object as object,
						}}>
						{map}
					</View>
				)}
			</SafeAreaView>
		);
	}
}

export const CourseScreen = withStaticHeader(CourseScreenComponent);
