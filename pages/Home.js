import React from 'react';
import {
	ActivityIndicator,
	SectionList,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

import SectionListHeader from '../components/ui/SectionListHeader';
import Split from '../components/ui/Split';
import GroupRow from '../components/GroupRow';
import style, { tokens } from '../Style';
import Translator from '../utils/translator';
import DeviceUtils, { AppContext } from '../utils/DeviceUtils';
import FetchManager from '../utils/FetchManager';

class Home extends React.Component {
	static contextType = AppContext;

	constructor(props) {
		super(props);
		this.state = {
			completeList: null,
			sections: null,
			list: null,
			emptySearchResults: false,
			refreshing: false,
			cacheDate: null,
			searchText: '',
		};
	}

	async componentDidMount() {
		await this.getList();
	}

	generateSections(list, save = false) {
		let sections = [];
		let sectionContent = null;
		let previousSection = null;
		let sectionIndex = -1;

		list.forEach((e) => {
			// let splitName = e.name.split('_');
			let splitName = e.name.substring(0, 3);

			e.cleanName = e.name;

			if (splitName !== previousSection) {
				if (previousSection !== null) {
					sections.push(sectionContent);
				}

				previousSection = splitName;
				sectionContent = {
					key: previousSection,
					data: [],
					sectionIndex: ++sectionIndex,
					colorIndex: sectionIndex % style.Theme[this.context.themeName].sections.length,
				};
			}

			e.colorIndex = sectionContent.colorIndex;
			e.sectionStyle = style.list.sections[sectionIndex % style.list.sections.length];

			sectionContent.data.push(e);
		});

		sections.push(sectionContent);

		if (save) {
			this.setState({ list, sections, completeList: list, refreshing: false });
		} else {
			this.setState({ list, sections });
		}
	}

	refreshList = async () => {
		this.setState({ refreshing: true });
		await this.fetchList();
	};

	getList = async () => {
		await this.fetchList();
	};

	getCache = async () => {
		let cache = await AsyncStorage.getItem('groups');
		if (cache !== null) {
			cache = JSON.parse(cache);
			this.setState({ cacheDate: cache.date });
			return cache.list;
		}
		return null;
	};

	fetchList = async () => {
		let list = null;

		if (await DeviceUtils.isConnected()) {
			try {
				const groupList = await FetchManager.fetchGroupList();
				if (groupList === null) throw 'network error';

				this.setState({ cacheDate: null });
				list = groupList.map((e) => ({
					name: e,
				}));
				AsyncStorage.setItem('groups', JSON.stringify({ list, date: moment() }));
			} catch (error) {
				if (error.response) {
					Toast.show(Translator.get('ERROR_WITH_CODE'), {
						duration: Toast.durations.LONG,
						position: Toast.positions.BOTTOM,
						shadow: true,
						animation: true,
						hideOnPress: true,
						delay: 0,
					});
				} else if (error.request) {
					Toast.show(Translator.get('NO_CONNECTION'), {
						duration: Toast.durations.SHORT,
						position: Toast.positions.BOTTOM,
						shadow: true,
						animation: true,
						hideOnPress: true,
						delay: 0,
					});
				} else {
					Toast.show(Translator.get('ERROR_WITH_MESSAGE', error.message), {
						duration: Toast.durations.LONG,
						position: Toast.positions.BOTTOM,
						shadow: true,
						animation: true,
						hideOnPress: true,
					});
				}
				list = await this.getCache();
			}
		} else {
			Toast.show(Translator.get('NO_CONNECTION'), {
				duration: Toast.durations.SHORT,
				position: Toast.positions.BOTTOM,
				shadow: true,
				animation: true,
				hideOnPress: true,
				delay: 0,
			});
			list = await this.getCache();
		}

		if (list !== null) {
			this.generateSections(list, true);
		}
	};

	openGroup = (name) => {
		const { navigate } = this.props.navigation;
		navigate('Group', { name });
	};

	search(input) {
		this.setState({ sections: null, emptySearchResults: false });
		let list = this.state.completeList;
		if (input.length !== 0) {
			let regex = new RegExp(input, 'gi');
			list = list.filter((e) => {
				return e.name.replace(/_/g, ' ').match(regex);
			});
		}
		if (list.length > 0) {
			this.setState({ emptySearchResults: false });
			this.generateSections(list, false);
		} else {
			this.setState({ emptySearchResults: true });
		}
	}

	render() {
		const theme = style.Theme[this.context.themeName];

		let content = null;

		// ── Barre de recherche modernisée ─────────────────────────────
        const searchInput = (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.field,
                borderRadius: tokens.radius.lg,
                borderWidth: 1.5,
                borderColor: theme.fieldBorder,
                paddingHorizontal: tokens.space.md,
                marginHorizontal: tokens.space.md,
                marginVertical: tokens.space.md,
                ...tokens.shadow.sm,
            }}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={theme.icon}
                    style={{ marginRight: tokens.space.sm }}
                />
                <TextInput
                    style={{
                        flex: 1,
                        paddingVertical: tokens.space.sm,
                        fontSize: tokens.fontSize.md,
                        color: theme.font,
                    }}
                    placeholder={Translator.get('SEARCH')}
                    placeholderTextColor={theme.fontSecondary}
                    onChangeText={(text) => {
                        this.setState({ searchText: text });
                        this.search(text);
                    }}
                    value={this.state.searchText}
                    autoCorrect={false}
                />
                {this.state.searchText.length > 0 && (
                    <TouchableOpacity onPress={() => {
                        this.setState({ searchText: '' });
                        this.search('');
                    }}>
                        <MaterialCommunityIcons
                            name="close-circle"
                            size={18}
                            color={theme.fontSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        );

        // ── Message cache ─────────────────────────────────────────────
        const cache = this.state.cacheDate ? (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.greyBackground,
                paddingHorizontal: tokens.space.md,
                paddingVertical: tokens.space.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
            }}>
                <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={theme.fontSecondary}
                    style={{ marginRight: tokens.space.xs }}
                />
                <Text style={{
                    fontSize: tokens.fontSize.xs,
                    color: theme.fontSecondary,
                }}>
                    {Translator.get(
                        'OFFLINE_DISPLAY_FROM_DATE',
                        moment(this.state.cacheDate).format('DD/MM/YYYY HH:mm'),
                    )}
                </Text>
            </View>
        ) : null;

        // ── Contenu principal ─────────────────────────────────────────
        if (this.state.emptySearchResults) {
            content = (
                <View style={[
                    style.schedule.course.noCourse,
                    { backgroundColor: theme.greyBackground },
                ]}>
                    <MaterialCommunityIcons
                        name="magnify-close"
                        size={48}
                        color={theme.fontSecondary}
                        style={{ marginBottom: tokens.space.md, opacity: 0.4 }}
                    />
                    <Text style={[style.schedule.course.noCourseText, { color: theme.font }]}>
                        {Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}
                    </Text>
                </View>
            );
        } else if (this.state.sections === null) {
            content = (
                <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background }}>
                    <ActivityIndicator
                        size="large"
                        color={theme.primary}
                        animating={true}
                    />
                </View>
            );
        } else {
            content = (
                <SectionList
                    renderItem={({ item, index }) => (
                        <GroupRow
                            name={item.name}
                            cleanName={item.cleanName}
                            sectionStyle={item.sectionStyle}
                            key={index}
                            color={theme.sections[item.colorIndex]}
                            fontColor={theme.font}
                            openGroup={this.openGroup}
                        />
                    )}
                    renderSectionHeader={({ section }) => (
                        <SectionListHeader
                            title={section.key}
                            key={section.key}
                            sectionIndex={section.sectionIndex}
                            color={theme.sections[section.colorIndex]}
                            headerColor={theme.sectionsHeaders[section.colorIndex]}
                        />
                    )}
                    sections={this.state.sections}
                    keyExtractor={(item, index) => index.toString()}
                    initialNumToRender={20}
                    onEndReachedThreshold={0.1}
                    style={[style.list.sectionList, { backgroundColor: theme.greyBackground }]}
                    onRefresh={this.refreshList}
                    refreshing={this.state.refreshing}
                    stickySectionHeadersEnabled={true}
                    showsVerticalScrollIndicator={false}
                />
            );
        }

        return (
            <View style={[style.list.homeView, { backgroundColor: theme.background }]}>
                {searchInput}
                <Split lineColor={theme.border} noMargin={true} />
                {cache}
                {content}
            </View>
        );
	}
}

export default Home;
