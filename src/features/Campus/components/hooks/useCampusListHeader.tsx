import { useEffect } from 'react';
import React from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalScrollValues } from '../../../../shared/navigation/NavHelpers';
import { tokens } from '../../../../shared/theme/Theme';
import { FilterOption } from '../CampusListLayout';

export function useCampusListHeader({
    navigation,
    filterOptions,
    selectedFilter,
    theme,
    routeKey,
    setFilterVisible
}: {
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    filterOptions: FilterOption[];
    selectedFilter?: string;
    theme: import('../../../../shared/theme/Theme').AppThemeType;
    routeKey: string;
    setFilterVisible: (v: boolean) => void;
}) {
    useEffect(() => {
        if (!navigation || filterOptions.length === 0) return;

        const safeScrollY = globalScrollValues[routeKey];
        const scale = safeScrollY?._buttonScale || 1.14;

        navigation.setOptions({
            headerRight: () => (
                <Animated.View style={{ transform: [{ scale }], height: 45, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ paddingRight: tokens.space.md }}>
                        <View style={{ 
                            backgroundColor: theme.greyBackground, 
                            width: 45, height: 45, 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            borderRadius: tokens.radius.md, 
                            flexShrink: 0
                        }}>
                            <MaterialCommunityIcons 
                                name="filter-variant"
                                size={26} 
                                color={selectedFilter !== 'all' && selectedFilter !== undefined ? theme.primary : theme.fontSecondary} 
                            />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )
        });
    }, [navigation, theme, routeKey, selectedFilter, filterOptions, setFilterVisible]);
}
