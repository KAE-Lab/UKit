import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { CourseData } from './CourseCard';
import { CalendarNewEventPrompt } from './CalendarNewEventPrompt';

export interface CourseRowProps {
	data: CourseData;
	theme: import('../../../shared/theme/Theme').AppThemeType;
	readOnly?: boolean;
	navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
	carouselMode?: boolean;
}

export interface CourseRowState {
	backgroundColor: string;
	borderColor: string;
	lineColor: string;
	popupVisible: boolean;
}

export class CourseRow extends React.Component<CourseRowProps, CourseRowState> {
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

	renderNoCourse() {
		const { theme } = this.props;
		return (
			<View style={style.schedule.course.noCourse as never}>
				<MaterialCommunityIcons
					name="calendar-blank-outline"
					size={36}
					color={theme.fontSecondary}
					style={{ opacity: 0.4, marginBottom: tokens.space.sm }}
				/>
				<Text
					style={[
						style.schedule.course.noCourseText as never,
						{ color: theme.fontSecondary },
					]}>
					{Translator.get('NO_CLASS_THIS_DAY')}
				</Text>
			</View>
		);
	}

	renderUE(theme: import('../../../shared/theme/Theme').AppThemeType) {
		if (!this.props.data.UE) return null;
		return (
			<View style={[style.schedule.course.line as never, { alignItems: 'center' }]}>
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
						fontWeight: tokens.fontWeight.medium as never,
					}}>
					{this.props.data.UE}
				</Text>
			</View>
		);
	}

	renderSubject(theme: import('../../../shared/theme/Theme').AppThemeType) {
		if (this.props.data.subject === 'N/C') return null;
		return (
			<Text style={[style.schedule.course.title as never, { color: theme.font, flex: 1 }]}>
				{this.props.data.subject.trim()}
			</Text>
		);
	}

	renderAnnotationsLine(line: string, index: number, theme: import('../../../shared/theme/Theme').AppThemeType, isLargeMode: boolean) {
		const trimmedLine = line.trim();
		if (!trimmedLine) return null;

		let iconName: 'info-outline' | 'date-range' | 'room' | 'group' | 'person' = 'info-outline';
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
					style.schedule.course.line as never,
					{ alignItems: 'flex-start', marginTop: isLargeMode ? 0 : tokens.space.xs },
				]}>
				<MaterialIcons
					name={iconName}
					size={isLargeMode ? 14 : 12}
					color={theme.fontSecondary}
					style={{
						marginRight: tokens.space.xs,
						marginTop: isLargeMode ? 2 : 1,
					}}
				/>
				<Text
					style={{
						fontSize: isLargeMode ? tokens.fontSize.sm : tokens.fontSize.xs,
						color: theme.fontSecondary,
						flex: 1,
					}}>
					{trimmedLine}
				</Text>
			</View>
		);
	}

	renderAnnotations(theme: import('../../../shared/theme/Theme').AppThemeType, isLargeMode: boolean) {
		if (!this.props.data.description) return null;
		
		const lines = this.props.data.description.split('\n');
		if (isLargeMode) {
			return (
				<View style={{ marginTop: tokens.space.sm }}>
					{lines.map((line, index) => this.renderAnnotationsLine(line, index, theme, true))}
				</View>
			);
		} else if (lines.length > 0) {
			return lines.map((line, index) => this.renderAnnotationsLine(line, index, theme, false));
		}
		return null;
	}

	renderContent(
		theme: import('../../../shared/theme/Theme').AppThemeType, 
		isLargeMode: boolean, 
		ue: React.ReactNode, 
		subject: React.ReactNode, 
		annotations: React.ReactNode
	) {
		return (
			<View
				style={[
					style.schedule.course.root as never,
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
						...tokens.shadow.sm as object as object,
					},
				]}>
				<View style={style.schedule.course.row as never}>
					<View
						style={[
							style.schedule.course.hours as never,
							{
								backgroundColor: `${this.state.lineColor}18`,
								borderRightWidth: 1,
								borderRightColor: `${this.state.lineColor}44`,
							},
						]}>
						<Text style={[style.schedule.course.hoursText as never, { color: theme.font }]}>
							{this.props.data.starttime}
						</Text>
						<View
							style={{
								width: 4,
								height: 4,
								borderRadius: tokens.radius.md,
								backgroundColor: this.state.lineColor,
								opacity: 0.6,
								marginVertical: tokens.space.xs,
							}}
						/>
						<Text
							style={[
								style.schedule.course.hoursText as never,
								{ color: theme.fontSecondary },
							]}>
							{this.props.data.endtime}
						</Text>
					</View>

					<View
						style={[style.schedule.course.contentBlock as never, { paddingLeft: tokens.space.sm }]}>
						<View style={style.schedule.course.contentType as never}>
							{subject}
							{this.props.data.category !== this.props.data.subject && (
								<View
									style={{
										backgroundColor: `${this.state.lineColor}22`,
										borderRadius: tokens.radius.md,
										paddingHorizontal: tokens.space.sm,
										paddingVertical: 2,
										marginLeft: tokens.space.xs,
									}}>
									<Text
										style={{
											fontSize: tokens.fontSize.xs,
											color: this.state.lineColor,
											fontWeight: tokens.fontWeight.semibold as never,
										}}>
										{this.props.data.category}
									</Text>
								</View>
							)}
						</View>

						{ue}
						{annotations}

						{/* Espace réservé pour les dots du carousel si activé */}
						{this.props.carouselMode && <View style={{ height: 8 }} />}
					</View>
				</View>
			</View>
		);
	}

	render() {
		const { theme } = this.props;

		if (this.props.data.category === 'nocourse') {
			return this.renderNoCourse();
		}

		if (this.props.data.category === 'masked') {
			return null;
		}

		const isLargeMode = this.props.readOnly === true;

		const ue = this.renderUE(theme);
		const subject = this.renderSubject(theme);
		const annotations = this.renderAnnotations(theme, isLargeMode);

		const content = this.renderContent(theme, isLargeMode, ue, subject, annotations);

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

export function CourseRowWithNavigation(props: Omit<CourseRowProps, 'navigation'>) {
	const navigation = useNavigation();
	return <CourseRow {...props} navigation={navigation} />;
}
