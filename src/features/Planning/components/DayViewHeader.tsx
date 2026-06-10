import React from 'react';
import { FlatList, Text, View, ViewabilityConfig, ViewToken, ListRenderItemInfo } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';

import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

export interface DayViewHeaderProps {
    insets: { top: number } | null;
    theme: import('../../../shared/theme/Theme').AppThemeType;
    mode: 'day' | 'week';
    groupName: string | string[];
    
    // Labels
    centerLabel: string;
    leftLabel: string;
    rightLabel: string;
    rightIcon: keyof typeof MaterialCommunityIcons.glyphMap;

    // Callbacks
    onTodayPress: () => void;
    onRightPress: () => void;

    // Day slider
    days: moment.Moment[];
    extractCalendarDayKey: (item: moment.Moment) => string;
    viewability: ViewabilityConfig;
    checkViewableItems: (info: { viewableItems: ViewToken[] }) => void;
    selectedDayIndex: number;
    getCalendarListItemLayout: (data: unknown[] | null | undefined, index: number) => { length: number; offset: number; index: number };
    renderCalendarDayItem: (info: ListRenderItemInfo<moment.Moment>) => React.ReactElement;
    onDayScrollToIndexFailed: (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => void;
    setDayListRef: (ref: FlatList<moment.Moment> | null) => void;

    // Week slider
    weeks: { week: number; year: number }[];
    extractCalendarWeekKey: (item: { week: number; year: number }) => string;
    selectedWeekIndex: number;
    renderCalendarWeekItem: (info: ListRenderItemInfo<{ week: number; year: number }>) => React.ReactElement;
    onWeekScrollToIndexFailed: (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => void;
    setWeekListRef: (ref: FlatList<{ week: number; year: number }> | null) => void;

    extraData: unknown;
}

const renderTitle = (groupName: string | string[], theme: import('../../../shared/theme/Theme').AppThemeType) => (
    // Ligne 1 : Titre "Planning"
    <View style={{
        paddingHorizontal: tokens.space.md,
        opacity: Array.isArray(groupName) ? 1 : 0,
    }}>
        <Text style={{
            fontSize: 34,
            fontWeight: tokens.fontWeight.bold as never,
            fontFamily: 'Montserrat_600SemiBold',
            color: theme.font,
            marginBottom: tokens.space.md,
        }}>
            {Translator.get('MY_PLANNING') || 'Planning'}
        </Text>
    </View>
);

const renderNavigation = (
    theme: import('../../../shared/theme/Theme').AppThemeType,
    mode: 'day' | 'week',
    leftLabel: string,
    centerLabel: string,
    rightLabel: string,
    rightIcon: keyof typeof MaterialCommunityIcons.glyphMap,
    onTodayPress: () => void,
    onRightPress: () => void,
) => {
    const primaryColor = theme.accent ?? theme.primary;
    return (
        // Ligne 2 : Today/ThisWeek | Label | Week/Day
        <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: tokens.space.md,
            marginBottom: tokens.space.sm,
        }}>
            {/* Bouton gauche */}
            <UnifiedTouchable
                onPress={onTodayPress}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: tokens.space.md,
                    paddingVertical: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    backgroundColor: theme.greyBackground,
                }}>
                <MaterialIcons name="event-note" size={16} color={primaryColor} />
                <Text style={{
                    fontSize: tokens.fontSize.sm,
                    marginLeft: tokens.space.xs,
                    color: primaryColor,
                    fontWeight: tokens.fontWeight.medium as never,
                }}>
                    {leftLabel}
                </Text>
            </UnifiedTouchable>

            {/* Label central */}
            <Text style={{
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.semibold as never,
                color: theme.fontSecondary,
                flex: 1,
                textAlign: 'center',
            }}>
                {centerLabel}
            </Text>

            {/* Bouton droit : switch mode */}
            <UnifiedTouchable
                onPress={onRightPress}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: tokens.space.md,
                    paddingVertical: tokens.space.sm,
                    borderRadius: tokens.radius.md,
                    backgroundColor: theme.greyBackground,
                }}>
                {mode === 'week' && (
                    <MaterialCommunityIcons
                        name={rightIcon}
                        size={16}
                        color={primaryColor}
                        style={{ marginRight: tokens.space.xs }}
                    />
                )}
                <Text style={{
                    fontSize: tokens.fontSize.sm,
                    color: primaryColor,
                    fontWeight: tokens.fontWeight.medium as never,
                    marginRight: mode === 'day' ? tokens.space.xs : 0,
                }}>
                    {rightLabel}
                </Text>
                {mode === 'day' && (
                    <MaterialCommunityIcons name={rightIcon} size={16} color={primaryColor} />
                )}
            </UnifiedTouchable>
        </View>
    );
};

const renderSliders = (props: DayViewHeaderProps) => {
    // Ligne 3 : Slider (jours ou semaines selon mode)
    if (props.mode === 'day') {
        return (
            <FlatList
                key="slider-day"
                ref={props.setDayListRef}
                showsHorizontalScrollIndicator={false}
                data={props.days}
                horizontal
                keyExtractor={props.extractCalendarDayKey}
                viewabilityConfig={props.viewability}
                onViewableItemsChanged={props.checkViewableItems}
                initialScrollIndex={props.selectedDayIndex}
                getItemLayout={props.getCalendarListItemLayout}
                extraData={props.extraData}
                renderItem={props.renderCalendarDayItem}
                contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
                onScrollToIndexFailed={props.onDayScrollToIndexFailed}
            />
        );
    }
    return (
        <FlatList
            key="slider-week"
            ref={props.setWeekListRef}
            showsHorizontalScrollIndicator={false}
            data={props.weeks}
            horizontal
            keyExtractor={props.extractCalendarWeekKey}
            viewabilityConfig={props.viewability}
            initialScrollIndex={props.selectedWeekIndex}
            getItemLayout={props.getCalendarListItemLayout}
            extraData={props.extraData}
            renderItem={props.renderCalendarWeekItem}
            contentContainerStyle={{ paddingHorizontal: tokens.space.md }}
            onScrollToIndexFailed={props.onWeekScrollToIndexFailed}
        />
    );
};

export const DayViewHeader: React.FC<DayViewHeaderProps> = (props) => {
    return (
        <View style={{
            backgroundColor: props.theme.cardBackground,
            borderBottomWidth: 1,
            borderBottomColor: props.theme.border,
            paddingTop: (props.insets?.top || 0),
            paddingBottom: tokens.space.sm,
            ...tokens.shadow.sm as object,
        }}>
            {renderTitle(props.groupName, props.theme)}
            {renderNavigation(
                props.theme, props.mode, props.leftLabel, props.centerLabel, 
                props.rightLabel, props.rightIcon, props.onTodayPress, props.onRightPress
            )}
            {renderSliders(props)}
        </View>
    );
};
