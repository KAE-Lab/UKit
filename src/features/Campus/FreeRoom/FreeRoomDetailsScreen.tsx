import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { BuildingInfo, FreeRoomSlot, RoomInfo } from '../services/FreeRoomService';
import { CampusApiService as FetchManager } from '../services/CampusApiService';

export default function FreeRoomDetailsScreen({ route, navigation }: { route: { params: { building: BuildingInfo } }; navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) {
    const { building } = route.params;
    const AppContextValues = useContext(AppContext);
    const theme = style.Theme[AppContextValues.themeName];
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [freeRooms, setFreeRooms] = useState<FreeRoomSlot[]>([]);
    const [allEvents, setAllEvents] = useState<{ roomId: string, events: import('../services/CampusApiService').CampusEvent[] }[]>([]);
    
    const [isClosed, setIsClosed] = useState(false);
    const [hoursList, setHoursList] = useState<string[]>([]);
    const [buildingCloseTime, setBuildingCloseTime] = useState('20:00');

    const flatListRef = useRef<FlatList>(null);
    const mountedRef = useRef(true);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <Text style={{ color: theme.primary, fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold }}>
                    {Translator.get('DETAILS') || 'Détails'}
                </Text>
            ),
            headerTitleAlign: 'center'
        });
    }, [navigation, theme]);

    useEffect(() => {
        let closed = false;
        const currentDay = new Date().getDay() || 7;
        const daySchedule = building.schedule ? building.schedule[String(currentDay)] : null;

        if (!daySchedule) {
            closed = true;
        } else {
            setBuildingCloseTime(daySchedule.close);
            const openTime = parseInt(daySchedule.open.split(':')[0]);
            let closeTime = parseInt(daySchedule.close.split(':')[0]);
            
            if (daySchedule.close.includes(':00')) {
                closeTime -= 1;
            }
            
            const list = [];
            for (let i = openTime; i <= closeTime; i++) {
                list.push(`${i.toString().padStart(2, '0')}:00`);
            }
            setHoursList(list);

            const currentHour = new Date().getHours();
            let defaultIndex = list.findIndex(h => parseInt(h.split(':')[0]) === currentHour);
            if (defaultIndex === -1) {
                defaultIndex = currentHour < openTime ? 0 : list.length - 1;
            }
            setSelectedIndex(defaultIndex);
        }
        
        setIsClosed(closed);
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        setLoading(true);
        const today = moment().format('YYYY-MM-DD');

        const promises = building.rooms.map(async (room) => {
            try {
                const res = await FetchManager.fetchRoomsScheduleDay([room.id], today);
                return { roomId: room.id, events: res || [] };
            } catch (e) {
                return { roomId: room.id, events: [] };
            }
        });

        const results = await Promise.all(promises);

        if (!mountedRef.current) return;
        setAllEvents(results);
        setLoading(false);
    };

    useEffect(() => {
        if (!loading && allEvents && allEvents.length > 0) {
            if (allEvents.some(r => r.events.some((e: import('../services/CampusApiService').CampusEvent) => e.isVacances))) {
                setIsClosed(true);
            } else if (!isClosed && hoursList.length > 0) {
                computeFreeRooms();
            }
        }
    }, [selectedIndex, loading, allEvents, isClosed, hoursList]);

    useEffect(() => {
        if (hoursList.length > 0 && flatListRef.current && !loading) {
            const timerId = setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: selectedIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
            return () => clearTimeout(timerId);
        }
    }, [selectedIndex, loading]);

    const computeFreeRooms = () => {
        if (hoursList.length === 0 || selectedIndex >= hoursList.length) return;

        const selectedHourStr = hoursList[selectedIndex];
        const selectedTime = moment(selectedHourStr, 'HH:mm');
        const endOfDayTime = moment(buildingCloseTime, 'HH:mm');

        const availableSlots: FreeRoomSlot[] = [];

        for (const room of building.rooms) {
            const roomResult = allEvents.find(r => r.roomId === room.id);
            const roomEvents = roomResult ? roomResult.events : [];

            let isOccupied = false;
            let nextEventStart = endOfDayTime;

            for (const event of roomEvents) {
                const eventStart = moment(event.starttime, 'HH:mm');
                const eventEnd = moment(event.endtime, 'HH:mm');

                // Si l'heure sélectionnée tombe pendant un cours
                if (selectedTime.isSameOrAfter(eventStart) && selectedTime.isBefore(eventEnd)) {
                    isOccupied = true;
                    break;
                }

                // Si l'évènement est dans le futur par rapport à l'heure sélectionnée
                if (eventStart.isAfter(selectedTime)) {
                    if (eventStart.isBefore(nextEventStart)) {
                        nextEventStart = eventStart;
                    }
                }
            }

            if (!isOccupied) {
                const durationMinutes = nextEventStart.diff(selectedTime, 'minutes');
                // N'inclure que s'il reste au moins 15 min de libre
                if (durationMinutes >= 15) {
                    availableSlots.push({
                        room,
                        availableUntil: nextEventStart.format('HH:mm'),
                        durationMinutes
                    });
                }
            }
        }

        // Trier par durée de disponibilité (plus long en premier), puis par nom
        availableSlots.sort((a, b) => {
            if (b.durationMinutes !== a.durationMinutes) {
                return b.durationMinutes - a.durationMinutes;
            }
            return a.room.name.localeCompare(b.room.name);
        });

        setFreeRooms(availableSlots);
    };

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            {isClosed ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.xl }}>
                    <MaterialCommunityIcons name="door-closed-lock" size={64} color={theme.fontSecondary} />
                    <Text style={{ marginTop: tokens.space.md, fontSize: tokens.fontSize.lg, color: theme.fontSecondary, textAlign: 'center' }}>
                        {Translator.get('BU_CLOSED') || 'Bâtiment fermé aujourd\'hui'}
                    </Text>
                </View>
            ) : (
                <>
                    {/* ── Bandeau des heures défilant horizontalement ── */}
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

                    {/* ── Liste des salles libres ── */}
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
                </>
            )}

        </SafeAreaView>
    );
}
