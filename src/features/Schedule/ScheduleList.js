import React from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import moment from 'moment';
import Collapsible from 'react-native-collapsible';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

import style, { tokens } from '../../shared/theme/Theme';
import { CourseRowWithNavigation as CourseRow } from './CourseCard';

import { ErrorAlert } from '../../shared/ui/Alerts';
import Translator from '../../shared/i18n/Translator';
import { isConnected } from '../../shared/services/AppCore'
import { FetchManager } from '../../shared/services/DataService';
import { CourseManager, upperCaseFirstLetter, isArraysEquals } from '../../shared/services/AppCore';

// ── COMPOSANT COLLAPSIBLE POUR LA SEMAINE ─────────────
export class DayWeek extends React.Component {
    static propTypes = {
        schedule: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = { expand: false };
    }

    toggleExpand = () => {
        requestAnimationFrame(() => {
            this.setState({ expand: !this.state.expand });
        });
    };

    render() {
        const { theme, schedule } = this.props;
        const { expand } = this.state;
        const hasCourses = schedule.courses.length > 0;

        let content = null;

        if (!hasCourses) {
            content = (
                <View style={[
                    style.schedule.course.noCourse,
                    { backgroundColor: theme.courseBackground },
                ]}>
                    <MaterialCommunityIcons
                        name="calendar-blank-outline"
                        size={28}
                        color={theme.fontSecondary}
                        style={{ opacity: 0.4, marginBottom: tokens.space.xs }}
                    />
                    <Text style={[style.schedule.course.noCourseText, { color: theme.fontSecondary }]}>
                        {Translator.get('NO_CLASS_THIS_DAY')}
                    </Text>
                </View>
            );
        } else if (expand) {
            content = (
                <View key={schedule.dayNumber}>
                    {schedule.courses.map((item, index) => (
                        <CourseRow
                            key={String(item.dayNumber) + String(index)}
                            data={item}
                            theme={theme}
                        />
                    ))}
                </View>
            );
        }

        return (
            <View style={{ marginBottom: tokens.space.xs, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <TouchableOpacity
                    onPress={this.toggleExpand}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: tokens.space.md,
                        paddingVertical: tokens.space.md,
                        backgroundColor: expand ? theme.cardBackground : theme.greyBackground,
                    }}>
                    <MaterialCommunityIcons name={expand ? 'chevron-up' : 'chevron-down'} size={22} color={expand ? theme.primary : theme.fontSecondary} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: theme.font }}>
                            {upperCaseFirstLetter(moment.unix(schedule.dayTimestamp).format('dddd L'))}
                        </Text>
                        {hasCourses && (
                            <View style={{
                                backgroundColor: expand ? theme.primary : theme.greyBackground,
                                borderRadius: tokens.radius.pill, paddingHorizontal: tokens.space.sm,
                                paddingVertical: 2, marginLeft: tokens.space.sm, borderWidth: 1,
                                borderColor: expand ? theme.primary : theme.border,
                            }}>
                                <Text style={{ fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.semibold, color: expand ? '#FFFFFF' : theme.fontSecondary }}>
                                    {schedule.courses.length}
                                </Text>
                            </View>
                        )}
                    </View>
                    <MaterialCommunityIcons name={expand ? 'chevron-up' : 'chevron-down'} size={22} color={expand ? theme.primary : theme.fontSecondary} />
                </TouchableOpacity>
                <Collapsible collapsed={!expand} align="top">
                    {content}
                </Collapsible>
            </View>
        );
    }
}

