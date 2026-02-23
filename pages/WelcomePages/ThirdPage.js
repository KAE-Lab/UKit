import React from 'react';
import {
	Text,
	View,
	TouchableOpacity,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SettingsManager from '../../utils/SettingsManager';
import Translator from '../../utils/translator';
import styles from '../../StyleWelcome';
import { tokens } from '../../Style';
import WelcomeButton from '../../components/buttons/WelcomeButton';
import WelcomePagination from '../../components/ui/WelcomePagination';
import WelcomeBackButton from '../../components/buttons/WelcomeBackButton';
import WelcomeYearButton from '../../components/WelcomeYearButton';
import WelcomeSeasonButton from '../../components/WelcomeSeasonButton';

const MAXIMUM_NUMBER_ITEMS_GROUPLIST = 10;

const UNIVERSITY_YEARS_LIST = [
	{
		id: 'L1',
		title: Translator.get('BACHELORS') + ' 1',
	},
	{
		id: 'L2',
		title: Translator.get('BACHELORS') + ' 2',
	},
	{
		id: 'L3',
		title: Translator.get('BACHELORS') + ' 3',
	},
	{
		id: 'M1',
		title: Translator.get('MASTERS') + ' 1',
	},
	{
		id: 'M2',
		title: Translator.get('MASTERS') + ' 2',
	},
	{
		id: 'AUTRE',
		title: Translator.get('OTHER'),
	},
];

const UNIVERSITY_SEASON_LIST = [
	{ id: 'autumn', title: 'AUTUMN' },
	{ id: 'spring', title: 'SPRING' },
];

const filterCaseAutumn = {
	L1: ['10', 'MIASHS1'],
	L2: ['30', 'MIASHS3'],
	L3: ['50', 'MIASHS5'],
	M1: ['M1', '70'],
	M2: ['M2', '90'],
	AUTRE: [''],
};

const filterCaseSpring = {
	L1: ['20', 'MIASHS2'],
	L2: ['40', 'MIASHS4'],
	L3: ['60', 'MIASHS6'],
	M1: ['M1', '80'],
	M2: ['M2', '000', '001', '002', '003', '004'],
	AUTRE: [''],
};

const filterSeason = {
	autumn: filterCaseAutumn,
	spring: filterCaseSpring,
};

const GroupItem = ({ item, index, selected, selectGroup, theme }) => {
	const _onPress = () => {
		selectGroup(item);
	};
	const styleButton = selected
		? styles[theme].whiteCardButtonSelected
		: styles[theme].whiteCardButton;
	const styleText = selected
		? styles[theme].whiteCardButtonTextSelected
		: styles[theme].whiteCardButtonText;

	return (
		<TouchableOpacity onPress={_onPress} key={index} style={styleButton}>
			<Text style={styleText}>{item}</Text>
		</TouchableOpacity>
	);
};

class ThirdWelcomePage extends React.Component {
	constructor(props) {
		super(props);
	}

	getYear = () => this.props.navigatorState.year;
	getSeason = () => this.props.navigatorState.season;
	getTextFilter = () => this.props.navigatorState.textFilter;
	getGroup = () => this.props.navigatorState.group;
	getGroupListFiltered = () => this.props.navigatorState.groupListFiltered;

	filterList = (year, season, textFilter) => {
		let newList = [];

		if (year && season) {
			const list = this.props.navigatorState.groupList;

			newList = list.filter((e) => {
				const groupName = e.toUpperCase();
				return filterSeason[season.id][year.id].some(
					(filter) =>
						groupName.includes(filter.toUpperCase()) &&
						groupName.includes(textFilter.toUpperCase()),
				);
			});
		}

		this.props.changeState({
			groupListFiltered: newList,
			year: year,
			season: season,
			textFilter: textFilter,
		});
	};

	onChangeText = (text) => {
		this.filterList(this.getYear(), this.getSeason(), text);
	};

	selectYear = (year) => {
		this.filterList(year, this.getSeason(), this.getTextFilter());
	};

	selectSeason = (season) => {
		this.filterList(this.getYear(), season, this.getTextFilter());
	};

	selectGroup = (group) => {
		const newGroup = this.getGroup() === group ? null : group;
		SettingsManager.setGroup(newGroup);
	};

	renderGroupListItem = ({ item, index }) => {
		const theme = this.props.navigatorState.theme;
		if (index > MAXIMUM_NUMBER_ITEMS_GROUPLIST) {
			return;
		}
		return (
			<GroupItem
				item={item}
				index={index}
				selected={this.getGroup() === item}
				selectGroup={this.selectGroup}
				theme={theme}
			/>
		);
	};

	extractGroupListItemId = (item) => {
		return item;
	};

	static getCalendarListItemLayout(data, index) {
		return {
			length: 50,
			offset: 50 * index,
			index,
		};
	}

	footerTextComponent = () => {
		const theme = this.props.navigatorState.theme;
		if (this.getTextFilter()) {
			if (this.getGroupListFiltered().length > MAXIMUM_NUMBER_ITEMS_GROUPLIST) {
				return (
					<>
						<Text style={styles[theme].greyBottomText}>
							{Translator.get(
								'HIDDEN_RESULT',
								this.getGroupListFiltered().length - MAXIMUM_NUMBER_ITEMS_GROUPLIST,
							)}
						</Text>
						<Text style={styles[theme].greyBottomText}>
							{Translator.get('USE_SEARCH_BAR')}
						</Text>
					</>
				);
			} else if (!this.getGroupListFiltered.length) {
				return (
					<Text style={styles[theme].greyBottomText}>
						{Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}
					</Text>
				);
			}
		} else {
			return (
				<Text style={styles[theme].greyBottomText}>{Translator.get('USE_SEARCH_BAR')}</Text>
			);
		}
	};

	navigateToNextPage = () => {
		const { navigation } = this.props;
		navigation.navigate('FourthWelcomePage');
	};

	render() {
		const { navigation } = this.props;
		const theme = this.props.navigatorState.theme;
		return (
			<LinearGradient
				style={{ flex: 1 }}
				colors={styles[theme].gradientColor}
				start={{ x: 0.05, y: 0.05 }}
				end={{ x: 0.95, y: 0.95 }}>
				<SafeAreaView style={{ flex: 1 }}>
					<KeyboardAvoidingView
						style={{ flex: 1 }}
						behavior={Platform.OS === 'ios' ? 'height' : undefined}>
						<WelcomeBackButton onPress={navigation.goBack} visible={true} />

						<ScrollView
							style={styles[theme].whiteCardContainer}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled">
							{/* ── Année ───────────────────────────────── */}
							<View style={styles[theme].whiteCard}>
								<Text style={styles[theme].whiteCardText}>
									{Translator.get('YOUR_YEAR')}
								</Text>
								<View
									style={{
										flexDirection: 'row',
										flexWrap: 'wrap',
										justifyContent: 'flex-start',
									}}>
									{UNIVERSITY_YEARS_LIST.map((yearEntry) => (
										<WelcomeYearButton
											key={yearEntry.id}
											yearEntry={yearEntry}
											selectYear={this.selectYear}
											getCurrentYear={this.getYear}
											theme={theme}
										/>
									))}
								</View>
							</View>

							{/* ── Semestre ────────────────────────────── */}
							<View style={styles[theme].whiteCard}>
								<Text style={styles[theme].whiteCardText}>
									{Translator.get('YOUR_SEMESTER')}
								</Text>
								{UNIVERSITY_SEASON_LIST.map((seasonEntry) => (
									<WelcomeSeasonButton
										key={seasonEntry.id}
										seasonEntry={seasonEntry}
										selectSeason={this.selectSeason}
										getCurrentSeason={this.getSeason}
										theme={theme}
									/>
								))}
							</View>

							{/* ── Groupe ──────────────────────────────── */}
							<View style={styles[theme].whiteCard}>
								<Text style={styles[theme].whiteCardText}>
									{Translator.get('YOUR_GROUP')}
								</Text>

								<View
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										backgroundColor: theme === 'dark' ? '#2D1A2E' : '#F5F7FA',
										borderRadius: tokens.radius.md,
										borderWidth: 1.5,
										borderColor: theme === 'dark' ? '#5A3A5C' : '#E0E4EA',
										paddingHorizontal: tokens.space.sm,
										marginBottom: tokens.space.sm,
									}}>
									<MaterialCommunityIcons
										name="magnify"
										size={20}
										color={styles[theme].placeholderTextColor}
										style={{ marginRight: tokens.space.xs }}
									/>
									<TextInput
										autoCorrect={false}
										style={[
											styles[theme].whiteCardGroupButton,
											styles[theme].whiteCardGroupText,
										]}
										defaultValue={this.getTextFilter()}
										placeholder={Translator.get('GROUP_NAME')}
										placeholderTextColor={styles[theme].placeholderTextColor}
										onChangeText={this.onChangeText}
									/>
								</View>
								<View
									style={{
										flexDirection: 'row',
										flexWrap: 'wrap',
									}}>
									{this.getGroupListFiltered()
										.slice(0, MAXIMUM_NUMBER_ITEMS_GROUPLIST + 1)
										.map((item, index) => (
											<GroupItem
												key={item}
												item={item}
												index={index}
												selected={this.getGroup() === item}
												selectGroup={this.selectGroup}
												theme={theme}
											/>
										))}
								</View>
								{this.footerTextComponent()}
							</View>
						</ScrollView>

						<WelcomeButton
							onPress={this.navigateToNextPage}
							buttonText={Translator.get('NEXT')}
							theme={theme}
						/>

						<WelcomePagination pageNumber={3} maxPage={4} theme={theme} />
					</KeyboardAvoidingView>
				</SafeAreaView>
			</LinearGradient>
		);
	}
}

export default ThirdWelcomePage;
