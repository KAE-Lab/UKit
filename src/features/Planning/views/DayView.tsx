import React from 'react';
import { FlatList, Text, TouchableOpacity, View, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import CalendarDay from '../components/CalendarDay';
import CalendarWeek from '../components/CalendarWeek';
import { DayComponent, WeekComponent } from '../components/ScheduleList';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';

function capitalize(str) {
	return `${str.charAt(0).toUpperCase()}${str.substr(1)}`;
}

// Utilitaires repris de WeekView (inchangés)
const isEqualsObject = (obj1, obj2) =>
	Object.entries(obj1).toString() === Object.entries(obj2).toString();

const findIndexOfObject = (objectList, object) => {
	for (let i = 0; i < objectList.length; i++) {
		if (isEqualsObject(objectList[i], object)) return i;
	}
	return -1;
};

export interface DayViewProps {
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    groupName: string | string[];
}

export interface DayViewState {
    currentDay: moment.Moment;
    currentDayIndex: number;
    selectedDayIndex: number;
    shownMonth: { number: number; string: string };
    days: moment.Moment[];
    selectedDay: moment.Moment;
    currentWeek: { week: number; year: number };
    currentWeekIndex: number;
    selectedWeekIndex: number;
    weeks: { week: number; year: number }[];
    selectedWeek: { week: number; year: number };
    mode: 'day' | 'week';
}

class DayView extends React.Component<DayViewProps, DayViewState> {
	static contextType = AppContext;
	// @ts-ignore
	context!: React.ContextType<typeof AppContext>;
	static lastSelectedDay: moment.Moment | null = null;
	static lastSelectedWeek: { week: number; year: number } | null = null;
    viewability: { itemVisiblePercentThreshold: number };
    scrollTimeout: NodeJS.Timeout | null = null;
    mockListener: import('react-native').EmitterSubscription | null = null;
    calendarList: FlatList<any> | null = null;

	constructor(props: DayViewProps) {
		super(props);

		// ── Day state ──────────────────────────────────────
		const currentDay = moment();
		const days = DayView.generateDays();

		// ── Week state ─────────────────────────────────────
		const currentWeek = { week: currentDay.isoWeek(), year: currentDay.year() };
		const weeks = DayView.generateWeeks();

		// Persistance de la sélection
		const selectedDay = DayView.lastSelectedDay || currentDay;
		const selectedWeek = DayView.lastSelectedWeek || currentWeek;

		const selectedDayIndex = days.findIndex((e) => e.isSame(selectedDay, 'day'));
		const selectedWeekIndex = findIndexOfObject(weeks, selectedWeek);

		this.state = {
			// Day mode
			currentDay,
			currentDayIndex: days.findIndex((e) => e.isSame(currentDay, 'day')),
			selectedDayIndex: selectedDayIndex >= 0 ? selectedDayIndex : 0,
			shownMonth: {
				number: selectedDay.month(),
				string: capitalize(selectedDay.format('MMMM')),
			},
			days,
			selectedDay,
			// Week mode
			currentWeek,
			currentWeekIndex: findIndexOfObject(weeks, currentWeek),
			selectedWeekIndex: selectedWeekIndex >= 0 ? selectedWeekIndex : 0,
			weeks,
			selectedWeek,
			// Mode
			mode: 'day',
		};

		this.viewability = { itemVisiblePercentThreshold: 50 };
		this.scrollTimeout = null;
	}

	// ── Layout helper (partagé day/week, même itemSize) ──────────
	componentDidMount() {
		// Centrer la sélection au chargement initial
		this.scrollToSelection(false);

		this.mockListener = DeviceEventEmitter.addListener('timeMockChanged', () => {
			this.reinitializeDates();
		});
	}

	reinitializeDates = () => {
		const currentDay = moment();
		const days = DayView.generateDays();
		const currentWeek = { week: currentDay.isoWeek(), year: currentDay.year() };
		const weeks = DayView.generateWeeks();

		const selectedDayIndex = days.findIndex((e) => e.isSame(currentDay, 'day'));
		const selectedWeekIndex = findIndexOfObject(weeks, currentWeek);

		DayView.lastSelectedDay = currentDay;
		DayView.lastSelectedWeek = currentWeek;

		this.setState({
			currentDay,
			currentDayIndex: selectedDayIndex,
			selectedDayIndex: Math.max(0, selectedDayIndex),
			shownMonth: {
				number: currentDay.month(),
				string: capitalize(currentDay.format('MMMM')),
			},
			days,
			selectedDay: currentDay,
			currentWeek,
			currentWeekIndex: selectedWeekIndex,
			selectedWeekIndex: Math.max(0, selectedWeekIndex),
			weeks,
			selectedWeek: currentWeek,
		}, () => {
			this.scrollToSelection(true);
		});
	};

	scrollToSelection = (animated = true) => {
		this.scrollTimeout = setTimeout(() => {
			const index = this.state.mode === 'day' ? this.state.selectedDayIndex : this.state.selectedWeekIndex;
			if (index >= 0) {
				this.calendarList?.scrollToIndex({
					index,
					animated,
					viewPosition: 0.5,
				});
			}
		}, 50);
	};

	componentWillUnmount() {
		if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
		if (this.mockListener) this.mockListener.remove();
	}

	static getCalendarListItemLayout = (data, index) => ({
		length: style.calendarList.itemSize,
		offset: style.calendarList.itemSize * index + tokens.space.md,
		index,
	});

	// ── Generators ───────────────────────────────────────────────
	static generateDays() {
		const currentDate = moment();
		const start = moment().date(1).month(7);
		if (currentDate.month() > 6) start.year(currentDate.year());
		else start.year(currentDate.year() - 1);
		const days = [];
		for (let i = 0; i < 365; i++) days.push(moment(start).add(i, 'd'));
		return days;
	}

	static generateWeeks = () => {
		const currentDate = moment();
		const start = moment().date(1).month(7);
		if (currentDate.month() > 6) start.year(currentDate.year());
		else start.year(currentDate.year() - 1);
		const weeks = [];
		let firstWeek = null;
		for (let i = 0; i < 365; i += 7) {
			const date = moment(start).add(i, 'd');
			const week = date.isoWeek();
			const year = date.year();
			if (week !== firstWeek) {
				if (firstWeek === null) firstWeek = week;
				weeks.push({ week, year });
			} else break;
		}
		return weeks;
	};

	// ── Day mode ─────────────────────────────────────────────────
	renderCalendarDayItem = ({ item }) => (
		<CalendarDay
			item={item}
			selectedDay={this.state.selectedDay}
			currentDay={this.state.currentDay}
			onPressItem={this.onDayItemPress}
			theme={style.Theme[this.context.themeName]}
		/>
	);

	extractCalendarDayKey = (item) =>
		`${item.date()}-${item.month()}-${this.context.themeName}`;

	onDayItemPress = (dayItem) => {
		const index = this.state.days.findIndex((d) => d.isSame(dayItem, 'day'));
		DayView.lastSelectedDay = dayItem;
		this.setState({ selectedDay: dayItem, selectedDayIndex: index }, () => {
			if (index >= 0) {
				this.scrollTimeout = setTimeout(() => {
					this.calendarList?.scrollToIndex({
						index,
						animated: true,
						viewPosition: 0.5,
					});
				}, 50);
			}
		});
	};

	checkViewableItems = (info) => {
		if (!info.viewableItems.length) return;
		const date = moment(info.viewableItems[0].item);
		if (date.month() !== this.state.shownMonth.number) {
			this.setState({
				shownMonth: {
					number: date.month(),
					string: capitalize(date.format('MMMM')),
				},
			});
		}
	};

	// ── Week mode ─────────────────────────────────────────────────
	renderCalendarWeekItem = ({ item }) => (
		<CalendarWeek
			week={item}
			selectedWeek={this.state.selectedWeek}
			currentWeek={this.state.currentWeek}
			onPressItem={this.onWeekItemPress}
			theme={style.Theme[this.context.themeName]}
		/>
	);

	extractCalendarWeekKey = (item) =>
		`S${item.week}-${this.context.themeName}`;

	onWeekItemPress = (item) => {
		const index = findIndexOfObject(this.state.weeks, item);
		DayView.lastSelectedWeek = item;
		this.setState({ selectedWeek: item, selectedWeekIndex: index }, () => {
			if (index >= 0) {
				this.scrollTimeout = setTimeout(() => {
					this.calendarList?.scrollToIndex({
						index,
						animated: true,
						viewPosition: 0.5,
					});
				}, 50);
			}
		});
	};

	// ── Shared / mode-toggle ─────────────────────────────────────
	onTodayPress = () => {
		if (this.state.mode === 'day') {
			const index = this.state.currentDayIndex;
			DayView.lastSelectedDay = this.state.currentDay;
			this.setState({ selectedDay: this.state.currentDay, selectedDayIndex: index }, () => {
				this.scrollToSelection(true);
			});
		} else {
			const index = this.state.currentWeekIndex;
			DayView.lastSelectedWeek = this.state.currentWeek;
			this.setState({ selectedWeek: this.state.currentWeek, selectedWeekIndex: index }, () => {
				this.scrollToSelection(true);
			});
		}
	};

	onSwitchToWeek = () => this.setState({ mode: 'week' }, () => this.scrollToSelection(false));
	onSwitchToDay = () => this.setState({ mode: 'day' }, () => this.scrollToSelection(false));

	render() {
		const theme = style.Theme[this.context.themeName];
		const primaryColor = theme.accent ?? theme.primary;
		const { mode } = this.state;

		// Label centre : mois en jour, "Semaine XX" en semaine
		const centerLabel = mode === 'day'
			? this.state.shownMonth.string
			: `${Translator.get('WEEK')} ${this.state.selectedWeek.week}`;

		// Bouton gauche
		const leftLabel = mode === 'day'
			? Translator.get('TODAY')
			: Translator.get('THIS_WEEK');

		// Bouton droit (switch de mode)
		const rightLabel = mode === 'day' ? Translator.get('WEEK') : Translator.get('DAY');
		const rightIcon = mode === 'day' ? 'calendar-range' : 'calendar';
		const onRightPress = mode === 'day' ? this.onSwitchToWeek : this.onSwitchToDay;

		return (
			<SafeAreaInsetsContext.Consumer>
				{(insets) => (
					<View style={{ flex: 1, backgroundColor: theme.courseBackground }}>
						{/* ── Header sticky (même pattern que CampusDashboard) ── */}
						<View style={{
							backgroundColor: theme.cardBackground,
							borderBottomWidth: 1,
							borderBottomColor: theme.border,
							paddingTop: (insets?.top || 0),
							paddingBottom: tokens.space.sm,
							...tokens.shadow.sm,
						}}>
							{/* Ligne 1 : Titre "Planning" — visible en vue favoris, invisible (mais occupe l'espace) en vue groupe spécifique */}
							<View style={{
								paddingHorizontal: tokens.space.md,
								opacity: Array.isArray(this.props.groupName) ? 1 : 0,
							}}>
								<Text style={{
									fontSize: 34,
									fontWeight: tokens.fontWeight.bold,
									fontFamily: 'Montserrat_600SemiBold',
									color: theme.font,
									marginBottom: tokens.space.md,
								}}>
									{Translator.get('MY_PLANNING') || 'Planning'}
								</Text>
							</View>

							{/* Ligne 2 : Today/ThisWeek | Label | Week/Day */}
							<View style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								paddingHorizontal: tokens.space.md,
								marginBottom: tokens.space.sm,
							}}>
								{/* Bouton gauche */}
								<TouchableOpacity
									onPress={this.onTodayPress}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										paddingHorizontal: tokens.space.md,
										paddingVertical: tokens.space.sm,
										borderRadius: tokens.radius.md,
										backgroundColor: theme.greyBackground,
									}}>
									<MaterialIcons name="event-note" size={16} color={primaryColor} />
									<Text style={{
										fontSize: tokens.fontSize.sm,
										marginLeft: tokens.space.xs,
										color: primaryColor,
										fontWeight: tokens.fontWeight.medium,
									}}>
										{leftLabel}
									</Text>
								</TouchableOpacity>

								{/* Label central */}
								<Text style={{
									fontSize: tokens.fontSize.md,
									fontWeight: tokens.fontWeight.semibold,
									color: theme.fontSecondary,
									flex: 1,
									textAlign: 'center',
								}}>
									{centerLabel}
								</Text>

								{/* Bouton droit : switch mode */}
								<TouchableOpacity
									onPress={onRightPress}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										paddingHorizontal: tokens.space.md,
										paddingVertical: tokens.space.sm,
										borderRadius: tokens.radius.md,
										backgroundColor: theme.greyBackground,
									}}>
									{mode === 'week' && (
										<MaterialCommunityIcons
											name={rightIcon}
											size={16}
											color={primaryColor}
											style={{ marginRight: tokens.space.xs }}
										/>
									)}
									<Text style={{
										fontSize: tokens.fontSize.sm,
										color: primaryColor,
										fontWeight: tokens.fontWeight.medium,
										marginRight: mode === 'day' ? tokens.space.xs : 0,
									}}>
										{rightLabel}
									</Text>
									{mode === 'day' && (
										<MaterialCommunityIcons name={rightIcon} size={16} color={primaryColor} />
									)}
								</TouchableOpacity>
							</View>

							{/* Ligne 3 : Slider (jours ou semaines selon mode) */}
							{mode === 'day' ? (
								<FlatList
									key="slider-day"
									ref={(list) => { this.calendarList = list; }}
									showsHorizontalScrollIndicator={false}
									data={this.state.days}
									horizontal
									keyExtractor={this.extractCalendarDayKey}
									viewabilityConfig={this.viewability}
									onViewableItemsChanged={this.checkViewableItems}
									initialScrollIndex={this.state.selectedDayIndex}
									getItemLayout={DayView.getCalendarListItemLayout}
									extraData={this.state}
									renderItem={this.renderCalendarDayItem}
									contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
									onScrollToIndexFailed={(info) => {
										this.scrollTimeout = setTimeout(() => {
											this.calendarList?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
										}, 500);
									}}
								/>
							) : (
								<FlatList
									key="slider-week"
									ref={(list) => { this.calendarList = list; }}
									showsHorizontalScrollIndicator={false}
									data={this.state.weeks}
									horizontal
									keyExtractor={this.extractCalendarWeekKey}
									viewabilityConfig={this.viewability}
									initialScrollIndex={this.state.selectedWeekIndex}
									getItemLayout={DayView.getCalendarListItemLayout}
									extraData={this.state}
									renderItem={this.renderCalendarWeekItem}
									contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
									onScrollToIndexFailed={(info) => {
										this.scrollTimeout = setTimeout(() => {
											this.calendarList?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
										}, 500);
									}}
								/>
							)}
						</View>

						{/* Contenu principal */}
						<View style={{ flex: 1 }}>
							{mode === 'day' ? (
								<DayComponent
									key={`day-${this.state.days[0].dayOfYear()}-${this.context.themeName}`}
									day={this.state.selectedDay}
									groupName={this.props.groupName}
									theme={theme}
									navigation={this.props.navigation}
									filtersList={this.context.filters}
								/>
							) : (
								<WeekComponent
									key={`week-${this.state.selectedWeek.week}-${this.context.themeName}`}
									week={this.state.selectedWeek}
									groupName={this.props.groupName}
									theme={theme}
									navigation={this.props.navigation}
									filtersList={this.context.filters}
								/>
							)}
						</View>
					</View>
				)}
			</SafeAreaInsetsContext.Consumer>
		);
	}
}

export default DayView;
