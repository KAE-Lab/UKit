import React, { useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import moment from 'moment';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { FetchManager } from '../../../shared/services/DataService';
import Translator from '../../../shared/i18n/Translator';

const NextCourseWidget = ({ navigation }) => {
    const { themeName, favoriteGroups } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const [nextCourse, setNextCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadNextCourse = async () => {
            if (!favoriteGroups || favoriteGroups.length === 0) {
                if (isMounted) {
                    setNextCourse('no_group');
                    setLoading(false);
                }
                return;
            }

            try {
                // Pour simplifier, on regarde seulement aujourd'hui et demain
                let date = moment().format('YYYY-MM-DD');
                let foundCourse = null;

                // On regarde sur 2 jours pour trouver le prochain cours
                for (let i = 0; i < 2 && !foundCourse; i++) {
                    const searchDate = moment().add(i, 'days').format('YYYY-MM-DD');
                    
                    // Récupération des cours pour tous les groupes favoris
                    const promises = favoriteGroups.map(group => 
                        FetchManager.fetchCalendarDay(group, searchDate)
                    );
                    
                    const results = await Promise.all(promises);
                    let allCourses = [];
                    
                    results.forEach(dayCourses => {
                        if (dayCourses) {
                            allCourses = [...allCourses, ...dayCourses];
                        }
                    });

                    // Tri des cours par heure de début
                    allCourses.sort((a, b) => a.starttime.localeCompare(b.starttime));

                    // Trouver le premier cours qui n'est pas encore terminé
                    const currentTime = moment();
                    for (const course of allCourses) {
                        const courseEndTime = moment(`${searchDate} ${course.endtime}`, 'YYYY-MM-DD HH:mm');
                        if (courseEndTime.isAfter(currentTime)) {
                            foundCourse = { ...course, searchDate };
                            break;
                        }
                    }
                }

                if (isMounted) {
                    setNextCourse(foundCourse);
                    setLoading(false);
                }
            } catch (error) {
                if (isMounted) {
                    setNextCourse(null);
                    setLoading(false);
                }
            }
        };

        loadNextCourse();

        return () => { isMounted = false; };
    }, [favoriteGroups]);

    const handlePress = () => {
        if (favoriteGroups && favoriteGroups.length > 0) {
            navigation.navigate('Group', { name: favoriteGroups });
        } else {
            navigation.navigate('Stack', { screen: 'GroupSearch' });
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="small" color={theme.primary} />
                </View>
            );
        }

        if (nextCourse === 'no_group') {
            return (
                <View style={styles.centerContent}>
                    <Text style={[styles.emptyText, { color: theme.fontSecondary }]}>
                        {Translator.get('NO_FAVORITE_GROUP') || 'Aucun groupe favori.'}
                    </Text>
                    <Text style={[styles.actionText, { color: theme.primary }]}>
                        Rechercher un groupe
                    </Text>
                </View>
            );
        }

        if (!nextCourse) {
            return (
                <View style={styles.centerContent}>
                    <Text style={[styles.emptyText, { color: theme.fontSecondary }]}>
                        {Translator.get('NO_COURSE_TODAY') || 'Aucun cours à venir.'}
                    </Text>
                </View>
            );
        }

        const isToday = nextCourse.searchDate === moment().format('YYYY-MM-DD');
        const dayLabel = isToday ? "Aujourd'hui" : 'Demain';

        return (
            <View style={styles.courseContainer}>
                <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, { color: theme.font }]}>
                        {nextCourse.starttime}
                    </Text>
                    <Text style={[styles.dayText, { color: theme.primary }]}>
                        {dayLabel}
                    </Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
                <View style={styles.detailsContainer}>
                    <Text style={[styles.subjectText, { color: theme.font }]} numberOfLines={2}>
                        {nextCourse.subject}
                    </Text>
                    {nextCourse.description ? (
                        <Text style={[styles.roomText, { color: theme.fontSecondary }]} numberOfLines={1}>
                            {nextCourse.description.replace(/\\n/g, ' ')}
                        </Text>
                    ) : null}
                </View>
            </View>
        );
    };

    return (
        <WidgetCard 
            title={Translator.get('MY_PLANNING') || "Prochain Cours"}
            icon="calendar-clock"
            onPress={handlePress}
            fullWidth
            color={theme.sectionsHeaders[0] || theme.primary}
        >
            {renderContent()}
        </WidgetCard>
    );
};

const styles = StyleSheet.create({
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: tokens.space.sm,
    },
    emptyText: {
        fontSize: tokens.fontSize.md,
        textAlign: 'center',
    },
    actionText: {
        fontSize: tokens.fontSize.sm,
        marginTop: tokens.space.xs,
        fontWeight: tokens.fontWeight.bold,
    },
    courseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: tokens.space.xs,
    },
    timeContainer: {
        alignItems: 'center',
        width: 70,
    },
    timeText: {
        fontSize: tokens.fontSize.lg,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
    },
    dayText: {
        fontSize: tokens.fontSize.xs,
        fontWeight: tokens.fontWeight.bold,
        marginTop: 2,
    },
    separator: {
        width: 2,
        height: '80%',
        marginHorizontal: tokens.space.md,
        borderRadius: 1,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    subjectText: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
        marginBottom: tokens.space.xs,
        fontFamily: 'Montserrat_600SemiBold',
    },
    roomText: {
        fontSize: tokens.fontSize.sm,
    }
});

export default NextCourseWidget;
