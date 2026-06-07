import React from 'react';
import { ActivityIndicator, Animated, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../../shared/theme/Theme';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { CourseGroupCarousel } from './CourseCard';
import { DayWeek } from './DayWeekCollapsible';
import { groupOverlappingCourses } from './ScheduleListUtils';

import { ErrorAlert } from '../../../shared/ui/Alerts';
import Translator from '../../../shared/i18n/Translator';
import { isConnected } from '../../../shared/services/AppCore'
import { PlanningApiService as FetchManager } from '../services/PlanningApiService';
import { PlanningDataManager as DataManager } from '../services/PlanningDataManager';
import { CourseManager, upperCaseFirstLetter, isArraysEquals } from '../../../shared/services/AppCore';
import { NotificationManager } from '../../../shared/services/NotificationService';

export interface ScheduleListProps {
    groupName: string | string[];
    mode: 'day' | 'week';
    target: moment.MomentInput | { week: number; year: number };
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    filtersList?: string[];
    theme: import('../../../shared/theme/Theme').AppThemeType;
    onAnimatedScroll?: (event: import('react-native').NativeSyntheticEvent<import('react-native').NativeScrollEvent>) => void;
}

export interface ScheduleListState {
    cancelToken: import('axios').CancelTokenSource | null;
    groupName: string | string[];
    target: moment.MomentInput | { week: number; year: number };
    schedule: import('../services/PlanningApiService').PlanningEvent[] | import('../services/PlanningApiService').PlanningWeekDay[] | null;
    cacheDate: moment.MomentInput | null;
    loading: boolean;
}

export class ScheduleList extends React.Component<ScheduleListProps, ScheduleListState> {
    _unsubscribe?: () => void;

    constructor(props: ScheduleListProps) {
        super(props);
        this.state = {
            cancelToken: null,
            groupName: this.props.groupName,
            target: this.props.mode === 'day' ? moment(this.props.target) : this.props.target,
            schedule: null,
            cacheDate: null,
            loading: false,
        };
    }

    componentDidMount() {
        this.fetchSchedule();
        if (this.props.mode === 'day' && this.props.navigation) {
            this._unsubscribe = this.props.navigation.addListener('focus', () => {
                this.fetchSchedule();
            });
        }
    }

    componentDidUpdate(prevProps: ScheduleListProps, prevState: ScheduleListState) {
        if (this.state.groupName !== prevState.groupName) {
            this.fetchSchedule();
        } else if (this.props.mode === 'day' && this.state.target !== prevState.target) {
            this.fetchSchedule();
        } else if (this.props.mode === 'week' && (this.state.target as { week: number }).week !== (prevState.target as { week: number }).week) {
            this.fetchSchedule();
        } else if (!isArraysEquals(this.props.filtersList || [], prevProps.filtersList || [])) {
            this.fetchSchedule();
        }
    }

    static getDerivedStateFromProps(nextProps: ScheduleListProps, prevState: ScheduleListState) {
        const nextState: Partial<ScheduleListState> = {};
        if (nextProps.mode === 'day' && nextProps.target !== prevState.target) {
            nextState.target = nextProps.target;
        } else if (nextProps.mode === 'week' && (nextProps.target as { week: number }).week !== (prevState.target as { week: number }).week) {
            nextState.target = nextProps.target;
        }

        const isArrayNext = Array.isArray(nextProps.groupName);
        const isArrayPrev = Array.isArray(prevState.groupName);
        if (isArrayNext !== isArrayPrev) {
            nextState.groupName = nextProps.groupName;
        } else if (isArrayNext && isArrayPrev) {
            if (!isArraysEquals(nextProps.groupName as string[], prevState.groupName as string[])) {
                nextState.groupName = nextProps.groupName;
            }
        } else if (nextProps.groupName !== prevState.groupName) {
            nextState.groupName = nextProps.groupName;
        }

        return Object.keys(nextState).length > 0 ? nextState : null;
    }

    componentWillUnmount() {
        if (this.state.cancelToken) {
            this.state.cancelToken.cancel('Operation canceled due component being unmounted.');
        }
        if (this._unsubscribe) this._unsubscribe();
    }

    getCache = async (id: string) => {
        let cache = await AsyncStorage.getItem(id);
        if (cache !== null) return JSON.parse(cache);
        return null;
    };

    fetchSchedule = () => {
        if (this.state.loading && this.state.cancelToken) {
            this.state.cancelToken.cancel('Another request called');
        }

        const cancelToken = axios.CancelToken.source();
        const groupName = this.state.groupName;
        
        if (Array.isArray(groupName) && groupName.length === 0) {
            this.setState({ schedule: [], loading: false, cancelToken: null });
            return;
        }

        const mode = this.props.mode;

        const groupPrefix = Array.isArray(groupName) ? groupName.join('+') : groupName;
        let id;
        if (mode === 'day') {
            const date = moment(this.state.target).format('YYYY/MM/DD');
            id = `${groupPrefix}@${date}`;
        } else {
            id = `${groupPrefix}@Week${(this.state.target as { week: number }).week}`;
        }

        this.setState({ schedule: null, loading: true, cancelToken }, async () => {
            let fetchedData = null;
            let cacheDate = null;

            if (await isConnected()) {
                try {
                    if (mode === 'day') {
                        const dateStr = moment(this.state.target).format('YYYY/MM/DD').replace(/\//g, '-');
                        fetchedData = await FetchManager.fetchCalendarDay(groupName as string, dateStr);
                    } else {
                        fetchedData = await FetchManager.fetchCalendarWeek(groupName as string, this.state.target as { week: number; year: number });
                    }
                    if (fetchedData === null) throw 'network error';
                    AsyncStorage.setItem(id, JSON.stringify({ data: fetchedData, date: moment() }));
                } catch (error) {
                    let cache = await this.getCache(id);
                    if (cache) {
                        fetchedData = cache.data || cache.dayData || cache.weekData;
                        cacheDate = cache.date;
                    }
                }
            } else {
                const offlineAlert = new ErrorAlert(Translator.get('NO_CONNECTION'), ErrorAlert.durations.SHORT);
                offlineAlert.show();

                let cache = await this.getCache(id);
                if (cache) {
                    fetchedData = cache.data || cache.dayData || cache.weekData;
                    cacheDate = cache.date;
                }
            }

            if (fetchedData != null) {
                // Extract available UEs from fetched data for search suggestions
                try {
                    DataManager.extractUEsFromCourses(fetchedData);
                } catch (e) {
                    console.warn('Failed to extract UEs:', e);
                }

                let schedule;
                if (mode === 'day') {
                    schedule = this.computeScheduleDay(fetchedData, Array.isArray(this.state.groupName));
                } else {
                    schedule = fetchedData;
                }
                
                // If this is the user's favorite group, schedule notifications
                if (Array.isArray(this.state.groupName)) {
                    // Call the notification manager to handle scheduling
                    NotificationManager.scheduleCourseNotifications(schedule).catch(e => console.warn('Notification scheduling error:', e));
                }

                this.setState({ schedule, loading: false, cancelToken: null, cacheDate });
            }
        });
    };

    computeScheduleDay(schedule: import('../services/PlanningApiService').PlanningEvent[], isFavorite: boolean) {
        return schedule
            .map((course) => CourseManager.computeCourseUE(course as unknown as Record<string, unknown>) as unknown as import('../services/PlanningApiService').PlanningEvent)
            .filter((course) => CourseManager.filterCourse(isFavorite, course as any, this.props.filtersList));
    }

    computeScheduleWeek(schedule: import('../services/PlanningApiService').PlanningWeekDay, isFavorite: boolean) {
        return {
            ...schedule,
            courses: schedule.courses
                .map((course) => CourseManager.computeCourseUE(course as unknown as Record<string, unknown>) as unknown as import('../services/PlanningApiService').PlanningEvent)
                .filter((course) => CourseManager.filterCourse(isFavorite, course as any, this.props.filtersList))
        };
    }

    renderCacheMessage() {
        const { theme, mode } = this.props;
        if (this.state.cacheDate === null) return null;
        return (
            <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: theme.greyBackground,
                paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm,
                borderRadius: tokens.radius.md, marginBottom: tokens.space.md, marginHorizontal: tokens.space.md
            }}>
                {mode === 'week' && <MaterialCommunityIcons name="clock-outline" size={14} color={theme.fontSecondary} style={{ marginRight: tokens.space.xs }} />}
                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                    {Translator.get('OFFLINE_DISPLAY_FROM_DATE', moment(this.state.cacheDate).format('lll'))}
                </Text>
            </View>
        );
    }

    renderEmptyFavorites() {
        const { theme, navigation } = this.props;
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 80 }}>
                <MaterialCommunityIcons name="star-outline" size={60} color={theme.fontSecondary} style={{ marginBottom: tokens.space.lg }} />
                <Text style={{ color: theme.font, fontSize: tokens.fontSize.lg, fontWeight: 'bold', textAlign: 'center', marginBottom: tokens.space.md }}>
                    {Translator.get('FAVORITES_EMPTY_TITLE') || "Votre planning est vide"}
                </Text>
                <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.md, textAlign: 'center', lineHeight: 22 }}>
                    {Translator.get('FAVORITES_EMPTY') || "Votre liste de favoris est vide. Recherchez un groupe dans la liste pour l'ajouter \u00e0 un de vos favoris !"}
                </Text>
                <TouchableOpacity style={{ marginTop: 30, backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }} onPress={() => navigation?.navigate('GroupSearch')}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{Translator.get('GROUPS_LIST') || "Groupes"}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    renderLoading() {
        const { theme } = this.props;
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator style={{ margin: tokens.space.lg }} size="large" color={theme.primary} animating={true} />
            </View>
        );
    }

    renderDayMode(listHeader: React.ReactNode) {
        const { theme } = this.props;
        let daySchedule = this.state.schedule as import('../services/PlanningApiService').PlanningEvent[];
        if (moment(this.state.target).day() === 0 || daySchedule.length === 0) {
            daySchedule = [{ schedule: '0', category: 'nocourse' } as unknown as import('../services/PlanningApiService').PlanningEvent];
        }
        const groupedDaySchedule = groupOverlappingCourses(daySchedule);

        return (
            <Animated.FlatList
                data={groupedDaySchedule}
                extraData={this.state}
                ListHeaderComponent={listHeader as never}
                renderItem={({ item }) => <CourseGroupCarousel coursesGroup={item as import('../services/PlanningApiService').PlanningEvent[]} theme={theme} />}
                keyExtractor={(item, index) => String(index)}
                style={{ backgroundColor: theme.courseBackground }}
                contentContainerStyle={{ paddingTop: tokens.space.sm, paddingBottom: tokens.space.xxl + 80 }}
                showsVerticalScrollIndicator={false}
                onScroll={this.props.onAnimatedScroll}
                scrollEventThrottle={16}
            />
        );
    }

    renderWeekMode(listHeader: React.ReactNode) {
        const { theme, navigation } = this.props;
        const isFavorite = Array.isArray(this.state.groupName);
        const targetObject = this.state.target as { week: number; year: number };
        const targetYear = targetObject.year || moment().year();
        const targetWeek = targetObject.week;
        const weekSchedule = this.state.schedule as import('../services/PlanningApiService').PlanningWeekDay[];

        return (
            <Animated.ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{ flex: 1, backgroundColor: theme.courseBackground }}
                contentContainerStyle={{ paddingTop: tokens.space.sm, paddingBottom: tokens.space.xxl + 80 }}
                onScroll={this.props.onAnimatedScroll}
                scrollEventThrottle={16}
            >
                {listHeader}
                {weekSchedule.map((scheduleItem, index) => {
                    const fallbackDate = moment().year(targetYear).isoWeek(targetWeek).isoWeekday(index + 1);
                    return (
                        <DayWeek
                            key={index}
                            schedule={this.computeScheduleWeek(scheduleItem, isFavorite) as any}
                            navigation={navigation}
                            theme={theme}
                            fallbackDate={fallbackDate}
                        />
                    );
                })}
            </Animated.ScrollView>
        );
    }

    renderContent(listHeader: React.ReactNode) {
        if (Array.isArray(this.state.groupName) && this.state.groupName.length === 0) {
            return this.renderEmptyFavorites();
        } else if (this.state.schedule === null) {
            return this.renderLoading();
        } else if (this.state.schedule instanceof Array && this.props.mode === 'day') {
            return this.renderDayMode(listHeader);
        } else if (this.state.schedule instanceof Array && this.props.mode === 'week') {
            return this.renderWeekMode(listHeader);
        }
        return null;
    }

    render() {
        const { theme } = this.props;
        const cacheMessage = this.renderCacheMessage();
        const listHeader = cacheMessage ? (
            <View style={{ paddingBottom: tokens.space.sm }}>{cacheMessage}</View>
        ) : null;

        return (
            <View style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                {this.renderContent(listHeader)}
            </View>
        );
    }
}

const AnimatedScheduleList = withHeaderAnimation(ScheduleList);

export const DayComponent = (props: Omit<ScheduleListProps, 'mode' | 'target'> & { day: moment.MomentInput }) => <AnimatedScheduleList mode="day" target={props.day} {...props} />;
export const WeekComponent = (props: Omit<ScheduleListProps, 'mode' | 'target'> & { week: { week: number; year: number } }) => <AnimatedScheduleList mode="week" target={props.week} {...props} />;