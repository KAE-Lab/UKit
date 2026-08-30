import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { getLocations, getLocationsInText, lieuxDesSites, ligneDeSalle } from '../../../shared/services/AppCore';
import type { LieuDeCours } from '../../../shared/locations/salles';
import { AppContext } from '../../../shared/services/AppCore';
import { EmbeddedMap } from '../../../shared/map/EmbeddedMap';
import { withStaticHeader } from '../../../shared/navigation/NavHelpers';
import { CourseData } from '../components/CourseCard';
import { iconeDAnnotation } from '../components/CourseAnnotations';

export interface CourseProps {
	route: { params: { data: CourseData } };
	navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setParams: (params: unknown) => void };
	headerPadding?: import('react-native').ViewStyle;
}

export interface CourseState {
	data: CourseData;
	locations: LieuDeCours[];
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

		const locations = this.resoudreLieux();
		if (locations.length > 0) {
			this.setState({ locations });
		}
	}

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
			.filter((location: LieuDeCours) => location.lat !== undefined && location.lng !== undefined)
			.map((location: LieuDeCours) => ({
				lat: location.lat as number,
				lng: location.lng as number,
				title: location.title || Translator.get('ROOM'),
			}));

		if (markers.length === 0) return null;

		return <EmbeddedMap markers={markers} theme={theme} zoom={17} />;
	}

	renderCourseAnnotations(theme: import('../../../shared/theme/Theme').AppThemeType) {
		return (this.state.data.description || '').split('\n').map((line, index) => {
			const trimmedLine = line.trim();
			if (!trimmedLine) return null;

			// L'icone se deduit du contenu de la ligne, jamais de son rang (CourseAnnotations.ts).
			const iconName = iconeDAnnotation(trimmedLine);

			return (
				<View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: tokens.space.xs }}>
					<MaterialIcons name={iconName} size={16} color={theme.fontSecondary} style={{ marginRight: tokens.space.md, marginTop: 1 }} />
					<Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, flex: 1 }}>{trimmedLine}</Text>
				</View>
			);
		});
	}

	renderCourseDetails(theme: import('../../../shared/theme/Theme').AppThemeType, lineColor: string) {
		return (
			<View
				style={{
					flex: 0,
					marginTop: tokens.space.md,
					marginBottom: this.state.locations.length > 0 ? tokens.space.sm : tokens.space.md,
					marginHorizontal: tokens.space.sm,
					backgroundColor: theme.cardBackground,
					borderRadius: tokens.radius.xl,
					borderTopWidth: 5,
					borderTopColor: lineColor,
					borderWidth: 1,
					borderColor: theme.border,
					padding: tokens.space.md,
					...tokens.shadow.sm as object as object,
					zIndex: 10,
				}}>

				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.space.sm }}>
					<Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as never, color: theme.font, flex: 1, marginRight: tokens.space.md }}>
						{this.state.data.subject !== 'N/C' ? this.state.data.subject.trim() : Translator.get('UNKNOWN_SUBJECT')}
					</Text>
					{this.state.data.category !== '' && this.state.data.category !== this.state.data.subject && (
						<View style={{ backgroundColor: `${lineColor}22`, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xxs }}>
							<Text style={{ fontSize: tokens.fontSize.xs, color: lineColor, fontWeight: tokens.fontWeight.bold as never }}>
								{this.state.data.category}
							</Text>
						</View>
					)}
				</View>

				<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
					<MaterialCommunityIcons name="clock-outline" size={18} color={lineColor} style={{ marginRight: tokens.space.sm }} />
					<Text style={{ fontSize: tokens.fontSize.sm, color: lineColor, fontWeight: tokens.fontWeight.semibold as never }}>
						{this.state.data.starttime} - {this.state.data.endtime}
					</Text>
				</View>

				<View style={{ height: 1, backgroundColor: theme.border, marginBottom: tokens.space.sm }} />

				{this.state.data.UE && (
					<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
						<MaterialIcons name="code" size={16} color={theme.fontSecondary} style={{ marginRight: tokens.space.md }} />
						<Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, fontWeight: '600' }}>{this.state.data.UE}</Text>
					</View>
				)}

				{this.renderCourseAnnotations(theme)}
			</View>
		);
	}

	render() {
		const theme = style.Theme[this.app.themeName];
		const lineColor = theme.courses[this.state.data.color ?? 'default'] ?? theme.courses.default;

		const map = this.renderMap(theme);
		const courseDetails = this.renderCourseDetails(theme, lineColor);

		return (
			<SafeAreaView
				edges={['bottom', 'left', 'right']}
				style={[{ flex: 1, backgroundColor: theme.courseBackground }, this.props.headerPadding]}
			>
				{/* ── CARTE DE DÉTAILS DÉDIÉE ── */}
				{courseDetails}

				{/* ── CARTE GÉOGRAPHIQUE ── */}
				{map && (
					<View
						style={{
							flex: 1,
							marginHorizontal: tokens.space.sm,
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
