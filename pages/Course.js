import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Polygon, Svg } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import style, { tokens } from '../Style';
import CourseRow from '../components/CourseRow';
import { getLocations, getLocationsInText } from '../utils';
import { AppContext } from '../utils/DeviceUtils';
import URL from '../utils/URL';

const mapStyle = [
	{
		featureType: 'landscape.man_made',
		elementType: 'geometry.stroke',
		stylers: [
			{
				color: '#ff0000',
			},
		],
	},
	{
		featureType: 'landscape.man_made',
		elementType: 'labels',
		stylers: [
			{
				color: '#ff0000',
			},
		],
	},
	{
		featureType: 'poi',
		elementType: 'labels.text.fill',
		stylers: [
			{
				color: '#000000',
			},
		],
	},
	{
		featureType: 'poi',
		elementType: 'labels.text.stroke',
		stylers: [
			{
				color: '#ffffff',
			},
		],
	},
];

class Course extends React.Component {
	static contextType = AppContext;

	constructor(props) {
		super(props);
		const { data } = this.props.route.params;

		this.state = {
			data,
			locations: [],
		};
	}

	onPressGoogleMaps = () => {
		let link =
			URL.MAP +
			`search/?api=1&query=${this.state.locations[0].lat},${this.state.locations[0].lng}`;
		if (this.state.locations[0].placeID) {
			link =
				URL.MAP +
				`search/?api=1&query=${this.state.locations[0].lat},${this.state.locations[0].lng}&query_place_id=${this.state.locations[0].placeID}`;
		}

		Linking.canOpenURL(link)
			.then((supported) => {
				if (!supported) {
					console.warn("Can't handle url: " + link);
				} else {
					return Linking.openURL(link);
				}
			})
			.catch((err) => console.error('An error occurred', err));
	};

	componentDidMount() {
		let locations = [];
		this.props.navigation.setParams({ title: this.state.data.schedule });

		const descLines = (this.state.data.description ?? '').split('\n');

		const roomLine = descLines[2] ?? '';

		if (roomLine.trim()) {
			locations = getLocations(roomLine.trim());
			if (locations.length < 1) {
				locations = getLocationsInText(roomLine.trim());
			}
		}
		
		if (locations.length < 1) {
			locations = getLocationsInText(this.state.data.subject ?? '');
		}

		if (locations.length > 0) {
			this.setState({ locations });
		}

		console.log('description:', this.state.data.description);
		console.log('locations:', locations);
	}

	render() {
		const themeName = this.context.themeName ?? 'light';
		const theme = style.Theme[themeName];

		let map = null;
		if (this.state.locations.length > 0) {
			map = (
				<View style={{ flex: 1 }}>
					<MapView
						style={{ flex: 1 }}
						provider={MapView.PROVIDER_GOOGLE}
						initialRegion={{
							latitude: this.state.locations[0].lat,
							longitude: this.state.locations[0].lng,
							latitudeDelta: 0.005,
							longitudeDelta: 0.005,
						}}
						customMapStyle={mapStyle}
						showsMyLocationButton={false}
						loadingEnabled={true}
						showsCompass={true}>
						{this.state.locations.map((location, index) => (
							<Marker
								key={index}
								coordinate={{
									latitude: location.lat,
									longitude: location.lng,
								}}>
								{/* Marqueur modernisé */}
								<View
									style={{
										flexDirection: 'column',
										alignItems: 'center',
										paddingBottom: tokens.space.sm,
									}}>
									<View
										style={{
											backgroundColor: theme.primary,
											paddingHorizontal: tokens.space.sm,
											paddingVertical: tokens.space.xs,
											borderRadius: tokens.radius.sm,
											...tokens.shadow.md,
										}}>
										<Text
											style={{
												color: '#FFFFFF',
												fontWeight: tokens.fontWeight.bold,
												fontSize: tokens.fontSize.sm,
											}}>
											{location.title}
										</Text>
									</View>
									<Svg height={10} width={12}>
										<Polygon points="0,0 6,10 12,0" fill={theme.primary} />
									</Svg>
								</View>
							</Marker>
						))}
					</MapView>

					{/* Bouton Google Maps modernisé */}
					<View
						style={{
							position: 'absolute',
							top: tokens.space.sm,
							right: tokens.space.sm,
						}}>
						<TouchableOpacity
							onPress={this.onPressGoogleMaps}
							style={{
								backgroundColor: theme.cardBackground,
								borderRadius: tokens.radius.md,
								padding: tokens.space.sm,
								...tokens.shadow.md,
							}}>
							<MaterialCommunityIcons name="google-maps" size={28} color="#4285F4" />
						</TouchableOpacity>
					</View>
				</View>
			);
		}

		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.greyBackground }}>
				{/* Card du cours */}
				<View
					style={{
						backgroundColor: theme.cardBackground,
						marginHorizontal: tokens.space.md,
						flex: 0,
						// minHeight: 120,
						marginTop: tokens.space.md,
						marginBottom:
							this.state.locations.length > 0 ? tokens.space.sm : tokens.space.md,
						borderRadius: tokens.radius.lg,
						borderWidth: 1,
						borderColor: theme.border,
						...tokens.shadow.sm,
						flexShrink: 0,
						zIndex: 10,
					}}>
					<CourseRow data={this.state.data} theme={theme} readOnly={true} />
				</View>

				{/* Carte */}
				{map && (
					<View
						style={{
							flex: 1,
							marginHorizontal: tokens.space.md,
							marginBottom: tokens.space.md,
							borderRadius: tokens.radius.lg,
							overflow: 'hidden',
							borderWidth: 1,
							borderColor: theme.border,
							...tokens.shadow.sm,
						}}>
						{map}
					</View>
				)}
			</SafeAreaView>
		);
	}
}

export default Course;
