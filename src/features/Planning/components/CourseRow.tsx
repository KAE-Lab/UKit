import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import style, { tokens } from '../../../shared/theme/Theme';
import { CourseData } from './CourseCard';
import { iconeDAnnotation } from './CourseAnnotations';
import { CalendarNewEventPrompt } from './CalendarNewEventPrompt';

export interface CourseRowProps {
	data: CourseData;
	theme: import('../../../shared/theme/Theme').AppThemeType;
	readOnly?: boolean;
	navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
	carouselMode?: boolean;
}

/**
 * La place laissee a l'indicateur de pages du carrousel par la derniere ligne d'infos.
 *
 * L'indicateur (CourseGroupCarousel) est pose en absolu dans le coin bas droit, a hauteur de la
 * derniere ligne. Celle-ci se tronque donc avant de passer dessous — la suite se lit dans le
 * detail du cours. La reserve couvre jusqu'a cinq cours superposes ; un spacer sous le contenu a
 * ete essaye et defait : il rendait les cartes du carrousel plus hautes que les cartes seules.
 */
const RESERVE_INDICATEUR = 72;

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
			// En carrousel le titre tient sur **une** ligne, coupe en points de suspension : c'est
			// lui qui creusait les ecarts de hauteur entre cours superposes, et l'UE puis le detail
			// portent l'intitule complet. Deux lignes reservees ont ete essayees et defaites — deux
			// fois : bornees sans etirement, il restait une ligne d'ecart ; etirees, le titre court
			// trainait un blanc entier sous lui, lu comme un trou.
			<Text
				numberOfLines={this.props.carouselMode ? 1 : undefined}
				style={[style.schedule.course.title as never, { color: theme.font, flex: 1 }]}>
				{this.props.data.subject.trim()}
			</Text>
		);
	}

	renderAnnotationsLine(line: string, index: number, theme: import('../../../shared/theme/Theme').AppThemeType, isLargeMode: boolean, estDerniere = false) {
		const trimmedLine = line.trim();
		if (!trimmedLine) return null;

		// L'icone se deduit du contenu de la ligne, jamais de son rang : avec deux sources d'emploi
		// du temps, le rang ne veut plus rien dire (CourseAnnotations.ts).
		const iconName = iconeDAnnotation(trimmedLine);

		// En carrousel, chaque ligne d'infos tient sur une seule ligne : avec le titre borne, les
		// cours superposes convergent vers la meme hauteur au lieu de dependre de qui wrappe. La
		// derniere partage en plus son rang avec l'indicateur de pages : elle lui laisse le coin
		// droit et se coupe en points de suspension plutot que de passer dessous.
		const cedeALIndicateur = this.props.carouselMode && estDerniere;

		return (
			<View
				key={index}
				style={[
					style.schedule.course.line as never,
					{ alignItems: 'flex-start', marginTop: isLargeMode ? 0 : tokens.space.xs },
					cedeALIndicateur && { marginRight: RESERVE_INDICATEUR },
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
					numberOfLines={this.props.carouselMode ? 1 : undefined}
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
		// La derniere ligne **rendue** : une description peut finir par des lignes vides, que le
		// rendu ecarte — c'est la derniere non vide qui cotoie l'indicateur du carrousel.
		let derniere = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim()) derniere = i;
		}
		if (isLargeMode) {
			return (
				<View style={{ marginTop: tokens.space.sm }}>
					{lines.map((line, index) => this.renderAnnotationsLine(line, index, theme, true))}
				</View>
			);
		} else if (lines.length > 0) {
			return lines.map((line, index) => this.renderAnnotationsLine(line, index, theme, false, index === derniere));
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
						// En carrousel les hauteurs convergent d'abord par le **gabarit** — titre a
						// deux lignes, une ligne par info — et l'etirement sur la rangee n'absorbe
						// que le reliquat. L'etirement seul a ete essaye et defait : sans gabarit
						// borne, la carte courte s'etirait de tout l'ecart de contenu et le vide en
						// fond de carte etait aussi laid que l'ancien trou de fond de page.
						flex: this.props.carouselMode ? 1 : 0,
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
							{this.props.data.category !== '' && this.props.data.category !== this.props.data.subject && (
								<View
									style={{
										backgroundColor: `${this.state.lineColor}22`,
										borderRadius: tokens.radius.md,
										paddingHorizontal: tokens.space.sm,
										paddingVertical: tokens.space.xxs,
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
					</View>
				</View>
			</View>
		);
	}

	render() {
		const { theme } = this.props;

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
			// La chaine de `flex: 1` ne vit qu'en carrousel : elle porte l'etirement de la carte
			// jusqu'a la racine de la page (voir renderContent). Hors carrousel, rien ne change.
			<View style={this.props.carouselMode ? { flex: 1 } : undefined}>
				<TouchableOpacity
					style={this.props.carouselMode ? { flex: 1 } : undefined}
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
