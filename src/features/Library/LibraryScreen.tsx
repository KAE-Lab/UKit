import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import LibraryService, { LibraryInfo, AffluencesData } from './LibraryService';

export default function LibraryScreen({ navigation }: any) {
    const AppContextValues = useContext(AppContext) as any;
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [affluences, setAffluences] = useState<Record<string, AffluencesData>>({});
    const [locationError, setLocationError] = useState(false);

    useEffect(() => {
        loadLibraries();
    }, []);

    const loadLibraries = async () => {
        setLoading(true);
        try {
            let userLat: number | undefined = undefined;
            let userLng: number | undefined = undefined;

            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status === 'granted') {
                let location = await Location.getLastKnownPositionAsync({});
                if (!location) {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
                if (location) {
                    userLat = location.coords.latitude;
                    userLng = location.coords.longitude;
                }
            } else {
                setLocationError(true);
            }

            // Fallback sur le campus de Talence si le GPS de l'émulateur échoue
            if (userLat === undefined || userLng === undefined) {
                userLat = 44.8048;
                userLng = -0.5954;
            }


            const fetchedLibs = await LibraryService.fetchNearbyLibraries(userLat, userLng);

            const nearbyLibs = fetchedLibs.slice(0, 15);
            setLibraries(nearbyLibs);

            const affluencesPromises = nearbyLibs.map(async (lib) => {
                const data = await LibraryService.getAffluencesData(lib.slug);
                return { id: lib.id, data };
            });

            const results = await Promise.all(affluencesPromises);
            const newAffluences: Record<string, AffluencesData> = {};
            results.forEach(res => {
                if (res.data) newAffluences[res.id] = res.data;
            });
            setAffluences(newAffluences);

        } catch (error) {
            console.error("Erreur critique dans loadLibraries:", error);
        } finally {
            setLoading(false);
        }
    };

    const getOccupancyColor = (rate: number | null) => {
        if (rate === null) return theme.border;
        if (rate < 50) return '#4caf50'; 
        if (rate < 80) return '#ff9800'; 
        return '#f44336'; 
    };

    const renderLibraryCard = ({ item }: { item: LibraryInfo }) => {
        const affluenceData = affluences[item.id];
        const rate = affluenceData?.occupancyRate ?? null;
        const isOpen = affluenceData?.isOpen ?? true; 
        const statusColor = isOpen ? '#4caf50' : '#f44336';

        let statusText = isOpen ? (Translator.get('BU_OPEN')) : (Translator.get('BU_CLOSED'));
        if (!isOpen && affluenceData?.openingText) { 
            statusText = `${statusText} - ${affluenceData.openingText}`;
        }
        
        return (
            <TouchableOpacity 
                onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluenceData })}
                style={[
                    style.schedule.course.root, 
                    { 
                        backgroundColor: theme.eventBackground,
                        marginHorizontal: tokens.space.md,
                        marginVertical: tokens.space.xs,
                        borderRadius: tokens.radius.lg,
                        borderLeftWidth: 4,
                        borderLeftColor: theme.accent ?? theme.primary,
                        borderWidth: 1,
                        borderColor: theme.eventBorder,
                        overflow: 'hidden',
                        ...tokens.shadow.sm,
                    }
                ] as any}
            >
                <View style={style.schedule.course.row as any}>
                    <View style={[style.schedule.course.contentBlock, { padding: tokens.space.sm, paddingLeft: tokens.space.md }] as any}>
                        
                        {/* En-tête : Titre et icône */}
                        <View style={style.schedule.course.contentType as any}>
                            <Text style={[style.schedule.course.title, { color: theme.font, flex: 1 }] as any}>
                                {item.name}
                            </Text>
                            <MaterialCommunityIcons 
                                name="bookshelf" 
                                size={16} 
                                color={theme.accent ?? theme.primary} 
                            />
                        </View>
                        
                        {/* Campus */}
                        <View style={[style.schedule.course.line, { alignItems: 'center' }] as any}>
                            <MaterialIcons
                                name="room"
                                size={14}
                                color={theme.fontSecondary}
                                style={{ marginRight: tokens.space.xs }}
                            />
                            <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.medium as any }}>
                                {item.campus}
                            </Text>
                        </View>

                        {/* Distance */}
                        {item.distance !== undefined && (
                            <View style={[style.schedule.course.line as any, { alignItems: 'center', marginBottom: tokens.space.sm }]}>
                                <MaterialIcons name="directions-walk" size={14} color={theme.accent ?? theme.primary} style={{ marginRight: tokens.space.xs }} />
                                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.accent ?? theme.primary, fontWeight: tokens.fontWeight.bold as any }}>
                                    {item.distance < 1 
                                        ? `${Math.round(item.distance * 1000)} m` 
                                        : `${item.distance.toFixed(1)} km`}
                                </Text>
                            </View>
                        )}

                        {/* Jauge d'affluence */}
                        <View style={{ marginTop: tokens.space.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.space.xs }}>
                                <View style={{ flex: 1, paddingRight: tokens.space.sm }}>
                                    <Text
                                        numberOfLines={1}
                                        ellipsizeMode='tail'
                                        style={{
                                            fontSize: tokens.fontSize.xs,
                                            fontWeight: tokens.fontWeight.semibold as any,
                                            color: statusColor
                                        }}>
                                        {statusText} 
                                    </Text>
                                </View>
                                {rate !== null && (
                                    <View style={{ flexShrink: 0, minWidth: 35, alignItems: 'flex-end', paddingRight: 2 }}>
                                        <Text
                                        style={{
                                            fontSize: tokens.fontSize.xs,
                                            color: theme.font,
                                            fontWeight: tokens.fontWeight.semibold as any
                                        }}>
                                        {rate}%
                                    </Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}>
                                {rate !== null && (
                                    <View style={{ height: '100%', borderRadius: 3, width: `${rate}%`, backgroundColor: getOccupancyColor(rate) }} />
                                )}
                            </View>
                        </View>

                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1 }}>
                <FlatList
                    data={libraries}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: tokens.space.sm, flexGrow: 1 }}
                    renderItem={renderLibraryCard}
                    ListEmptyComponent={
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: tokens.space.lg, marginTop: tokens.space.xxl }}>
                            <MaterialCommunityIcons name="bookshelf" size={48} color={theme.border} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                marginTop: tokens.space.md, 
                                textAlign: 'center',
                                width: '100%',
                                lineHeight: 22,
                            }}>
                                {Translator.get('NO_BU_NEARBY')}
                            </Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}