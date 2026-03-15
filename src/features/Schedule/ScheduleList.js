import React from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import moment from 'moment';
import Collapsible from 'react-native-collapsible';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

import style, { tokens } from '../../shared/theme/Theme';
import { CourseRowWithNavigation as CourseRow, CourseGroupCarousel } from './CourseCard';

import { ErrorAlert } from '../../shared/ui/Alerts';
import Translator from '../../shared/i18n/Translator';
import { isConnected } from '../../shared/services/AppCore'
import { FetchManager } from '../../shared/services/DataService';
import { CourseManager, upperCaseFirstLetter, isArraysEquals } from '../../shared/services/AppCore';

export const groupOverlappingCourses = (courses) => {
    if (!courses || courses.length === 0) return [];
    if (courses.length === 1 && courses[0].category === 'nocourse') return [courses];

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };

    const sorted = [...courses].sort((a, b) => timeToMinutes(a.starttime) - timeToMinutes(b.starttime));

    const groups = [];
    let currentGroup = [sorted[0]];
    let groupEnd = timeToMinutes(sorted[0].endtime);

    for (let i = 1; i < sorted.length; i++) {
        const course = sorted[i];
        const start = timeToMinutes(course.starttime);
        const end = timeToMinutes(course.endtime);

        if (start < groupEnd) {
            currentGroup.push(course);
            groupEnd = Math.max(groupEnd, end);
        } else {
            groups.push(currentGroup);
            currentGroup = [course];
            groupEnd = end;
        }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
}

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
        const { theme, mode, navigation } = this.props;
        let content = null, cacheMessage = null;

        if (this.state.cacheDate !== null) {
            cacheMessage = (
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

        const listHeader = (
            <View style={{ paddingBottom: tokens.space.md, paddingTop: tokens.space.sm }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.font, textAlign: 'center', marginBottom: cacheMessage ? tokens.space.sm : 0 }}>
                    {this.displayTitle()}
                </Text>
                {cacheMessage}
            </View>
        );

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

            const groupedDaySchedule = groupOverlappingCourses(daySchedule);

            content = (
                <FlatList
                    data={groupedDaySchedule}
                    extraData={this.state}
                    ListHeaderComponent={listHeader}
                    renderItem={({ item }) => <CourseGroupCarousel coursesGroup={item} theme={theme} />}
                    keyExtractor={(item, index) => String(index)}
                    style={{ backgroundColor: theme.courseBackground }}
                    showsVerticalScrollIndicator={false}
                />
            );
        } else if (this.state.schedule instanceof Array && mode === 'week') {
            const isFavorite = this.state.groupName === this.state.groupName;
            content = (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                    {listHeader}
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

        return (
            <View style={[style.schedule.containerView, { flex: 1, backgroundColor: theme.courseBackground, marginTop: 0 }]}>
                <View style={style.schedule.contentView}>{content}</View>
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

            const groupedDaySchedule = groupOverlappingCourses(daySchedule);

            content = (
                <FlatList
                    data={groupedDaySchedule}
                    extraData={this.state}
                    renderItem={({ item }) => <CourseGroupCarousel coursesGroup={item} theme={theme} />}
                    keyExtractor={(item, index) => String(index)}
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