// ── LISTE DES COURS ──────
export default class ScheduleList extends React.Component {
    constructor(props) {
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

    componentDidUpdate(prevProps, prevState) {
        if (this.state.groupName !== prevProps.groupName) {
            if (this.props.filtersList && this.props.filtersList.length > 0) {
                this.fetchSchedule();
            }
        } else if (this.props.mode === 'day' && this.state.target !== prevState.target) {
            this.fetchSchedule();
        } else if (this.props.mode === 'week' && this.state.target.week !== prevState.target.week) {
            this.fetchSchedule();
        } else if (!isArraysEquals(this.props.filtersList, prevProps.filtersList)) {
            this.fetchSchedule();
        }
    }

    componentWillUnmount() {
        if (this.state.cancelToken) {
            this.state.cancelToken.cancel('Operation canceled due component being unmounted.');
        }
        if (this._unsubscribe) this._unsubscribe();
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const nextState = {};
        if (nextProps.mode === 'day' && nextProps.target !== prevState.target) {
            nextState.target = nextProps.target;
        } else if (nextProps.mode === 'week' && nextProps.target.week !== prevState.target.week) {
            nextState.target = nextProps.target;
        }
        return Object.keys(nextState).length > 0 ? nextState : null;
    }

    getCache = async (id) => {
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
        const mode = this.props.mode;

        let id;
        if (mode === 'day') {
            const date = moment(this.state.target).format('YYYY/MM/DD');
            id = `${groupName}@${date}`;
        } else {
            id = `${groupName}@Week${this.state.target.week}`;
        }

        this.setState({ schedule: null, loading: true, cancelToken }, async () => {
            let fetchedData = null;
            let cacheDate = null;

            if (await isConnected()) {
                try {
                    if (mode === 'day') {
                        const dateStr = moment(this.state.target).format('YYYY/MM/DD').replace(/\//g, '-');
                        fetchedData = await FetchManager.fetchCalendarDay(groupName, dateStr);
                    } else {
                        fetchedData = await FetchManager.fetchCalendarWeek(groupName, this.state.target);
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
                let schedule;
                if (mode === 'day') {
                    schedule = this.computeScheduleDay(fetchedData, this.state.groupName === this.state.groupName);
                } else {
                    schedule = fetchedData;
                }
                this.setState({ schedule, loading: false, cancelToken: null, cacheDate });
            }
        });
    };

    computeScheduleDay(schedule, isFavorite) {
        return schedule
            .map((course) => CourseManager.computeCourseUE(course))
            .filter((course) => CourseManager.filterCourse(isFavorite, course, this.props.filtersList));
    }

    computeScheduleWeek(schedule, isFavorite) {
        return {
            ...schedule,
            courses: schedule.courses
                .map((course) => CourseManager.computeCourseUE(course))
                .filter((course) => CourseManager.filterCourse(isFavorite, course, this.props.filtersList))
        };
    }

    displayTitle() {
        if (this.props.mode === 'day') {
            return upperCaseFirstLetter(moment(this.state.target).format('dddd L'));
        } else {
            return Translator.get('WEEK') + ' ' + this.state.target.week;
        }
    }

    render() {
        const { theme, mode, navigation } = this.props;
        let content = null, cacheMessage = null;

        if (this.state.schedule === null) {
            content = (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator style={{ margin: tokens.space.lg }} size="large" color={theme.primary} animating={true} />
                </View>
            );
        } else if (this.state.schedule instanceof Array && mode === 'day') {
            let daySchedule = this.state.schedule;
            if (moment(this.state.target).day() === 0 || daySchedule.length === 0) {
                daySchedule = [{ schedule: 0, category: 'nocourse' }];
            }

            content = (
                <FlatList
                    data={daySchedule}
                    extraData={this.state}
                    renderItem={({ item }) => <CourseRow data={item} theme={theme} />}
                    keyExtractor={(item, index) => item.schedule + String(index)}
                    style={{ backgroundColor: theme.courseBackground }}
                />
            );
        } else if (this.state.schedule instanceof Array && mode === 'week') {
            const isFavorite = this.state.groupName === this.state.groupName;
            content = (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                    {this.state.schedule.map((scheduleItem, index) => (
                        <DayWeek
                            key={index}
                            schedule={this.computeScheduleWeek(scheduleItem, isFavorite)}
                            navigation={navigation}
                            theme={theme}
                        />
                    ))}
                </ScrollView>
            );
        }

        if (this.state.cacheDate !== null) {
            cacheMessage = (
                <View style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.greyBackground,
                    paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm,
                    borderBottomWidth: 1, borderBottomColor: theme.border,
                }}>
                    {mode === 'week' && <MaterialCommunityIcons name="clock-outline" size={14} color={theme.fontSecondary} style={{ marginRight: tokens.space.xs }} />}
                    <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                        {Translator.get('OFFLINE_DISPLAY_FROM_DATE', moment(this.state.cacheDate).format('lll'))}
                    </Text>
                </View>
            );
        }

        return (
            <View style={[style.schedule.containerView, { flex: 1, backgroundColor: theme.courseBackground }]}>
                <View style={[style.schedule.titleView, { borderBottomColor: theme.border, paddingTop: 10, paddingBottom: 10, marginBottom: 3, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={[style.schedule.titleText, { color: theme.font, textAlign: 'center' }]}>
                        {this.displayTitle()}
                    </Text>
                </View>

                {cacheMessage}
                <View style={style.schedule.contentView}>{content}</View>
            </View>
        );
    }
}

export const DayComponent = (props) => <ScheduleList mode="day" target={props.day} {...props} />;
export const WeekComponent = (props) => <ScheduleList mode="week" target={props.week} {...props} />;