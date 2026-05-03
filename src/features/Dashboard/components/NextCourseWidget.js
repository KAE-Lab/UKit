import React, { useContext, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext, CourseManager } from '../../../shared/services/AppCore';
import { FetchManager } from '../../../shared/services/DataService';
import Translator from '../../../shared/i18n/Translator';
import { CourseRowWithNavigation } from '../../Schedule/CourseCard';

const NextCourseWidget = ({ navigation }) => {
    const { themeName, favoriteGroups } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const [nextCourse, setNextCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
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
                    // TEST : Décommentez la ligne ci-dessous pour tester avec la date du 25 Février 2026
                    const TEST_DATE = '2026-02-25';
                    //const TEST_DATE = null;

                    let date = TEST_DATE || moment().format('YYYY-MM-DD');
                    let foundCourse = null;

                    // On regarde sur 2 jours pour trouver le prochain cours
                    for (let i = 0; i < 2 && !foundCourse; i++) {
                        const searchDate = moment(date).add(i, 'days').format('YYYY-MM-DD');
                        
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

                        const currentTime = TEST_DATE ? moment(`${TEST_DATE} 08:00`, 'YYYY-MM-DD HH:mm') : moment();
                        for (const course of allCourses) {
                            const courseEndTime = moment(`${searchDate} ${course.endtime}`, 'YYYY-MM-DD HH:mm');
                            if (courseEndTime.isAfter(currentTime)) {
                                foundCourse = { ...course, searchDate };
                                break;
                            }
                        }
                    }

                    if (isMounted) {
                        setNextCourse(foundCourse ? CourseManager.computeCourseUE(foundCourse) : null);
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
        }, [favoriteGroups])
    );

    const handlePress = () => {
        if (favoriteGroups && favoriteGroups.length > 0) {
            navigation.navigate('Group', { name: favoriteGroups });
        } else {
            navigation.navigate('GroupSearch');
        }
    };

    if (loading || nextCourse === 'no_group') {
        return (
            <WidgetCard 
                title={Translator.get('MY_PLANNING') || "Prochain Cours"}
                icon="calendar-clock"
                onPress={handlePress}
                fullWidth
                color={theme.sectionsHeaders[0] || theme.primary}
            >
                <View style={styles.centerContent}>
                    {loading ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                        <>
                            <Text style={[styles.emptyText, { color: theme.fontSecondary }]}>
                                {Translator.get('NO_FAVORITE_GROUP') || 'Aucun groupe favori.'}
                            </Text>
                            <Text style={[styles.actionText, { color: theme.primary }]}>
                                {Translator.get('SEARCH_GROUP') || 'Rechercher un groupe'}
                            </Text>
                        </>
                    )}
                </View>
            </WidgetCard>
        );
    }

    let dataToRender = nextCourse;
    if (!nextCourse) {
        dataToRender = { category: 'nocourse' };
    } else {
        dataToRender = { ...nextCourse, category: nextCourse.category };
    }

    return (
        <WidgetCard 
            title={Translator.get('MY_PLANNING') || "Prochain Cours"}
            icon="calendar-clock"
            onPress={handlePress}
            fullWidth
            transparent={true}
            color={theme.sectionsHeaders[0] || theme.primary}
        >
            <View pointerEvents="none">
                <CourseRowWithNavigation data={dataToRender} theme={theme} />
            </View>
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
    }
});

export default NextCourseWidget;
