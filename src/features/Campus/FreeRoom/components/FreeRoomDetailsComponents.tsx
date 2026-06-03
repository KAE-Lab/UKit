import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Translator from '../../../../shared/i18n/Translator';
import style, { tokens, AppThemeType } from '../../../../shared/theme/Theme';
import { BuildingInfo, FreeRoomSlot } from '../../services/FreeRoomService';

interface FreeRoomHoursHeaderProps {
    building: BuildingInfo;
    hoursList: string[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    flatListRef: React.RefObject<FlatList>;
    scrollTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    theme: AppThemeType;
    insets: EdgeInsets;
}

export function FreeRoomHoursHeader({ building, hoursList, selectedIndex, setSelectedIndex, flatListRef, scrollTimeoutRef, theme, insets }: FreeRoomHoursHeaderProps) {
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
                {building.name}
            </Text>

            <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={hoursList}
                keyExtractor={(item) => item}
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
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

interface FreeRoomsListProps {
    freeRooms: FreeRoomSlot[];
    theme: AppThemeType;
}

export function FreeRoomsList({ freeRooms, theme }: FreeRoomsListProps) {
    return (
        <ScrollView style={{ flex: 1, paddingTop: tokens.space.md, paddingHorizontal: tokens.space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: tokens.space.sm, marginBottom: tokens.space.md }}>
                <MaterialCommunityIcons 
                    name="door-open" 
                    size={20} 
                    color={theme.accent ?? theme.primary} 
                />
                <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, marginLeft: tokens.space.sm }}>
                    {Translator.get('FREE_ROOMS') || 'Salles libres'} ({freeRooms.length})
                </Text>
            </View>

            {freeRooms.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.fontSecondary, marginTop: tokens.space.xl }}>
                    {Translator.get('NO_FREE_ROOMS' as Parameters<typeof Translator.get>[0]) || 'Aucune salle libre à cette heure.'}
                </Text>
            ) : (
                freeRooms.map((slot, index) => (
                    <View key={index} style={[style.course.card, { 
                        backgroundColor: theme.cardBackground, 
                        borderColor: theme.border, 
                        borderWidth: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: tokens.space.md,
                        marginBottom: tokens.space.sm
                    }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: theme.accent ?? theme.primary, marginBottom: 2 }}>
                                {slot.room.name}
                            </Text>
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary }}>
                                {Translator.get('AVAILABLE_UNTIL') || 'Libre jusqu\'à'} {slot.availableUntil}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md }}>
                            <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary }}>
                                {Math.floor(slot.durationMinutes / 60)}h{slot.durationMinutes % 60 > 0 ? (slot.durationMinutes % 60).toString().padStart(2, '0') : ''}
                            </Text>
                        </View>
                    </View>
                ))
            )}
            
            <View style={{ height: tokens.space.xxl }} />
        </ScrollView>
    );
}
