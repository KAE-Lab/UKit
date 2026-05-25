import React, { useContext, useEffect, useState } from 'react';
import { Animated, View, Text, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { globalScrollValues } from '../../../shared/navigation/NavHelpers';

export interface FilterOption {
    id: string;
    label: string;
}

export interface CampusListLayoutProps<T> {
    data: T[];
    loading: boolean;
    renderItem: (info: { item: T }) => React.ReactElement;
    onAnimatedScroll?: any;
    
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
    emptyIcon?: any; // MaterialCommunityIcons name
    emptyMessage?: string;
    
    // Navigation for setting header filter icon
    navigation?: any;
}

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

    // Setup Header Filter Icon if filterOptions exist and navigation is provided
    useEffect(() => {
        if (!navigation || filterOptions.length === 0) return;

        const safeScrollY = globalScrollValues[route.key];
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
    }, [navigation, theme, route.key, selectedFilter, filterOptions]);

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
                    data={data}
                    onScroll={onAnimatedScroll as never}
                    scrollEventThrottle={16}
                    keyExtractor={(item: any, index) => item.id ? item.id.toString() : index.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                        paddingTop: (insets.top || 0) + 70, 
                        paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0)) + (hasSearch ? 80 : 20), 
                        flexGrow: 1 
                    }}
                    renderItem={renderItem}
                    ListEmptyComponent={() => (
                        <View style={{ 
                            alignItems: 'center', 
                            paddingVertical: tokens.space.xl, 
                            paddingHorizontal: tokens.space.lg,
                            marginHorizontal: tokens.space.sm,
                            backgroundColor: theme.cardBackground, 
                            borderRadius: tokens.radius.lg, 
                            borderWidth: 1, 
                            borderColor: theme.border 
                        }}>
                            <MaterialCommunityIcons name={emptyIcon} size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                fontSize: tokens.fontSize.md,
                                textAlign: 'center'
                            }}>
                                {isFiltering ? Translator.get('NO_RESULTS_FOUND' as Parameters<typeof Translator.get>[0]) : emptyMessage}
                            </Text>
                        </View>
                    )}
                />
            </View>

            {/* SEARCH BAR */}
            {hasSearch && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'position' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                    }}
                >
                    <View style={{
                        paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15)
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.greyBackground,
                            borderRadius: tokens.radius.md,
                            paddingHorizontal: tokens.space.md,
                            marginHorizontal: tokens.space.md,
                            height: 45,
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                        }}>
                            <MaterialCommunityIcons
                                name="magnify"
                                size={22}
                                color={theme.fontSecondary}
                                style={{ marginRight: tokens.space.sm }}
                            />
                            <TextInput
                                style={{
                                    flex: 1,
                                    fontSize: tokens.fontSize.md,
                                    color: theme.font,
                                    padding: 0
                                }}
                                placeholder={searchPlaceholder}
                                placeholderTextColor={theme.fontSecondary}
                                onChangeText={onSearchChange}
                                value={searchText}
                                autoCorrect={false}
                            />
                            {searchText.length > 0 && onSearchChange && (
                                <TouchableOpacity
                                    onPress={() => onSearchChange('')}
                                    style={{ padding: tokens.space.xs }}
                                >
                                    <MaterialCommunityIcons name="close-circle" size={18} color={theme.fontSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* FILTER MODAL */}
            {filterOptions.length > 0 && onFilterChange && (
                <Modal animationType="fade" transparent={true} visible={filterVisible} onRequestClose={() => setFilterVisible(false)}>
                    <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
                        <View style={(theme.settings?.popup?.background || { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }) as never}>
                            <TouchableWithoutFeedback>
                                <View style={(theme.settings?.popup?.container || { backgroundColor: theme.cardBackground, width: "85%", borderRadius: tokens.radius.xl, padding: tokens.space.lg }) as never}>
                                    <View style={(theme.settings?.popup?.header || { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.md }) as never}>
                                        <Text style={theme.settings?.popup?.textHeader || { fontSize: tokens.fontSize.lg, fontWeight: 'bold', color: theme.font }}>
                                            {Translator.get('FILTERS')}
                                        </Text>
                                        <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                            <MaterialIcons name="close" size={28} color={theme.fontSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {filterOptions.map((option) => (
                                        <TouchableOpacity 
                                            key={option.id}
                                            onPress={() => { onFilterChange(option.id); setFilterVisible(false); }} 
                                            style={{ 
                                                paddingVertical: tokens.space.md, 
                                                borderBottomWidth: option.id === filterOptions[filterOptions.length - 1].id ? 0 : 1, 
                                                borderColor: theme.border, 
                                                flexDirection: 'row', 
                                                alignItems: 'center' 
                                            }}
                                        >
                                            <MaterialCommunityIcons 
                                                name={selectedFilter === option.id ? "radiobox-marked" : "radiobox-blank"} 
                                                size={22} 
                                                color={selectedFilter === option.id ? theme.primary : theme.fontSecondary} 
                                                style={{ marginRight: tokens.space.sm }} 
                                            />
                                            <Text style={{ 
                                                color: selectedFilter === option.id ? theme.primary : theme.font, 
                                                fontSize: tokens.fontSize.md, 
                                                fontWeight: selectedFilter === option.id ? 'bold' : 'normal' 
                                            }}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}
        </SafeAreaView>
    );
}
