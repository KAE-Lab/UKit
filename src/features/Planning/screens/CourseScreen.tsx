import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { getLocations, getLocationsInText } from '../../../shared/services/AppCore';
import { AppContext } from '../../../shared/services/AppCore';
import { URL } from '../../../shared/constants/urls';
import { withStaticHeader } from '../../../shared/navigation/NavHelpers';
import { CourseData } from '../components/CourseCard';

export interface CourseProps {
	route: { params: { data: CourseData } };
	navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setParams: (params: unknown) => void };
	headerPadding?: import('react-native').ViewStyle;
}

export interface CourseState {
	data: CourseData;
	locations: Record<string, unknown>[];
}

class CourseScreenComponent extends React.Component<CourseProps, CourseState> {
	static contextType = AppContext;
	context!: React.ContextType<typeof AppContext>;

	constructor(props: CourseProps) {
		super(props);
		const { data } = this.props.route.params;

		this.state = {
			data,
			locations: [],
		};
	}

	onPressExternalMap = () => {
		let link = URL.MAP + `search/?api=1&query=${this.state.locations[0].lat},${this.state.locations[0].lng}`;
		Linking.openURL(link).catch((err) => console.error('An error occurred', err));
	};

	componentDidMount() {
		let locations: Record<string, unknown>[] = [];
		this.props.navigation.setParams({ title: this.state.data.UE || Translator.get('DETAILS') });

		// On nettoie les lignes vides
		const descLines = (this.state.data.description ?? '').split('\n').map(l => l.trim()).filter(l => l);

		let roomLine = '';
		// On cherche une ligne de salle potentielle (à partir de la 3ème ligne)
		// On exclut formellement la ligne si elle correspond au format des semaines
		const potentialRooms = descLines.slice(2).filter(line => !/^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(line));

		if (potentialRooms.length > 0) {
			roomLine = potentialRooms[0];
		}

		if (roomLine) {
			locations = getLocations(roomLine);
			if (locations.length < 1) {
				locations = getLocationsInText(roomLine);
			}
		}

		if (locations.length < 1) {
			locations = getLocationsInText(this.state.data.subject ?? '');
		}

		if (locations.length > 0) {
			this.setState({ locations });
		}
	}

	renderMap(theme: import('../../../shared/theme/Theme').AppThemeType) {
		if (this.state.locations.length === 0) return null;

		const centerLat = this.state.locations[0].lat;
		const centerLng = this.state.locations[0].lng;

		// Génération du code Leaflet pour tes marqueurs customisés SVG
		const markersJs = this.state.locations.map((location: Record<string, unknown>) => {
			const title = location.title || Translator.get('ROOM');
			return `
				var iconHTML = \`
					<div style="display: flex; flex-direction: column; align-items: center; padding-bottom: 8px;">
						<div style="background-color: ${theme.primary}; padding: 4px 8px; border-radius: 4px; box-shadow: 0px 4px 6px rgba(0,0,0,0.3);">
							<span style="color: #FFFFFF; font-weight: bold; font-size: 12px; font-family: sans-serif;">
								${title}
							</span>
						</div>
						<svg height="10" width="12" style="margin-top: -1px;">
							<polygon points="0,0 6,10 12,0" fill="${theme.primary}" />
						</svg>
					</div>
				\`;
				var customIcon = L.divIcon({
					className: 'custom-marker',
					html: iconHTML,
					iconSize: [100, 50],
					iconAnchor: [50, 45] // Centre parfaitement la pointe de ta flèche sur les coordonnées
				});
				L.marker([${location.lat}, ${location.lng}], {icon: customIcon}).addTo(map);
			`;
		}).join('\n');

		// Le code HTML complet embarqué dans l'application
		const mapHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
				<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
				<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
				<style>
					body { padding: 0; margin: 0; background-color: ${theme.greyBackground}; }
					html, body, #map { height: 100%; width: 100%; }
					.leaflet-control-attribution { display: none; } /* Cache le texte OpenStreetMap pour un design plus épuré */
				</style>
			</head>
			<body>
				<div id="map"></div>
				<script>
					var map = L.map('map', {zoomControl: false}).setView([${centerLat}, ${centerLng}], 17);
					L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
						maxZoom: 19
					}).addTo(map);
					${markersJs}
				</script>
			</body>
			</html>
		`;

		return (
			<View style={{ flex: 1 }}>
				<WebView
					originWhitelist={['*']}
					source={{ html: mapHtml }}
					style={{ flex: 1, backgroundColor: theme.greyBackground }}
					scrollEnabled={false} // Empêche le webview de scroller, c'est la carte qui prend le relais
					showsVerticalScrollIndicator={false}
					showsHorizontalScrollIndicator={false}
				/>

				<View style={{ position: 'absolute', top: tokens.space.sm, right: tokens.space.sm }}>
					<TouchableOpacity
						onPress={this.onPressExternalMap}
						style={{
							backgroundColor: theme.cardBackground,
							borderRadius: tokens.radius.md,
							padding: tokens.space.sm,
							...tokens.shadow.md as object as object,
						}}>
						<MaterialCommunityIcons name="map-search-outline" size={28} color={theme.accent} />
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	renderCourseAnnotations(theme: import('../../../shared/theme/Theme').AppThemeType) {
		return (this.state.data.description || '').split('\n').map((line, index) => {
			const trimmedLine = line.trim();
			if (!trimmedLine) return null;

			let iconName: 'info-outline' | 'date-range' | 'room' | 'group' | 'person' = 'info-outline';
			const lowerLine = trimmedLine.toLowerCase();

			const isWeeks = /^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(trimmedLine);
			const isRoom = lowerLine.includes('salle') || lowerLine.includes('bât') || lowerLine.includes('bat') || lowerLine.includes('amphi') || lowerLine.includes('cremi');

			if (isWeeks) {
				iconName = 'date-range';
			} else if (isRoom) {
				iconName = 'room';
			} else if (index === 0) {
				iconName = 'group';
			} else if (index === 1) {
				iconName = 'person';
			} else if (index === 2) {
				iconName = 'room';
			} else {
				iconName = 'date-range';
			}

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
					{this.state.data.category !== this.state.data.subject && (
						<View style={{ backgroundColor: `${lineColor}22`, borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.sm, paddingVertical: 2 }}>
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
		const theme = style.Theme[this.context.themeName];
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
