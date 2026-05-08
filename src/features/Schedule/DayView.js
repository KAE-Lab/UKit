import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import CalendarDay from './CalendarDay';
import { DayComponent } from './ScheduleList'; 
import style, { tokens } from '../../shared/theme/Theme'; 
import Translator from '../../shared/i18n/Translator';
import { AppContext } from '../../shared/services/AppCore';
import { SaveGroupButton } from '../../shared/navigation/NavHelpers';

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
		this.props.navigation.navigate('Week', { groupName: this.props.groupName });
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
		const primaryColor = theme.accent ?? theme.primary;

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
                            {/* Ligne 1 : Titre "Planning" + bouton favoris — style identique à greetingText/Campus */}
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

                            {/* Ligne 2 : boutons Today / Mois / Week */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingHorizontal: tokens.space.md,
                                marginBottom: tokens.space.sm,
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
                                        color={primaryColor}
                                    />
                                    <Text style={{
                                        fontSize: tokens.fontSize.sm,
                                        marginLeft: tokens.space.xs,
                                        color: primaryColor,
                                        fontWeight: tokens.fontWeight.medium,
                                    }}>
                                        {Translator.get('TODAY')}
                                    </Text>
                                </TouchableOpacity>

                                {/* Mois affiché (comme avant) */}
                                <Text style={{
                                    fontSize: tokens.fontSize.md,
                                    fontWeight: tokens.fontWeight.semibold,
                                    color: theme.fontSecondary,
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
                                        color: primaryColor,
                                        fontWeight: tokens.fontWeight.medium,
                                    }}>
                                        {Translator.get('WEEK')}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name="calendar-range"
                                        size={16}
                                        color={primaryColor}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Slider des jours */}
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
                            />
                        </View>

                        {/* Contenu principal : liste des cours */}
                        <View style={{ flex: 1 }}>
                            <DayComponent
                                key={`${this.state.days[0].dayOfYear()}-${this.context.themeName}`}
                                day={this.state.selectedDay}
                                groupName={this.props.groupName}
                                theme={theme}
                                navigation={this.props.navigation}
                                filtersList={this.context.filters}
                            />
                        </View>
                    </View>
                )}
            </SafeAreaInsetsContext.Consumer>
        );
	}
}

export default DayView;
