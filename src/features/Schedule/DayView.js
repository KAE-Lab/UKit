import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import CalendarDay from './CalendarDay';
import CalendarWeek from './CalendarWeek';
import { DayComponent, WeekComponent } from './ScheduleList';
import style, { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import { AppContext } from '../../shared/services/AppCore';
import { SaveGroupButton } from '../../shared/navigation/NavHelpers';

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

class DayView extends React.Component {
	static contextType = AppContext;

	constructor(props) {
		super(props);

		// ── Day state ──────────────────────────────────────
		const currentDay = moment();
		const days = DayView.generateDays();

		// ── Week state ─────────────────────────────────────
		const currentWeek = { week: currentDay.isoWeek(), year: currentDay.year() };
		const weeks = DayView.generateWeeks();

		this.state = {
			// Day mode
			currentDay,
			currentDayIndex: days.findIndex((e) => e.isSame(currentDay, 'day')),
			shownMonth: {
				number: currentDay.month(),
				string: capitalize(currentDay.format('MMMM')),
			},
			days,
			selectedDay: currentDay,
			// Week mode
			currentWeek,
			currentWeekIndex: findIndexOfObject(weeks, currentWeek),
			weeks,
			selectedWeek: currentWeek,
			// Mode
			mode: 'day',
		};

		this.viewability = { itemVisiblePercentThreshold: 50 };
	}

	// ── Layout helper (partagé day/week, même itemSize) ──────────
	static getCalendarListItemLayout(data, index) {
		return {
			length: style.calendarList.itemSize,
			offset: style.calendarList.itemSize * index,
			index,
		};
	}

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
		this.setState({ selectedDay: dayItem });
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
		this.setState({ selectedWeek: item });
	};

	// ── Shared / mode-toggle ─────────────────────────────────────
	onTodayPress = () => {
		if (this.state.mode === 'day') {
			this.setState({ selectedDay: this.state.currentDay }, () => {
				this.calendarList?.scrollToIndex({
					index: this.state.currentDayIndex,
					animated: true,
				});
			});
		} else {
			this.setState({ selectedWeek: this.state.currentWeek }, () => {
				this.calendarList?.scrollToIndex({
					index: this.state.currentWeekIndex,
					animated: true,
				});
			});
		}
	};

	onSwitchToWeek = () => this.setState({ mode: 'week' });
	onSwitchToDay  = () => this.setState({ mode: 'day' });

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
		const rightIcon  = mode === 'day' ? 'calendar-range' : 'calendar';
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
							{/* Ligne 1 : Titre + favoris — identique à greetingText Campus */}
							<View style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								paddingHorizontal: tokens.space.md,
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
								<SaveGroupButton
									groupName={this.props.groupName}
									themeName={this.context.themeName}
								/>
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
									ref={(list) => (this.calendarList = list)}
									showsHorizontalScrollIndicator={false}
									data={this.state.days}
									horizontal
									keyExtractor={this.extractCalendarDayKey}
									viewabilityConfig={this.viewability}
									onViewableItemsChanged={this.checkViewableItems}
									initialScrollIndex={this.state.currentDayIndex}
									getItemLayout={DayView.getCalendarListItemLayout}
									extraData={this.state}
									renderItem={this.renderCalendarDayItem}
								/>
							) : (
								<FlatList
									key="slider-week"
									ref={(list) => (this.calendarList = list)}
									showsHorizontalScrollIndicator={false}
									data={this.state.weeks}
									horizontal
									keyExtractor={this.extractCalendarWeekKey}
									viewabilityConfig={this.viewability}
									initialScrollIndex={this.state.currentWeekIndex}
									getItemLayout={DayView.getCalendarListItemLayout}
									extraData={this.state}
									renderItem={this.renderCalendarWeekItem}
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
