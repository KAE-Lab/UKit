import React from 'react';
import { Linking, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Polygon, Svg } from 'react-native-svg';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-root-toast';
import * as Calendar from 'expo-calendar';
import { useNavigation } from '@react-navigation/native';

import style, { tokens } from '../../shared/theme/Theme';

import Translator from '../../../utils/translator';
import { getLocations, getLocationsInText } from '../../../utils';
import { AppContext } from '../../../utils/DeviceUtils';
import URL from '../../../utils/URL';

// ── MODALE D'AJOUT AU CALENDRIER ─────────────────────────────────────────
export class CalendarNewEventPrompt extends React.Component {
	constructor(props) {
		super(props);
	}

	closePopup = () => this.props.closePopup();

	openPopup = () => this.props.openPopup();

	getCalendarPermissions = async () => {
		const { granted } = await Calendar.getCalendarPermissionsAsync();
		return granted;
	};

	askCalendarPermissions = async () => {
		if (!(await this.getCalendarPermissions())) {
			await Calendar.requestCalendarPermissionsAsync();
		}
	};

	getCalendarId = async () => {
		if (Platform.OS === 'ios') {
			const calendar = await Calendar.getDefaultCalendarAsync();
			return calendar.id;
		} else {
			let id = null;
			const calendars = await Calendar.getCalendarsAsync();
			for (const calendar of calendars) {
				if (calendar.isPrimary) {
					id = calendar.id;
					break;
				}
			}
			if (!id) {
				const calendar = calendars.shift();
				if (calendar) id = calendar.id;
			}
			return id;
		}
	};

	addCalendarEventWithPermissions = async () => {
		try {
			const calendarId = await this.getCalendarId();
			const details = {
				title: this.props.data.subject,
				startDate: new Date(this.props.data.date.start),
				endDate: new Date(this.props.data.date.end),
				timeZone: 'Europe/Paris',
				endTimeZone: 'Europe/Paris',
				notes: this.props.data.schedule + '\n' + this.props.data.description,
			};
			await Calendar.createEventAsync(calendarId, details);
			Toast.show(Translator.get('ADD_TO_CALENDAR_DONE'), {
				duration: Toast.durations.LONG,
				position: Toast.positions.BOTTOM,
			});
		} catch (error) {
			console.warn(error);
			Toast.show(Translator.get('ERROR_WITH_MESSAGE', "Couldn't add event to calendar"), {
				duration: Toast.durations.LONG,
				position: Toast.positions.BOTTOM,
			});
		}
	};

	addCalendarEvent = async () => {
		if (!(await this.getCalendarPermissions())) {
			await this.askCalendarPermissions();
			if (await this.getCalendarPermissions()) {
				await this.addCalendarEventWithPermissions();
				this.closePopup();
			} else {
				this.closePopup();
				Toast.show(Translator.get('ADD_TO_CALENDAR_PERMISSIONS'), {
					duration: Toast.durations.LONG,
					position: Toast.positions.BOTTOM,
				});
			}
		} else {
			await this.addCalendarEventWithPermissions();
			this.closePopup();
		}
	};

