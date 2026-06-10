import React from 'react';
import { View, Text, TextInput, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { EdgeInsets } from 'react-native-safe-area-context';
import Translator from '../../../shared/i18n/Translator';
import { tokens, AppThemeType } from '../../../shared/theme/Theme';
import { UnifiedTouchable } from '../../../shared/ui/UnifiedTouchable';

interface CampusSearchBarProps {
    searchText: string;
    onSearchChange: (text: string) => void;
    searchPlaceholder: string;
    theme: AppThemeType;
    insets: EdgeInsets;
}

export function CampusSearchBar({ searchText, onSearchChange, searchPlaceholder, theme, insets }: CampusSearchBarProps) {
    return (
        <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'position', default: undefined })}
            keyboardVerticalOffset={Platform.select({ ios: 0, default: 0 })}
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
                        <UnifiedTouchable
                            onPress={() => onSearchChange('')}
                            style={{ padding: tokens.space.xs }}
                        >
                            <MaterialCommunityIcons name="close-circle" size={18} color={theme.fontSecondary} />
                        </UnifiedTouchable>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

interface FilterOption {
    id: string;
    label: string;
}

interface CampusFilterModalProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    filterOptions: FilterOption[];
    selectedFilter: string | undefined;
    onFilterChange: (id: string) => void;
    theme: AppThemeType;
}

export function CampusFilterModal({ visible, setVisible, filterOptions, selectedFilter, onFilterChange, theme }: CampusFilterModalProps) {
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={() => setVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                <View style={(theme.settings?.popup?.background || { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }) as never}>
                    <TouchableWithoutFeedback>
                        <View style={(theme.settings?.popup?.container || { backgroundColor: theme.cardBackground, width: "85%", borderRadius: tokens.radius.xl, padding: tokens.space.lg }) as never}>
                            <View style={(theme.settings?.popup?.header || { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.md }) as never}>
                                <Text style={theme.settings?.popup?.textHeader || { fontSize: tokens.fontSize.lg, fontWeight: 'bold', color: theme.font }}>
                                    {Translator.get('FILTERS')}
                                </Text>
                                <UnifiedTouchable onPress={() => setVisible(false)}>
                                    <MaterialIcons name="close" size={28} color={theme.fontSecondary} />
                                </UnifiedTouchable>
                            </View>

                            {filterOptions.map((option) => (
                                <UnifiedTouchable 
                                    key={option.id}
                                    onPress={() => { onFilterChange(option.id); setVisible(false); }} 
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
                                </UnifiedTouchable>
                            ))}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

interface CampusListEmptyStateProps {
    isFiltering: boolean;
    emptyIcon: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
    emptyMessage: string;
    theme: AppThemeType;
}

export function CampusListEmptyState({ isFiltering, emptyIcon, emptyMessage, theme }: CampusListEmptyStateProps) {
    return (
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
    );
}
