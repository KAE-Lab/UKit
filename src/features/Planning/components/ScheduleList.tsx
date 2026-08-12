import React from 'react';
import { ActivityIndicator, Animated, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import style, { tokens } from '../../../shared/theme/Theme';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { CourseGroupCarousel } from './CourseCard';
import { DayWeek } from './DayWeekCollapsible';
import { groupOverlappingCourses } from './ScheduleListUtils';

import { ErrorAlert } from '../../../shared/ui/Alerts';
import { SourceFailureNotice } from '../../../shared/ui/SourceFailureNotice';
import Translator from '../../../shared/i18n/Translator';
import { isConnected } from '../../../shared/services/AppCore'
import { ukitFailure, type UkitFailure } from '../../../shared/aetherius';
import { planningAbsent, planningDisponible } from '../../../shared/etablissements';
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
    /**
     * Le controleur du run en cours.
     *
     * Il remplace un `axios.CancelToken` qui etait cree, stocke et annule sans jamais etre transmis a
     * un appel : il n'annulait donc rien, et une reponse tardive pouvait ecrire dans l'etat d'un
     * composant demonte. Le moteur, lui, accepte le signal (docs/features/planning.md).
     */
    controller: AbortController | null;
    groupName: string | string[];
    target: moment.MomentInput | { week: number; year: number };
    schedule: import('../services/PlanningApiService').PlanningEvent[] | import('../services/PlanningApiService').PlanningWeekDay[] | null;
    cacheDate: moment.MomentInput | null;
    /** L'echec a afficher quand il n'y a ni reponse ni cache. `null` le reste du temps. */
    failure: UkitFailure | null;
    loading: boolean;
}

type ScheduleData =
    | import('../services/PlanningApiService').PlanningEvent[]
    | import('../services/PlanningApiService').PlanningWeekDay[];

/**
 * L'issue d'un chargement, avant qu'elle ne devienne un etat.
 *
 * Les trois champs sont exclusifs deux a deux : une donnee fraiche (`cacheDate` nul), une donnee de
 * cache (`cacheDate` renseigne, bandeau affiche), ou un echec (`data` nul). Les nommer ensemble evite
 * la troisieme combinaison, celle qui laissait la vue en chargement pour toujours.
 */
interface ScheduleIssue {
    data: ScheduleData | null;
    cacheDate: moment.MomentInput | null;
    failure: UkitFailure | null;
}

export class ScheduleList extends React.Component<ScheduleListProps, ScheduleListState> {
    _unsubscribe?: () => void;

