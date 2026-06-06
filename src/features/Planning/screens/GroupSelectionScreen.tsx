import React from 'react';
import { ActivityIndicator, Animated, SectionList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { AppContext, isConnected } from '../../../shared/services/AppCore'
import { PlanningApiService as FetchManager } from '../services/PlanningApiService';
import { NavBarHelper, SaveGroupButton } from '../../../shared/navigation/NavHelpers';
import { SectionListHeader, GroupRow } from '../components/GroupSelectionComponents';

export interface HomeScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export interface GroupItem {
    name: string;
    cleanName?: string;
    colorIndex?: number;
    sectionStyle?: Record<string, unknown>;
}

export interface HomeScreenState {
    completeList: GroupItem[] | null;
    sections: { key: string; data: GroupItem[]; sectionIndex: number; colorIndex: number }[] | null;
    list: GroupItem[] | null;
    emptySearchResults: boolean;
    refreshing: boolean;
    cacheDate: moment.MomentInput | null;
    searchText: string;
}

class HomeScreen extends React.Component<HomeScreenProps, HomeScreenState> {
    static contextType = AppContext;
    context!: React.ContextType<typeof AppContext>;
    scrollY: Animated.Value;

    constructor(props: HomeScreenProps) {
        super(props);
        this.scrollY = new Animated.Value(0);
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
        this.props.navigation.setOptions(
            NavBarHelper({
                title: Translator.get('GROUPS'),
                themeName: this.context.themeName,
                scrollY: this.scrollY,
                headerRight: () => (
                    <View style={{ paddingRight: tokens.space.md }}>
                        <SaveGroupButton
                            groupName={[]}
                            themeName={this.context.themeName}
                        />
                    </View>
                ),
            } as never)
        );
        await this.getList();
    }

    generateSections(list: GroupItem[], save = false) {
        let sections: { key: string; data: GroupItem[]; sectionIndex: number; colorIndex: number }[] = [];
        let sectionContent: { key: string; data: GroupItem[]; sectionIndex: number; colorIndex: number } | null = null;
        let previousSection: string | null = null;
        let sectionIndex = -1;

        list.forEach((e) => {
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

        if (sectionContent) {
            sections.push(sectionContent);
        }

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
        let cacheStr = await AsyncStorage.getItem('groups');
        if (cacheStr !== null) {
            const cache = JSON.parse(cacheStr) as { date: string; list: string[] };
            this.setState({ cacheDate: cache.date });
            return cache.list;
        }
        return null;
    };

    fetchList = async () => {
        let list = null;

        if (await isConnected()) {
            try {
                const groupList = await FetchManager.fetchGroupList();
                if (groupList === null) throw 'network error';

                this.setState({ cacheDate: null });
                list = groupList.map((e) => ({ name: e }));
                AsyncStorage.setItem('groups', JSON.stringify({ list, date: moment() })).catch((e) =>
                    console.warn('Échec de la mise en cache des groupes :', e)
                );
            } catch (error: unknown) {
                if (error && typeof error === 'object' && 'response' in error) {
                    Toast.show(Translator.get('ERROR_WITH_CODE'), {
                        duration: Toast.durations.LONG,
                        position: Toast.positions.BOTTOM,
                    });
                } else if (error && typeof error === 'object' && 'request' in error) {
                    Toast.show(Translator.get('NO_CONNECTION'), {
                        duration: Toast.durations.SHORT,
                        position: Toast.positions.BOTTOM,
                    });
                } else {
                    const msg = error instanceof Error ? error.message : String(error);
                    Toast.show(Translator.get('ERROR_WITH_MESSAGE', msg), {
                        duration: Toast.durations.LONG,
                        position: Toast.positions.BOTTOM,
                    });
                }
                list = await this.getCache();
            }
        } else {
            Toast.show(Translator.get('NO_CONNECTION'), {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });
            list = await this.getCache();
        }

        if (list !== null) {
            this.generateSections(list, true);
        }
    };

    openGroup = (name: string) => {
        const { navigate } = this.props.navigation;
        navigate('Group', { name });
    };

    search(input: string) {
        this.setState({ sections: null, emptySearchResults: false });
        let list = this.state.completeList;
        if (!list) return;

        if (input.length !== 0) {
            let regex = new RegExp(input, 'gi');
            list = list.filter((e: GroupItem) => {
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

    renderSearchInput(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.greyBackground,
                borderRadius: tokens.radius.md,
                paddingHorizontal: tokens.space.md,
                marginHorizontal: tokens.space.md,
                marginTop: tokens.space.xs,
                marginBottom: tokens.space.md,
                height: 40,
            }}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color={theme.fontSecondary}
                    style={{ marginRight: tokens.space.sm }}
                />
                <TextInput
                    style={{
                        flex: 1,
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
                    <TouchableOpacity
                        onPress={() => {
                            this.setState({ searchText: '' });
                            this.search('');
                        }}
                        style={{ padding: tokens.space.xs }}
                    >
                        <MaterialCommunityIcons name="close-circle" size={18} color={theme.fontSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    renderCacheDate(theme: import('../../../shared/theme/Theme').AppThemeType) {
        if (!this.state.cacheDate) return null;
        return (
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
                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                    {Translator.get('OFFLINE_DISPLAY_FROM_DATE', moment(this.state.cacheDate).format('DD/MM/YYYY HH:mm'))}
                </Text>
            </View>
        );
    }

    renderEmptyState(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <View style={[(style.schedule.course.noCourse as never), { backgroundColor: theme.greyBackground }]}>
                <MaterialCommunityIcons name="magnify-close" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.md, opacity: 0.4 }} />
                <Text style={[style.schedule.course.noCourseText as never, { color: theme.font }]}>
                    {Translator.get('NO_GROUP_FOUND_WITH_THIS_SEARCH')}
                </Text>
            </View>
        );
    }

    renderLoading(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} animating={true} />
            </View>
        );
    }

    renderList(theme: import('../../../shared/theme/Theme').AppThemeType) {
        return (
            <Animated.SectionList
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: this.scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: 0, paddingBottom: tokens.space.xxl }}
                scrollIndicatorInsets={{ top: 0 }}
                renderItem={({ item, index }: { item: GroupItem; index: number }) => (
                    <GroupRow name={item.name} cleanName={item.cleanName!} sectionStyle={item.sectionStyle!} key={index} color={theme.sections[item.colorIndex!]} fontColor={theme.font} openGroup={this.openGroup} />
                )}
                renderSectionHeader={({ section }: { section: { key: string; sectionIndex: number; colorIndex: number } }) => (
                    <SectionListHeader title={section.key} key={section.key} sectionIndex={section.sectionIndex} color={theme.sections[section.colorIndex]} headerColor={theme.sectionsHeaders[section.colorIndex]} />
                )}
                sections={this.state.sections as any}
                keyExtractor={(item, index) => index.toString()}
                initialNumToRender={20}
                onEndReachedThreshold={0.1}
                style={[style.list.sectionList as never, { backgroundColor: theme.greyBackground }]}
                onRefresh={this.refreshList}
                refreshing={this.state.refreshing}
                stickySectionHeadersEnabled={true}
                showsVerticalScrollIndicator={false}
            />
        );
    }

    renderContent(theme: import('../../../shared/theme/Theme').AppThemeType) {
        if (this.state.emptySearchResults) {
            return this.renderEmptyState(theme);
        } else if (this.state.sections === null) {
            return this.renderLoading(theme);
        } else {
            return this.renderList(theme);
        }
    }

    render() {
        const theme = style.Theme[this.context.themeName];

        return (
            <SafeAreaInsetsContext.Consumer>
                {(insets) => (
                    <View style={[style.list.homeView as never, { backgroundColor: theme.background }]}>
                        <View style={{ 
                            paddingTop: (insets?.top || 0) + 65,
                            backgroundColor: theme.cardBackground,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                            ...tokens.shadow.sm as object,
                        }}>
                            {this.renderSearchInput(theme)}
                            {this.renderCacheDate(theme)}
                        </View>
                        {this.renderContent(theme)}
                    </View>
                )}
            </SafeAreaInsetsContext.Consumer>
        );
    }
}

export default HomeScreen;