	render() {
		const theme = this.props.theme.settings;
		return (
			<Modal
				animationType="fade"
				transparent={true}
				visible={this.props.popupVisible}
				onRequestClose={this.closePopup}>
				<TouchableWithoutFeedback onPress={this.closePopup} accessible={false}>
					<View style={theme.popup.background}>
						<TouchableWithoutFeedback accessible={false}>
							<View style={theme.popup.container}>
								<View style={theme.popup.header}>
									<Text style={theme.popup.textHeader}>
										{Translator.get('ADD_TO_CALENDAR').toUpperCase()}
									</Text>
								</View>
								<Text style={theme.popup.textDescription}>
									{Translator.get(
										'ADD_TO_CALENDAR_DESCRIPTION',
										this.props.data.subject,
									)}
								</Text>
								<View style={theme.popup.buttonContainer}>
									<TouchableOpacity
										style={theme.popup.buttonSecondary}
										onPress={this.closePopup}>
										<Text style={theme.popup.buttonTextSecondary}>
											{Translator.get('CANCEL')}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={theme.popup.buttonMain}
										onPress={this.addCalendarEvent}>
										<Text style={theme.popup.buttonTextMain}>
											{Translator.get('CONFIRM')}
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	}
}

// ── COMPOSANT LIGNE DE COURS ─────────────────────────────
class CourseRow extends React.Component {
	constructor(props) {
		super(props);
		const lineColor = props.theme.courses[props.data?.color] ?? props.theme.courses.default;

		this.state = {
			backgroundColor: props.theme.eventBackground,
			borderColor: props.theme.eventBorder,
			lineColor,
			popupVisible: false,
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const lineColor =
			nextProps.theme.courses[nextProps.data?.color] ?? nextProps.theme.courses.default;

		const backgroundColor = nextProps.theme.eventBackground;
		const borderColor = nextProps.theme.eventBorder;

		if (
			lineColor !== prevState.lineColor ||
			backgroundColor !== prevState.backgroundColor ||
			borderColor !== prevState.borderColor
		) {
			return { lineColor, backgroundColor, borderColor };
		}

		return null;
	}

	closePopup = () => this.setState({ popupVisible: false });
	openPopup = () => this.setState({ popupVisible: true });

	_onPress = () => {
		if (!this.props.navigation) return;
		requestAnimationFrame(() => {
			this.props.navigation.navigate('Course', { data: this.props.data });
		});
	};

	render() {
		const { theme } = this.props;

		// ── Pas de cours ──────────────────────────────────────────────
		if (this.props.data.category === 'nocourse') {
			return (
				<View style={style.schedule.course.noCourse}>
					<MaterialCommunityIcons
						name="calendar-blank-outline"
						size={36}
						color={theme.fontSecondary}
						style={{ opacity: 0.4, marginBottom: tokens.space.sm }}
					/>
					<Text
						style={[
							style.schedule.course.noCourseText,
							{ color: theme.fontSecondary },
						]}>
						{Translator.get('NO_CLASS_THIS_DAY')}
					</Text>
				</View>
			);
		}

		if (this.props.data.category === 'masked') {
			return null;
		}

		const isLargeMode = this.props.readOnly === true;

		// ── UE ────────────────────────────────────────────────────────
		const ue = this.props.data.UE ? (
			<View style={[style.schedule.course.line, { alignItems: 'center' }]}>
				<MaterialIcons
					name="code"
					size={14}
					color={theme.fontSecondary}
					style={{ marginRight: tokens.space.xs }}
				/>
				<Text
					style={{
						fontSize: tokens.fontSize.xs,
						color: theme.fontSecondary,
						fontWeight: tokens.fontWeight.medium,
					}}>
					{this.props.data.UE}
				</Text>
			</View>
		) : null;

		// ── Sujet ─────────────────────────────────────────────────────
		const subject =
			this.props.data.subject !== 'N/C' ? (
				<Text style={[style.schedule.course.title, { color: theme.font, flex: 1 }]}>
					{this.props.data.subject}
				</Text>
			) : null;

		// ── Annotations ───────────────────────────────────────────────
		const annotations =
			!isLargeMode && this.props.data.description?.length > 0
				? this.props.data.description.split('\n').map((annotation, index) => {
						if (!annotation.trim()) return null;

						let iconName = 'info-outline';
						if (index === 0) iconName = 'group';
						else if (index === 1) iconName = 'person';
						else if (index === 2) iconName = 'room';
						else if (index === 3) iconName = 'date-range';

						return (
							<View
								key={index}
								style={[
									style.schedule.course.line,
									{ alignItems: 'flex-start', marginTop: tokens.space.xs },
								]}>
								<MaterialIcons
									name={iconName}
									size={12}
									color={theme.fontSecondary}
									style={{ marginRight: tokens.space.xs, marginTop: 1 }}
								/>
								<Text
									style={{
										fontSize: tokens.fontSize.xs,
										color: theme.fontSecondary,
										flex: 1,
									}}>
									{annotation.trim()}
								</Text>
							</View>
						);
				  })
				: null;

		// ── Carte du cours ────────────────────────────────────────────
		const content = (
			<View
				style={[
					style.schedule.course.root,
					{
						flex: 0,
						minHeight: 120,
						backgroundColor: this.state.backgroundColor,
						marginHorizontal: tokens.space.md,
						marginVertical: tokens.space.xs,
						borderRadius: tokens.radius.lg,
						borderLeftWidth: 4,
						borderLeftColor: this.state.lineColor,
						borderWidth: 1,
						borderColor: this.state.borderColor,
						overflow: 'hidden',
						...tokens.shadow.sm,
					},
				]}>
				<View style={style.schedule.course.row}>
					{/* ── Colonne heures ──────────────────────────────── */}
					<View
						style={[
							style.schedule.course.hours,
							{
								backgroundColor: `${this.state.lineColor}18`,
								borderRightWidth: 1,
								borderRightColor: `${this.state.lineColor}44`,
							},
						]}>
						<Text style={[style.schedule.course.hoursText, { color: theme.font }]}>
							{this.props.data.starttime}
						</Text>
						<View
							style={{
								width: 4,
								height: 4,
								borderRadius: tokens.radius.pill,
								backgroundColor: this.state.lineColor,
								opacity: 0.6,
								marginVertical: tokens.space.xs,
							}}
						/>
						<Text
							style={[
								style.schedule.course.hoursText,
								{ color: theme.fontSecondary },
							]}>
							{this.props.data.endtime}
						</Text>
					</View>

					{/* ── Contenu ─────────────────────────────────────── */}
					<View
						style={[style.schedule.course.contentBlock, { padding: tokens.space.sm }]}>
						{/* Titre + catégorie */}
						<View style={style.schedule.course.contentType}>
							{subject}
							{this.props.data.category !== this.props.data.subject && (
								<View
									style={{
										backgroundColor: `${this.state.lineColor}22`,
										borderRadius: tokens.radius.pill,
										paddingHorizontal: tokens.space.sm,
										paddingVertical: 2,
										marginLeft: tokens.space.xs,
									}}>
									<Text
										style={{
											fontSize: tokens.fontSize.xs,
											color: this.state.lineColor,
											fontWeight: tokens.fontWeight.semibold,
										}}>
										{this.props.data.category}
									</Text>
								</View>
							)}
						</View>

						{ue}

						{isLargeMode && (
							<View style={{ marginTop: tokens.space.sm }}>
								{(this.props.data.description || '')
									.split('\n')
									.map((line, index) => {
										if (!line.trim()) return null;

										let iconName = 'info-outline';
										if (index === 0) iconName = 'group';
										else if (index === 1) iconName = 'person';
										else if (index === 2) iconName = 'room';
										else if (index === 3) iconName = 'date-range';

										return (
											<View
												key={index}
												style={[
													style.schedule.course.line,
													{ alignItems: 'flex-start' },
												]}>
												<MaterialIcons
													name={iconName}
													size={14}
													color={theme.fontSecondary}
													style={{
														marginRight: tokens.space.xs,
														marginTop: 2,
													}}
												/>
												<Text
													style={{
														fontSize: tokens.fontSize.sm,
														color: theme.fontSecondary,
														flex: 1,
													}}>
													{line.trim()}
												</Text>
											</View>
										);
									})}
							</View>
						)}

						{annotations}
					</View>
				</View>
			</View>
		);

		if (isLargeMode) {
			return (
				<View
					style={{
						flex: 0,
						width: '100%',
					}}>
					{content}
				</View>
			);
		}

		return (
			<View>
				<TouchableOpacity
					onPress={this._onPress}
					onLongPress={this.openPopup}
					activeOpacity={0.7}>
					{content}
				</TouchableOpacity>
				<CalendarNewEventPrompt
					popupVisible={this.state.popupVisible}
					closePopup={this.closePopup}
					openPopup={this.openPopup}
					theme={theme}
					data={this.props.data}
				/>
			</View>
		);
	}
}

export function CourseRowWithNavigation(props) {
	const navigation = useNavigation();
	return <CourseRow {...props} navigation={navigation} />;
}

// ── PAGE DÉTAILS DU COURS (Avec la Map) ──────────────────────────────────
const mapStyle = [
	{ featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#ff0000' }] },
	{ featureType: 'landscape.man_made', elementType: 'labels', stylers: [{ color: '#ff0000' }] },
	{ featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#000000' }] },
	{ featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
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
		let link = URL.MAP + `search/?api=1&query=${this.state.locations[0].lat},${this.state.locations[0].lng}`;
		if (this.state.locations[0].placeID) {
			link = URL.MAP + `search/?api=1&query=${this.state.locations[0].lat},${this.state.locations[0].lng}&query_place_id=${this.state.locations[0].placeID}`;
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
						provider={Platform.OS === 'android' ? MapView.PROVIDER_GOOGLE : undefined}
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

					<View style={{ position: 'absolute', top: tokens.space.sm, right: tokens.space.sm }}>
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
			<SafeAreaView 
			edges={['bottom', 'left', 'right']}
			style={{ flex: 1, backgroundColor: theme.greyBackground }}
			>
				{/* Card du cours */}
				<View
					style={{
						flex: 0,
						marginTop: tokens.space.sm,
						marginBottom: this.state.locations.length > 0 ? tokens.space.sm : tokens.space.md,
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