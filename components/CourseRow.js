import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import CalendarNewEventPrompt from './buttons/CalendarNewEventPrompt';
import style, { tokens } from '../Style';
import Translator from '../utils/translator';

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
									size={12} // 👈 Taille légèrement réduite pour la liste
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
						// flexShrink: 0,
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

						{/* UE */}
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

						{/* Annotations */}
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

export default function CourseRowWithNavigation(props) {
	const navigation = useNavigation();
	return <CourseRow {...props} navigation={navigation} />;
}
