import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import style, { tokens } from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import { CrousDayMenu } from '../../services/CrousService';

interface CrousDateHeaderProps {
    menus: CrousDayMenu[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    theme: typeof style.Theme['light'];
    restaurantName: string;
    insets: { top: number; right: number; bottom: number; left: number };
    formatDate: (date: string | null) => string;
}

export function CrousDateHeader({ menus, selectedIndex, setSelectedIndex, theme, restaurantName, insets, formatDate }: CrousDateHeaderProps) {
    const flatListRef = useRef<FlatList>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (menus.length > 0 && flatListRef.current) {
            const timerId = setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: selectedIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
            return () => clearTimeout(timerId);
        }
    }, [selectedIndex, menus]);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    return (
        <View style={{ backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: tokens.space.sm, paddingTop: (insets.top || 0) + 65 }}>
            <Text 
                style={{
                    fontSize: tokens.fontSize.xl,
                    fontWeight: tokens.fontWeight.bold,
                    color: theme.fontSecondary,
                    textAlign: 'left',
                    paddingHorizontal: tokens.space.md,
                    marginBottom: tokens.space.md,
                }} 
                numberOfLines={1}
            >
                {restaurantName || Translator.get('RESTAURANT_U')}
            </Text>

            <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={menus}
                keyExtractor={(item) => item.date}
                contentContainerStyle={{ paddingHorizontal: tokens.space.sm }}
                onScrollToIndexFailed={(info) => {
                    scrollTimeoutRef.current = setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                    }, 500);
                }}
                renderItem={({ item, index }) => {
                    const isSelected = index === selectedIndex;
                    const primaryColor = theme.accent ?? theme.primary;

                    return (
                        <TouchableOpacity 
                            onPress={() => setSelectedIndex(index)}
                            style={{
                                paddingHorizontal: tokens.space.md,
                                paddingVertical: tokens.space.sm,
                                marginHorizontal: tokens.space.xs,
                                borderRadius: tokens.radius.md,
                                backgroundColor: theme.greyBackground,
                                borderWidth: 2,
                                borderColor: isSelected ? primaryColor : 'transparent',
                            }}
                        >
                            <Text style={{ 
                                color: isSelected ? primaryColor : theme.fontSecondary,
                                fontWeight: isSelected ? tokens.fontWeight.bold : tokens.fontWeight.medium,
                                fontSize: tokens.fontSize.sm
                            }}>
                                {formatDate(item.date)}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}
