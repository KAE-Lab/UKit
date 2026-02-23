import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';
import Collapsible from 'react-native-collapsible';
import PropTypes from 'prop-types';

import { upperCaseFirstLetter } from '../../utils';
import CourseRow from '../CourseRow';
import style, { tokens } from '../../Style';
import Translator from '../../utils/translator';

export default class DayWeek extends React.Component {
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

        // ── Contenu collapsible ───────────────────────────────────────
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
            <View style={{
                marginBottom: tokens.space.xs,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
            }}>
                {/* ── Header jour ───────────────────────────────────── */}
                <TouchableOpacity
                    onPress={this.toggleExpand}
                    activeOpacity={0.7}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: tokens.space.md,
                        paddingVertical: tokens.space.md,
                        backgroundColor: expand
                            ? theme.cardBackground
                            : theme.greyBackground,
                    }}>
                    {/* Chevron gauche */}
                    <MaterialCommunityIcons
                        name={expand ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={expand ? theme.primary : theme.fontSecondary}
                    />

                    {/* Titre + badge nombre de cours */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                        justifyContent: 'center',
                    }}>
                        <Text style={{
                            fontSize: tokens.fontSize.lg,
                            fontWeight: tokens.fontWeight.semibold,
                            color: theme.font,
                        }}>
                            {upperCaseFirstLetter(
                                moment.unix(schedule.dayTimestamp).format('dddd L'),
                            )}
                        </Text>
                        {hasCourses && (
                            <View style={{
                                backgroundColor: expand ? theme.primary : theme.greyBackground,
                                borderRadius: tokens.radius.pill,
                                paddingHorizontal: tokens.space.sm,
                                paddingVertical: 2,
                                marginLeft: tokens.space.sm,
                                borderWidth: 1,
                                borderColor: expand ? theme.primary : theme.border,
                            }}>
                                <Text style={{
                                    fontSize: tokens.fontSize.xs,
                                    fontWeight: tokens.fontWeight.semibold,
                                    color: expand ? '#FFFFFF' : theme.fontSecondary,
                                }}>
                                    {schedule.courses.length}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Chevron droit */}
                    <MaterialCommunityIcons
                        name={expand ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={expand ? theme.primary : theme.fontSecondary}
                    />
                </TouchableOpacity>

                {/* ── Contenu collapsible ───────────────────────────── */}
                <Collapsible collapsed={!expand} align="top">
                    {content}
                </Collapsible>
            </View>
        );
    }
}