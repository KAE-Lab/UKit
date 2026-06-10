import React, { useContext, useState } from 'react';
import { Animated, View, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { CampusSearchBar, CampusFilterModal, CampusListEmptyState } from './CampusLayoutComponents';
import { useCampusListHeader } from './hooks/useCampusListHeader';

export interface FilterOption {
    id: string;
    label: string;
}

export interface CampusListLayoutProps<T> {
    data: T[];
    loading: boolean;
    renderItem: (info: { item: T }) => React.ReactElement;
    onAnimatedScroll?: (event: unknown) => void;
    
    // Search
    hasSearch?: boolean;
    searchText?: string;
    onSearchChange?: (text: string) => void;
    searchPlaceholder?: string;
    
    // Filters
    filterOptions?: FilterOption[];
    selectedFilter?: string;
    onFilterChange?: (id: string) => void;
    
    // Empty State
    emptyIcon?: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
    emptyMessage?: string;
    
    // Navigation for setting header filter icon
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

// eslint-disable-next-line complexity
export function CampusListLayout<T>({
    data,
    loading,
    renderItem,
    onAnimatedScroll,
    hasSearch = false,
    searchText = '',
    onSearchChange,
    searchPlaceholder = 'Rechercher...',
    filterOptions = [],
    selectedFilter,
    onFilterChange,
    emptyIcon = 'layers-search',
    emptyMessage = 'Aucun résultat',
    navigation
}: CampusListLayoutProps<T>) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();
    
    const [filterVisible, setFilterVisible] = useState(false);
    const route = useRoute();

    useCampusListHeader({
        navigation,
        filterOptions,
        selectedFilter,
        theme,
        routeKey: route.key,
        setFilterVisible
    });

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const isFiltering = searchText.trim().length > 0 || (selectedFilter && selectedFilter !== 'all');

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1 }}>
                <Animated.FlatList
                    data={data as unknown[]}
                    onScroll={onAnimatedScroll as never}
                    scrollEventThrottle={16}
                    keyExtractor={(item: unknown, index) => {
                        const id = (item as { id?: string | number }).id;
                        return id ? id.toString() : index.toString();
                    }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                        paddingTop: (insets.top || 0) + 70, 
                        paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0)) + (hasSearch ? 80 : 20), 
                        flexGrow: 1 
                    }}
                    renderItem={renderItem as never}
                    ListEmptyComponent={() => (
                        <CampusListEmptyState 
                            isFiltering={isFiltering} 
                            emptyIcon={emptyIcon} 
                            emptyMessage={emptyMessage} 
                            theme={theme} 
                        />
                    )}
                />
            </View>

            {hasSearch && (
                <CampusSearchBar 
                    searchText={searchText} 
                    onSearchChange={onSearchChange!} 
                    searchPlaceholder={searchPlaceholder} 
                    theme={theme} 
                    insets={insets} 
                />
            )}

            {filterOptions.length > 0 && onFilterChange && (
                <CampusFilterModal 
                    visible={filterVisible} 
                    setVisible={setFilterVisible} 
                    filterOptions={filterOptions} 
                    selectedFilter={selectedFilter} 
                    onFilterChange={onFilterChange} 
                    theme={theme} 
                />
            )}
        </SafeAreaView>
    );
}