    constructor(props: ScheduleListProps) {
        super(props);
        this.state = {
            controller: null,
            groupName: this.props.groupName,
            target: this.props.mode === 'day' ? moment(this.props.target) : this.props.target,
            schedule: null,
            cacheDate: null,
            failure: null,
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
        if (this.state.controller) this.state.controller.abort();
        if (this._unsubscribe) this._unsubscribe();
    }

    getCache = async (id: string) => {
        let cache = await AsyncStorage.getItem(id);
        if (cache !== null) return JSON.parse(cache);
        return null;
    };

    /** La cle de cache : le groupe — ou les favoris joints par `+` — puis la date ou la semaine. */
    cacheId(groupName: string | string[]): string {
        const groupPrefix = Array.isArray(groupName) ? groupName.join('+') : groupName;
        if (this.props.mode === 'day') {
            return `${groupPrefix}@${moment(this.state.target).format('YYYY/MM/DD')}`;
        }
        return `${groupPrefix}@Week${(this.state.target as { week: number }).week}`;
    }

    fetchSchedule = () => {
        if (this.state.loading && this.state.controller) this.state.controller.abort();

        const groupName = this.state.groupName;
        if (Array.isArray(groupName) && groupName.length === 0) {
            this.setState({ schedule: [], loading: false, controller: null, failure: null });
            return;
        }

        const controller = new AbortController();
        const id = this.cacheId(groupName);

        this.setState({ schedule: null, failure: null, loading: true, controller }, async () => {
            const issue = await this.loadSchedule(groupName, id, controller.signal);
            // Un run remplace par un plus recent, ou un composant demonte : l'etat ne nous appartient
            // plus, et c'est le run suivant qui l'ecrit.
            if (issue === null) return;
            this.applySchedule(issue);
        });
    };

    /**
     * Reseau d'abord des qu'une connexion est detectee, cache date en repli : le flux d'origine, a la
     * lettre. Seule la nature de l'appel du milieu a change.
     *
     * Rend `null` quand le run a ete annule — le seul cas ou il ne faut rien ecrire du tout.
     */
    loadSchedule = async (
        groupName: string | string[],
        id: string,
        signal: AbortSignal,
    ): Promise<ScheduleIssue | null> => {
        if (!(await isConnected())) {
            new ErrorAlert(Translator.get('NO_CONNECTION'), ErrorAlert.durations.SHORT).show();
            return this.cacheOrFailure(id, ukitFailure('unavailable', 'hors ligne, aucun cache pour cette date'));
        }

        if (this.props.mode === 'day') {
            const dateStr = moment(this.state.target).format('YYYY-MM-DD');
            const resultat = await FetchManager.fetchCalendarDay(groupName, dateStr, { signal });
            if (resultat.ok === false) {
                return resultat.failure.silent === true ? null : this.cacheOrFailure(id, resultat.failure);
            }
            return this.keep(id, resultat.courses);
        }

        const semaine = this.state.target as { week: number; year: number };
        const resultat = await FetchManager.fetchCalendarWeek(groupName, semaine, { signal });
        if (resultat.ok === false) {
            return resultat.failure.silent === true ? null : this.cacheOrFailure(id, resultat.failure);
        }
        return this.keep(id, resultat.week);
    };

    /** Une reponse fraiche : elle alimente le cache, comme avant. */
    keep(id: string, data: ScheduleData): ScheduleIssue {
        AsyncStorage.setItem(id, JSON.stringify({ data, date: moment() }));
        return { data, cacheDate: null, failure: null };
    }

    /**
     * Le repli : le cache s'il existe, l'echec sinon.
     *
     * Un cache servi **efface** l'echec — l'utilisateur voit sa journee, datee, et n'a rien a faire de
     * la panne. C'est quand il n'y a rien a montrer que l'echec devient l'ecran, au lieu d'un
     * indicateur qui tournait indefiniment avant ce jalon.
     */
    cacheOrFailure = async (id: string, failure: UkitFailure): Promise<ScheduleIssue> => {
        const cache = await this.getCache(id);
        if (cache) {
            return { data: cache.data || cache.dayData || cache.weekData, cacheDate: cache.date, failure: null };
        }
        return { data: null, cacheDate: null, failure };
    };

    applySchedule(issue: ScheduleIssue) {
        if (issue.data == null) {
            this.setState({ schedule: null, loading: false, controller: null, cacheDate: null, failure: issue.failure });
            return;
        }

        // Alimente les suggestions de recherche d'UE.
        try {
            DataManager.extractUEsFromCourses(issue.data);
        } catch (e) {
            console.warn('Failed to extract UEs:', e);
        }

        const isFavorite = Array.isArray(this.state.groupName);
        const schedule = this.props.mode === 'day'
            ? this.computeScheduleDay(issue.data as import('../services/PlanningApiService').PlanningEvent[], isFavorite)
            : issue.data;

        if (isFavorite) {
            NotificationManager.scheduleCourseNotifications(schedule).catch(e => console.warn('Notification scheduling error:', e));
        }

        this.setState({ schedule, loading: false, controller: null, cacheDate: issue.cacheDate, failure: null });
    }

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

    /**
     * L'echec, quand il ne reste ni reponse ni cache.
     *
     * Avant ce jalon, ce cas laissait l'indicateur de chargement tourner indefiniment : une source en
     * panne et un chargement lent etaient le meme ecran. Le bouton Reessayer n'apparait que si la
     * famille le justifie — c'est la table de shared/aetherius/failures.ts qui decide.
     */
    renderFailure(failure: UkitFailure) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.xxl }}>
                <SourceFailureNotice failure={failure} theme={this.props.theme} onRetry={this.fetchSchedule} />
            </View>
        );
    }

    renderContent(listHeader: React.ReactNode) {
        // L'absence d'emploi du temps gagne sur tout le reste, et l'ordre n'est pas indifferent :
        // une universite qui n'en publie pas n'a jamais de groupes favoris, donc l'ecran « ton
        // planning est vide » s'afficherait toujours — avec un bouton menant a une recherche de
        // groupes qui ne peut rien trouver. Constate sur appareil en verifiant le jalon 6-G.
        if (!planningDisponible()) {
            return this.renderFailure(planningAbsent());
        }
        if (Array.isArray(this.state.groupName) && this.state.groupName.length === 0) {
            return this.renderEmptyFavorites();
        } else if (this.state.failure !== null && this.state.failure.silent !== true) {
            return this.renderFailure(this.state.failure);
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