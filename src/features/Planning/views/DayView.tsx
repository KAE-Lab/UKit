import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import moment from 'moment';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View } from 'react-native';

import CalendarDay from '../components/CalendarDay';
import CalendarWeek from '../components/CalendarWeek';
import { DayComponent, WeekComponent } from '../components/ScheduleList';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';
import { DayViewHeader } from '../components/DayViewHeader';

function capitalize(str: string) {
	return `${str.charAt(0).toUpperCase()}${str.substr(1)}`;
}

const isEqualsObject = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) =>
	Object.entries(obj1).toString() === Object.entries(obj2).toString();

const findIndexOfObject = (objectList: Record<string, unknown>[], object: Record<string, unknown>) => {
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
	context!: React.ContextType<typeof AppContext>;
	static lastSelectedDay: moment.Moment | null = null;
	static lastSelectedWeek: { week: number; year: number } | null = null;
    viewability: { itemVisiblePercentThreshold: number };
    scrollTimeout: NodeJS.Timeout | null = null;
    mockListener: import('react-native').EmitterSubscription | null = null;
    calendarList: import('react-native').FlatList<unknown> | null = null;

	constructor(props: DayViewProps) {
		super(props);

		const currentDay = moment();
		const days = DayView.generateDays();

		const currentWeek = { week: currentDay.isoWeek(), year: currentDay.year() };
		const weeks = DayView.generateWeeks();

		const selectedDay = DayView.lastSelectedDay || currentDay;
		const selectedWeek = DayView.lastSelectedWeek || currentWeek;

		const selectedDayIndex = days.findIndex((e: moment.Moment) => e.isSame(selectedDay, 'day'));
		const selectedWeekIndex = findIndexOfObject(weeks, selectedWeek);

		this.state = {
			currentDay,
			currentDayIndex: days.findIndex((e) => e.isSame(currentDay, 'day')),
			selectedDayIndex: selectedDayIndex >= 0 ? selectedDayIndex : 0,
			shownMonth: {
				number: selectedDay.month(),
				string: capitalize(selectedDay.format('MMMM')),
			},
			days,
			selectedDay,
			currentWeek,
			currentWeekIndex: findIndexOfObject(weeks, currentWeek),
			selectedWeekIndex: selectedWeekIndex >= 0 ? selectedWeekIndex : 0,
			weeks,
			selectedWeek,
			mode: 'day',
		};

		this.viewability = { itemVisiblePercentThreshold: 50 };
		this.scrollTimeout = null;
	}

	componentDidMount() {
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

	static getCalendarListItemLayout = (data: unknown[] | null | undefined, index: number) => ({
		length: style.calendarList.itemSize,
		offset: style.calendarList.itemSize * index + tokens.space.md,
		index,
	});

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

	renderCalendarDayItem = ({ item }: { item: moment.Moment }) => (
		<CalendarDay
			item={item}
			selectedDay={this.state.selectedDay}
			currentDay={this.state.currentDay}
			onPressItem={this.onDayItemPress}
			theme={style.Theme[this.context.themeName]}
		/>
	);

	extractCalendarDayKey = (item: moment.Moment) =>
		`${item.date()}-${item.month()}-${this.context.themeName}`;

	onDayItemPress = (dayItem: moment.Moment) => {
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

	checkViewableItems = (info: { viewableItems: import('react-native').ViewToken[] }) => {
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

	renderCalendarWeekItem = ({ item }: { item: { week: number; year: number } }) => (
		<CalendarWeek
			week={item}
			selectedWeek={this.state.selectedWeek}
			currentWeek={this.state.currentWeek}
			onPressItem={this.onWeekItemPress}
			theme={style.Theme[this.context.themeName]}
		/>
	);

	extractCalendarWeekKey = (item: { week: number; year: number }) =>
		`S${item.week}-${this.context.themeName}`;

	onWeekItemPress = (item: { week: number; year: number }) => {
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

	onDayScrollToIndexFailed = (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
		this.scrollTimeout = setTimeout(() => {
			this.calendarList?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
		}, 500);
	};

	render() {
		const theme = style.Theme[this.context.themeName];
		const { mode } = this.state;

		const centerLabel = mode === 'day'
			? this.state.shownMonth.string
			: `${Translator.get('WEEK')} ${this.state.selectedWeek.week}`;

		const leftLabel = mode === 'day'
			? Translator.get('TODAY')
			: Translator.get('THIS_WEEK');

		const rightLabel = mode === 'day' ? Translator.get('WEEK') : Translator.get('DAY');
		const rightIcon = mode === 'day' ? 'calendar-range' : 'calendar';
		const onRightPress = mode === 'day' ? this.onSwitchToWeek : this.onSwitchToDay;

		return (
			<SafeAreaInsetsContext.Consumer>
				{(insets) => (
					<View style={{ flex: 1, backgroundColor: theme.courseBackground }}>
						<DayViewHeader 
                            insets={insets} 
                            theme={theme} 
                            mode={mode} 
                            groupName={this.props.groupName}
                            centerLabel={centerLabel}
                            leftLabel={leftLabel}
                            rightLabel={rightLabel}
                            rightIcon={rightIcon}
                            onTodayPress={this.onTodayPress}
                            onRightPress={onRightPress}
                            days={this.state.days}
                            extractCalendarDayKey={this.extractCalendarDayKey}
                            viewability={this.viewability}
                            checkViewableItems={this.checkViewableItems}
                            selectedDayIndex={this.state.selectedDayIndex}
                            getCalendarListItemLayout={DayView.getCalendarListItemLayout}
                            renderCalendarDayItem={this.renderCalendarDayItem}
                            onDayScrollToIndexFailed={this.onDayScrollToIndexFailed}
                            setDayListRef={(list) => { this.calendarList = list; }}
                            weeks={this.state.weeks}
                            extractCalendarWeekKey={this.extractCalendarWeekKey}
                            selectedWeekIndex={this.state.selectedWeekIndex}
                            renderCalendarWeekItem={this.renderCalendarWeekItem}
                            onWeekScrollToIndexFailed={this.onDayScrollToIndexFailed}
                            setWeekListRef={(list) => { this.calendarList = list; }}
                            extraData={this.state}
                        />

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
