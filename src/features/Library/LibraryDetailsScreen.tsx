import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import LibraryService, { TimetableEntry } from './LibraryService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';

export default function LibraryDetailsScreen({ route, navigation }: any) {
    const { library, affluence } = route.params;
    const AppContextValues = useContext(AppContext) as any;
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [weekOffset, setWeekOffset] = useState(0); // 0 = semaine en cours, -1 = semaine dernière, 1 = semaine pro
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadTimetable(weekOffset);
    }, [weekOffset]); // Se recharge automatiquement quand on change de semaine

    const loadTimetable = async (offset: number) => {
        setLoading(true);
        const data = await LibraryService.fetchLibraryTimetable(library.slug, offset);
        setTimetable(data);
        
        // Si on est sur la semaine actuelle, on sélectionne aujourd'hui. Sinon, on sélectionne le lundi (index 0).
        if (offset === 0) {
            const todayIndex = data.findIndex(entry => entry.isToday);
            setSelectedIndex(todayIndex !== -1 ? todayIndex : 0);
        } else {
            setSelectedIndex(0);
        }
        
        setLoading(false);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '?';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const dayKeys = ['DAY_SUN', 'DAY_MON', 'DAY_TUE', 'DAY_WED', 'DAY_THU', 'DAY_FRI', 'DAY_SAT'];
        const translatedDay = Translator.get(dayKeys[d.getDay()]);
        return `${translatedDay} ${d.getDate()}`;
    };

    const formatTime = (dateTimeString: string) => {
        if (!dateTimeString) return '';
        return dateTimeString.substring(11, 16).replace(':', 'h');
    };

    useEffect(() => {
        if (timetable.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: selectedIndex,
                    animated: true,
                    viewPosition: 0.5
                });
            }, 100);
        }
    }, [selectedIndex, timetable]);

    const renderLiveAttendance = () => {
        if (!affluence) return null;

        const isOpen = affluence?.isOpen ?? false;
        const rate = affluence?.occupancyRate ?? null;

        let statusColor = '#f44336';
        if (isOpen) {
            if (rate === null || rate < 50) statusColor = '#4caf50';
            else if (rate < 80) statusColor = '#ff9800';
            else statusColor = '#f44336';
        }

        let statusText = isOpen ? (Translator.get('BU_OPEN')) : (Translator.get('BU_CLOSED'));
        if (!isOpen && affluence?.openingText) {
            statusText = `${statusText} - ${affluence.openingText}`;
        }

        return (
            <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.md, marginBottom: tokens.space.lg, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold as any, color: theme.fontSecondary, marginBottom: tokens.space.sm, textTransform: 'uppercase' }}>
                    {Translator.get('ATTENDANCE')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rate !== null ? tokens.space.md : 0 }}>
                    <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={24} color={statusColor} />
                    <Text style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold as any, color: statusColor, marginLeft: tokens.space.sm, flex: 1 }}>
                        {statusText}
                    </Text>
                </View>
                
                {rate !== null && (
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: tokens.space.xs }}>
                            <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm }}>{Translator.get('OCCUPANCY_RATE')}</Text>
                            <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold as any }}>{rate}%</Text>
                        </View>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
                            <View style={{ height: '100%', borderRadius: 4, width: `${rate}%`, backgroundColor: statusColor }} />
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const currentDay = timetable[selectedIndex];

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            
            {/* Bandeau des dates */}
            <View style={{ backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: tokens.space.sm, paddingTop: 110 }}>
                <FlatList
                    ref={flatListRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={timetable}
                    keyExtractor={(item) => item.day}
                    contentContainerStyle={{ paddingHorizontal: tokens.space.sm }}
                    onScrollToIndexFailed={(info) => {
                        setTimeout(() => {
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
                                    borderRadius: tokens.radius.pill,
                                    backgroundColor: theme.greyBackground,
                                    borderWidth: 2,
                                    borderColor: isSelected ? primaryColor : 'transparent',
                                }}
                            >
                                <Text style={{ 
                                    color: isSelected ? primaryColor : theme.fontSecondary,
                                    fontWeight: isSelected ? (tokens.fontWeight.bold as any) : (tokens.fontWeight.medium as any),
                                    fontSize: tokens.fontSize.sm
                                }}>
                                    {formatDate(item.day)}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Contenu principal */}
            <ScrollView style={{ flex: 1, padding: tokens.space.md }}>
                
                {/* Widget Affluence (Toujours visible, donne le statut en temps réel) */}
                {renderLiveAttendance()}

                <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, marginBottom: tokens.space.md }}>
                    {Translator.get('OPENING_HOURS')}
                </Text>

                {/* Si on charge une autre semaine, on affiche le spinner juste ici */}
                {loading ? (
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} style={{ marginTop: tokens.space.xl }} />
                ) : (
                    currentDay && currentDay.openingHours.length > 0 ? (
                        currentDay.openingHours.map((slot, index) => (
                            <View key={index} style={[style.course.card as any, { 
                                backgroundColor: theme.cardBackground, 
                                borderColor: theme.border, 
                                borderWidth: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: tokens.space.md,
                                marginBottom: tokens.space.sm
                            }]}>
                                <MaterialIcons name="schedule" size={24} color={theme.accent ?? theme.primary} style={{ marginRight: tokens.space.md }} />
                                <Text style={{ fontSize: tokens.fontSize.md, color: theme.font, fontWeight: tokens.fontWeight.medium as any }}>
                                    {formatTime(slot.openingHour)} - {formatTime(slot.closingHour)}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={{ 
                            alignItems: 'center', 
                            paddingVertical: tokens.space.xl, 
                            paddingHorizontal: tokens.space.lg,
                            backgroundColor: theme.cardBackground, 
                            borderRadius: tokens.radius.lg, 
                            borderWidth: 1, 
                            borderColor: theme.border 
                        }}>
                            <MaterialCommunityIcons name="door-closed-lock" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                fontSize: tokens.fontSize.md,
                                textAlign: 'center',
                                flexWrap: 'wrap',
                                width: '100%'
                            }}>
                                {Translator.get('CLOSED_ALL_DAY')}
                            </Text>
                        </View>
                    )
                )}
                
                <View style={{ height: tokens.space.xxl }} />
            </ScrollView>

            <SafeAreaView 
                edges={['bottom']}
                style={{ 
                    padding: tokens.space.md, 
                    backgroundColor: theme.cardBackground,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                }}
            >
                <TouchableOpacity 
                    onPress={async () => {
                        try {
                            await WebBrowser.openBrowserAsync(`https://affluences.com/sites/${library.slug}/reservation`);
                        } catch (error) {
                            console.error("Erreur d'ouverture du navigateur:", error);
                        }
                    }}
                    style={{
                        backgroundColor: theme.greyBackground,
                        paddingVertical: 14,
                        borderRadius: tokens.radius.md,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <MaterialCommunityIcons name="calendar-check" size={22} color={theme.accent ?? theme.primary} />
                    <Text style={{ 
                        color: theme.accent ?? theme.primary, 
                        fontSize: tokens.fontSize.md, 
                        fontWeight: tokens.fontWeight.bold as any, 
                        marginLeft: tokens.space.sm 
                    }}>
                        {Translator.get('BOOK_SEAT')}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>

        </SafeAreaView>
    );
}