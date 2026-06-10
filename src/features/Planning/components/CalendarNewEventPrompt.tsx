import React from 'react';
import { Modal, Platform, Text, TouchableWithoutFeedback, View } from 'react-native';
import * as Calendar from 'expo-calendar';
import Toast from 'react-native-root-toast';

import Translator from '../../../shared/i18n/Translator';
import { CourseData } from './CourseCard';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

interface CalendarNewEventPromptProps {
	popupVisible: boolean;
	closePopup: () => void;
	openPopup: () => void;
	theme: import('../../../shared/theme/Theme').AppThemeType;
	data: CourseData;
}

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
					<View style={theme.popup.background as never}>
						<TouchableWithoutFeedback accessible={false}>
							<View style={theme.popup.container as never}>
								<View style={theme.popup.header as never}>
									<Text style={theme.popup.textHeader as never}>
										{Translator.get('ADD_TO_CALENDAR').toUpperCase()}
									</Text>
								</View>
								<Text style={theme.popup.textDescription as never}>
									{Translator.get(
										'ADD_TO_CALENDAR_DESCRIPTION',
										this.props.data.subject,
									)}
								</Text>
								<View style={theme.popup.buttonContainer as never}>
									<UnifiedTouchable
										style={theme.popup.buttonSecondary as import('react-native').ViewStyle}
										onPress={this.closePopup}>
										<Text style={theme.popup.buttonTextSecondary as import('react-native').TextStyle}>
											{Translator.get('CANCEL')}
										</Text>
									</UnifiedTouchable>
									<UnifiedTouchable
										style={theme.popup.buttonMain as import('react-native').ViewStyle}
										onPress={this.addCalendarEvent}>
										<Text style={theme.popup.buttonTextMain as import('react-native').TextStyle}>
											{Translator.get('CONFIRM')}
										</Text>
									</UnifiedTouchable>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	}
}
