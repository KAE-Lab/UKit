import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import { SafeAreaView } from 'react-native-safe-area-context';

import CalendarDay from '../components/CalendarDay';
import DayComponent from '../components/Day';
import style, { tokens } from '../Style';
import Translator from '../utils/translator';
import { AppContext } from '../utils/DeviceUtils';

function capitalize(str) {
	return `${str.charAt(0).toUpperCase()}${str.substr(1)}`;
}

class DayView extends React.Component {
	static contextType = AppContext;

	constructor(props) {
		super(props);

		const currentDay = moment();
		const days = DayView.generateDays();

		this.state = {
			groupName: this.props.groupName,
			currentDay: currentDay,
			currentDayIndex: days.findIndex((e) => e.isSame(currentDay, 'day')),
			shownMonth: {
				number: currentDay.month(),
				string: capitalize(currentDay.format('MMMM')),
			},
			days,
			selectedDay: currentDay,
		};

		this.viewability = {
			itemVisiblePercentThreshold: 50,
		};
	}

	static getCalendarListItemLayout(data, index) {
		return {
			length: style.calendarList.itemSize,
			offset: style.calendarList.itemSize * index,
			index,
		};
	}

	renderCalendarListItem = ({ item }) => {
		return (
			<CalendarDay
				item={item}
				selectedDay={this.state.selectedDay}
				currentDay={this.state.currentDay}
				onPressItem={this.onDayPress}
				theme={style.Theme[this.context.themeName]}
			/>
		);
	};

	extractCalendarListItemKey = (item) => {
		return `${item.date()}-${item.month()}-${this.context.themeName}`;
	};

	onTodayPress = () => {
		this.setState(
			{
				selectedDay: this.state.currentDay,
			},
			() => {
				if (this.calendarList) {
					this.calendarList.scrollToIndex({
						index: this.state.currentDayIndex,
						animated: true,
					});
				}
			},
		);
	};

	onWeekPress = () => {
		this.props.navigation.navigate('Week', { groupName: this.state.groupName });
	};

	onDayPress = (dayItem) => {
		this.setState({
			selectedDay: dayItem,
		});
	};

	static generateDays() {
		const currentDate = moment();
		const beginningGenerationDate = moment()
			.date(1)
			.month(7);

		if (currentDate.month() > 6) {
			beginningGenerationDate.year(currentDate.year());
		} else {
			beginningGenerationDate.year(currentDate.year() - 1);
		}

		const days = [];

		for (let i = 0, iMax = 365; i < iMax; i++) {
			days.push(moment(beginningGenerationDate).add(i, 'd'));
		}

		return days;
	}

	checkViewableItems = (info) => {
		if (!info.viewableItems.length) {
			return;
		}

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

	render() {
		const theme = style.Theme[this.context.themeName];

		return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1 }}>
                    <DayComponent
                        key={`${this.state.days[0].dayOfYear()}-${this.context.themeName}`}
                        day={this.state.selectedDay}
                        groupName={this.state.groupName}
                        theme={theme}
                        navigation={this.props.navigation}
                        filtersList={this.context.filters}
                    />

                    {/* ── Barre de navigation calendrier ────────────────── */}
                    <View style={{
                        flexGrow: 0,
                        backgroundColor: theme.cardBackground,
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                    }}>
                        {/* Header : mois + boutons */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            height: 44,
                            backgroundColor: theme.cardBackground,
                            paddingHorizontal: tokens.space.xs,
                        }}>
                            {/* Bouton Aujourd'hui */}
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
                                <MaterialIcons
                                    name="event-note"
                                    size={16}
                                    color={theme.accent ?? theme.primary}
                                />
                                <Text style={{
                                    fontSize: tokens.fontSize.sm,
                                    marginLeft: tokens.space.xs,
                                    color: theme.accent ?? theme.primary,
                                    fontWeight: tokens.fontWeight.medium,
                                }}>
                                    {Translator.get('TODAY')}
                                </Text>
                            </TouchableOpacity>

                            {/* Mois affiché */}
                            <Text style={{
                                fontSize: tokens.fontSize.md,
                                fontWeight: tokens.fontWeight.semibold,
                                color: theme.font,
                                flex: 1,
                                textAlign: 'center',
                            }}>
                                {this.state.shownMonth.string}
                            </Text>

                            {/* Bouton Semaine */}
                            <TouchableOpacity
                                onPress={this.onWeekPress}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: tokens.space.md,
                                    paddingVertical: tokens.space.sm,
                                    borderRadius: tokens.radius.md,
                                    backgroundColor: theme.greyBackground,
                                    
                                }}>
                                <Text style={{
                                    fontSize: tokens.fontSize.sm,
                                    marginRight: tokens.space.xs,
                                    color: theme.accent ?? theme.primary,
                                    fontWeight: tokens.fontWeight.medium,
                                }}>
                                    {Translator.get('WEEK')}
                                </Text>
                                <MaterialCommunityIcons
                                    name="calendar-range"
                                    size={16}
                                    color={theme.accent ?? theme.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Liste des jours */}
                        <FlatList
                            ref={(list) => (this.calendarList = list)}
                            showsHorizontalScrollIndicator={false}
                            data={this.state.days}
                            horizontal={true}
                            keyExtractor={this.extractCalendarListItemKey}
                            viewabilityConfig={this.viewability}
                            onViewableItemsChanged={this.checkViewableItems}
                            initialScrollIndex={this.state.currentDayIndex}
                            getItemLayout={DayView.getCalendarListItemLayout}
                            extraData={this.state}
                            renderItem={this.renderCalendarListItem}
                            style={{
                                backgroundColor: theme.cardBackground,
                                paddingBottom: tokens.space.xs,
                            }}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
	}
}

export default DayView;
