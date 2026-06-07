import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

import { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { upperCaseFirstLetter } from '../../../shared/services/AppCore';
import { CourseGroupCarousel } from './CourseCard';
import { groupOverlappingCourses } from './ScheduleListUtils';

export interface DayWeekProps {
	schedule: { date?: string; day?: string; dateString?: string; name?: string; courses?: import('../services/PlanningApiService').PlanningEvent[] } & Record<string, unknown>;
	theme: import('../../../shared/theme/Theme').AppThemeType;
	fallbackDate?: moment.MomentInput;
	navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export interface DayWeekState {
	expand: boolean;
}

export class DayWeek extends React.Component<DayWeekProps, DayWeekState> {
	static propTypes = {
		schedule: PropTypes.object.isRequired,
		theme: PropTypes.object.isRequired,
		fallbackDate: PropTypes.object,
	};

	constructor(props: DayWeekProps) {
		super(props);
		this.state = { expand: false };
	}

	toggleExpand = () => {
		requestAnimationFrame(() => {
			this.setState({ expand: !this.state.expand });
		});
	};

	getParsedDate() {
		const { schedule, fallbackDate } = this.props;
		let dateStr = schedule.date || schedule.day || schedule.dateString || schedule.name;

		if (!dateStr && schedule.courses && schedule.courses.length > 0) {
			const firstCourse = schedule.courses[0];
			if (firstCourse.date && firstCourse.date.start) {
				dateStr = firstCourse.date.start;
			}
		}

		let parsedDate = moment.invalid();
		if (dateStr) {
			parsedDate = moment(dateStr, ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD', moment.ISO_8601]);
		}

		if (!parsedDate.isValid() && fallbackDate) {
			parsedDate = moment(fallbackDate);
		}

		return parsedDate;
	}

	getTitle(parsedDate: moment.Moment) {
		return parsedDate.isValid()
			? upperCaseFirstLetter(parsedDate.format('dddd DD/MM'))
			: 'Date inconnue';
	}

	getGroupedCourses() {
		const activeCourses = this.props.schedule.courses 
			? this.props.schedule.courses.filter(c => c.category !== 'nocourse') 
			: [];
		return groupOverlappingCourses(activeCourses);
	}

	renderHeader(title: string, courseCount: number) {
		const { theme } = this.props;
		return (
			<TouchableOpacity
				onPress={this.toggleExpand}
				style={{
					paddingHorizontal: tokens.space.md,
					paddingVertical: tokens.space.sm,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between'
				}}
			>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					<Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: theme.font }}>
						{title}
					</Text>
					{courseCount > 0 && (
						<View style={{
							backgroundColor: theme.accent ? theme.accent + '20' : theme.primary + '20',
							borderRadius: tokens.radius.pill,
							paddingHorizontal: 8,
							paddingVertical: 2,
							marginLeft: tokens.space.sm
						}}>
							<Text style={{ color: theme.accent ?? theme.primary, fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.bold }}>
								{courseCount} cours
							</Text>
						</View>
					)}
				</View>
				<MaterialCommunityIcons name={this.state.expand ? 'chevron-up' : 'chevron-down'} size={24} color={theme.fontSecondary} />
			</TouchableOpacity>
		);
	}

	renderContent(groupedCourses: import('../services/PlanningApiService').PlanningEvent[][]) {
		const { theme } = this.props;
		if (groupedCourses.length === 0) {
			return (
				<View style={{ padding: tokens.space.md, alignItems: 'center' }}>
					<Text style={{ color: theme.fontSecondary }}>{Translator.get('NO_CLASS_THIS_DAY')}</Text>
				</View>
			);
		}
		
		return groupedCourses.map((group, index) => (
			<CourseGroupCarousel key={index} coursesGroup={group} theme={theme} />
		));
	}

	render() {
		const parsedDate = this.getParsedDate();
		const title = this.getTitle(parsedDate);
		const groupedCourses = this.getGroupedCourses();
		const courseCount = groupedCourses.length;

		return (
			<View style={{ marginBottom: tokens.space.sm }}>
				{this.renderHeader(title, courseCount)}
				<Collapsible collapsed={!this.state.expand}>
					{this.renderContent(groupedCourses)}
				</Collapsible>
			</View>
		);
	}
}
