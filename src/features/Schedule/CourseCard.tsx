import React, { useState } from 'react';
import { Linking, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback, Platform, FlatList, Dimensions, ScrollView} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-root-toast';
import * as Calendar from 'expo-calendar';
import { useNavigation } from '@react-navigation/native';

import style, { tokens } from '../../shared/theme/Theme';

import Translator from '../../shared/i18n/Translator';
import { getLocations, getLocationsInText } from '../../shared/services/AppCore';
import { AppContext } from '../../shared/services/AppCore';
import { URL } from '../../shared/services/DataService';
import { withStaticHeader } from '../../shared/navigation/NavHelpers';

// ── TYPESCRIPT INTERFACES ───────────────────────────────────────────────
export interface CourseData {
	subject: string;
	date: { start: string; end: string };
	schedule: string;
	description: string;
	color?: string;
	category: string;
	UE?: string;
	starttime: string;
	endtime: string;
}

interface CalendarNewEventPromptProps {
	popupVisible: boolean;
	closePopup: () => void;
	openPopup: () => void;
	theme: any;
	data: CourseData;
}

// ── MODALE D'AJOUT AU CALENDRIER ─────────────────────────────────────────
export class CalendarNewEventPrompt extends React.Component<CalendarNewEventPromptProps> {
	constructor(props: CalendarNewEventPromptProps) {
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
			let id: string | null = null;
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
			if (!calendarId) return;

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
			Toast.show(Translator.get('CALENDAR_ERROR'), {
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
					<View style={theme.popup.background as any}>
						<TouchableWithoutFeedback accessible={false}>
							<View style={theme.popup.container as any}>
								<View style={theme.popup.header as any}>
									<Text style={theme.popup.textHeader as any}>
										{Translator.get('ADD_TO_CALENDAR').toUpperCase()}
									</Text>
								</View>
								<Text style={theme.popup.textDescription as any}>
									{Translator.get(
										'ADD_TO_CALENDAR_DESCRIPTION',
										this.props.data.subject,
									)}
								</Text>
								<View style={theme.popup.buttonContainer as any}>
									<TouchableOpacity
										style={theme.popup.buttonSecondary as any}
										onPress={this.closePopup}>
										<Text style={theme.popup.buttonTextSecondary as any}>
											{Translator.get('CANCEL')}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={theme.popup.buttonMain as any}
										onPress={this.addCalendarEvent}>
										<Text style={theme.popup.buttonTextMain as any}>
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
interface CourseRowProps {
	data: CourseData;
	theme: any;
	readOnly?: boolean;
	navigation?: any;
}

interface CourseRowState {
	backgroundColor: string;
	borderColor: string;
	lineColor: string;
	popupVisible: boolean;
}

class CourseRow extends React.Component<CourseRowProps, CourseRowState> {
	constructor(props: CourseRowProps) {
		super(props);
		const lineColor = props.theme.courses[props.data?.color ?? 'default'] ?? props.theme.courses.default;

		this.state = {
			backgroundColor: props.theme.eventBackground,
			borderColor: props.theme.eventBorder,
			lineColor,
			popupVisible: false,
		};
	}

	static getDerivedStateFromProps(nextProps: CourseRowProps, prevState: CourseRowState) {
		const lineColor =
			nextProps.theme.courses[nextProps.data?.color ?? 'default'] ?? nextProps.theme.courses.default;

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

		if (this.props.data.category === 'nocourse') {
			return (
				<View style={style.schedule.course.noCourse as any}>
					<MaterialCommunityIcons
						name="calendar-blank-outline"
						size={36}
						color={theme.fontSecondary}
						style={{ opacity: 0.4, marginBottom: tokens.space.sm }}
					/>
					<Text
						style={[
							style.schedule.course.noCourseText as any,
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

		const ue = this.props.data.UE ? (
			<View style={[style.schedule.course.line as any, { alignItems: 'center' }]}>
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
						fontWeight: tokens.fontWeight.medium as any,
					}}>
					{this.props.data.UE}
				</Text>
			</View>
		) : null;

		const subject =
			this.props.data.subject !== 'N/C' ? (
				<Text style={[style.schedule.course.title as any, { color: theme.font, flex: 1 }]}>
					{this.props.data.subject.trim()}
				</Text>
			) : null;

		const annotations =
			!isLargeMode && this.props.data.description?.length > 0
				? this.props.data.description.split('\n').map((annotation, index) => {
						const trimmedAnnotation = annotation.trim();
						if (!trimmedAnnotation) return null;

						let iconName: any = 'info-outline';
						const lowerLine = trimmedAnnotation.toLowerCase();
						
						const isWeeks = /^([sS]emaines?\s*:?\s*)?[\d\s,\-]+$/.test(trimmedAnnotation);
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
							<View
								key={index}
								style={[
									style.schedule.course.line as any,
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
									{trimmedAnnotation}
								</Text>
							</View>
						);
				  })
				: null;

		const content = (
			<View
				style={[
					style.schedule.course.root as any,
					{
						flex: 0,
						minHeight: 120,
						backgroundColor: this.state.backgroundColor,
						marginHorizontal: tokens.space.sm,
						marginVertical: tokens.space.xs,
						borderRadius: tokens.radius.lg,
						borderLeftWidth: 4,
						borderLeftColor: this.state.lineColor,
						borderWidth: 1,
						borderColor: this.state.borderColor,
						overflow: 'hidden',
						...(tokens.shadow.sm as any),
					},
				]}>
				<View style={style.schedule.course.row as any}>
					<View
						style={[
							style.schedule.course.hours as any,
							{
								backgroundColor: `${this.state.lineColor}18`,
								borderRightWidth: 1,
								borderRightColor: `${this.state.lineColor}44`,
							},
						]}>
						<Text style={[style.schedule.course.hoursText as any, { color: theme.font }]}>
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
								style.schedule.course.hoursText as any,
								{ color: theme.fontSecondary },
							]}>
							{this.props.data.endtime}
						</Text>
					</View>

					<View
						style={[style.schedule.course.contentBlock as any, { padding: tokens.space.sm }]}>
						<View style={style.schedule.course.contentType as any}>
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
											fontWeight: tokens.fontWeight.semibold as any,
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
										const trimmedLine = line.trim();
										if (!trimmedLine) return null;

										let iconName: any = 'info-outline';
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
											<View
												key={index}
												style={[
													style.schedule.course.line as any,
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
													{trimmedLine}
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
				<View style={{ flex: 0, width: '100%' }}>
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

export function CourseRowWithNavigation(props: any) {
	const navigation = useNavigation();
	return <CourseRow {...props} navigation={navigation} />;
}

const screenWidth = Dimensions.get('window').width;
const savedCarouselIndices = new Map<string, number>();

export function CourseGroupCarousel({ coursesGroup, theme }: { coursesGroup: CourseData[], theme: any }) {
	const groupKey = coursesGroup.length > 0 ? `${coursesGroup[0].starttime}-${coursesGroup[0].subject}` : 'default';
	const initialIndex = savedCarouselIndices.get(groupKey) || 0;

	const [currentIndex, setCurrentIndex] = useState(initialIndex);

	if (!coursesGroup || coursesGroup.length === 0) return null;

	if (coursesGroup.length === 1) {
		return <CourseRowWithNavigation data={coursesGroup[0]} theme={theme} />;
	}

	return (
        <View>
            <FlatList
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={coursesGroup}
                keyExtractor={(item, index) => (item.schedule || '') + String(index)}
                initialScrollIndex={initialIndex}
                getItemLayout={(data, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                    setCurrentIndex(index);
                    savedCarouselIndices.set(groupKey, index);
                }}
                renderItem={({ item, index: cardIndex }) => (
                    <View style={{ width: screenWidth, justifyContent: 'flex-start' }}>
                        <View style={{ width: '100%', alignSelf: 'flex-start', position: 'relative' }}>
                            <CourseRowWithNavigation data={item} theme={theme} />
                            
                            <View 
                                style={{ 
                                    position: 'absolute', 
                                    bottom: 11, 
                                    right: 28,  
                                    flexDirection: 'row', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    pointerEvents: 'none' 
                                }}
                            >
                                <View 
                                    style={{
                                        flexDirection: 'row',
                                        backgroundColor: theme.eventBackground,
                                        paddingHorizontal: 6,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: theme.eventBorder,
                                    }}
                                >
                                    {coursesGroup.map((_, dotIndex) => (
                                        <View
                                            key={dotIndex}
                                            style={{
                                                height: 5,
                                                width: cardIndex === dotIndex ? 12 : 5,
                                                borderRadius: 3,
                                                backgroundColor: cardIndex === dotIndex ? (theme.accent ?? theme.primary) : theme.fontSecondary,
                                                opacity: cardIndex === dotIndex ? 1 : 0.4,
                                                marginHorizontal: 2,
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

// ── PAGE DÉTAILS DU COURS (Avec la Map) ──────────────────────────────────
interface CourseProps {
	route: { params: { data: CourseData } };
	navigation: any;
	headerPadding?: any;
}

interface CourseState {
	data: CourseData;
	locations: any[];
}

class Course extends React.Component<CourseProps, CourseState> {
	static contextType = AppContext;

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
		let locations: any[] = [];
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

	render() {
		const appContext = this.context as any;
		const themeName = appContext?.themeName ?? 'light';
		const theme = (style.Theme as any)[themeName];
		const lineColor = theme.courses[this.state.data.color ?? 'default'] ?? theme.courses.default;

		let map = null;
		if (this.state.locations.length > 0) {
            const centerLat = this.state.locations[0].lat;
            const centerLng = this.state.locations[0].lng;

			// Génération du code Leaflet pour tes marqueurs customisés SVG
            const markersJs = this.state.locations.map((location: any) => {
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
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19
                        }).addTo(map);
                        ${markersJs}
                    </script>
                </body>
                </html>
            `;

			map = (
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
								...(tokens.shadow.md as any),
							}}>
							<MaterialCommunityIcons name="map-search-outline" size={28} color={theme.accent} />
						</TouchableOpacity>
					</View>
				</View>
			);
		}

		return (
			<SafeAreaView 
				edges={['bottom', 'left', 'right']}
				style={[{ flex: 1, backgroundColor: theme.courseBackground }, this.props.headerPadding]}
			>
				{/* ── CARTE DE DÉTAILS DÉDIÉE ── */}
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
						...(tokens.shadow.sm as any),
						zIndex: 10,
					}}>
					
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.space.sm }}>
						<Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, flex: 1, marginRight: tokens.space.md }}>
							{this.state.data.subject !== 'N/C' ? this.state.data.subject.trim() : Translator.get('UNKNOWN_SUBJECT')}
						</Text>
						{this.state.data.category !== this.state.data.subject && (
							<View style={{ backgroundColor: `${lineColor}22`, borderRadius: tokens.radius.pill, paddingHorizontal: tokens.space.sm, paddingVertical: 2 }}>
								<Text style={{ fontSize: tokens.fontSize.xs, color: lineColor, fontWeight: tokens.fontWeight.bold as any }}>
									{this.state.data.category}
								</Text>
							</View>
						)}
					</View>

					<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
						<MaterialCommunityIcons name="clock-outline" size={18} color={lineColor} style={{ marginRight: tokens.space.sm }} />
						<Text style={{ fontSize: tokens.fontSize.sm, color: lineColor, fontWeight: tokens.fontWeight.semibold as any }}>
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

					{(this.state.data.description || '').split('\n').map((line, index) => {
						const trimmedLine = line.trim();
						if (!trimmedLine) return null;

						let iconName: any = 'info-outline';
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
					})}
				</View>

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
							...(tokens.shadow.sm as any),
						}}>
						{map}
					</View>
				)}
			</SafeAreaView>
		);
	}
}

export default withStaticHeader(Course);