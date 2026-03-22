import React, { useState, useEffect, useContext, useRef } from 'react';
import { Animated, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import LibraryService, { LibraryInfo, AffluencesData } from './LibraryService';
import { withHeaderAnimation } from '../../shared/navigation/NavHelpers';

const defaultLibraryImage = require('../../../assets/images/default_resto.png');

function LibraryScreen({ navigation, onAnimatedScroll, headerPadding }: any) {
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

        let statusColor = '#f44336';
        if (isOpen) {
            if (rate === null || rate < 50) statusColor = '#4caf50';
            else if (rate < 80) statusColor = '#ff9800';
            else statusColor = '#ff4436';
        }

        let statusText = isOpen ? (Translator.get('BU_OPEN')) : (Translator.get('BU_CLOSED'));
        if (!isOpen && affluenceData?.openingText) { 
            statusText = `${statusText} - ${affluenceData.openingText}`;
        }

        const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultLibraryImage;
        
        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluenceData })}
                style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl, 
                    marginBottom: tokens.space.lg, 
                    marginHorizontal: tokens.space.sm,
                    ...tokens.shadow.md, 
                    overflow: 'hidden', 
                }}
            >
                {/* LA GRANDE IMAGE (Comme pour les RUs) */}
                <Image 
                    source={imageSource}
                    style={{
                        width: '100%',
                        height: 180, 
                        resizeMode: 'cover',
                        backgroundColor: theme.greyBackground 
                    }}
                />

                {/* LES INFOS EN DESSOUS */}
                <View style={{ padding: tokens.space.md }}>
                    
                    {/* Titre */}
                    <Text style={{ 
                        fontSize: tokens.fontSize.lg, 
                        fontWeight: tokens.fontWeight.bold as any, 
                        color: theme.font,
                        marginBottom: tokens.space.xs
                    }}>
                        {item.name}
                    </Text>
                    
                    {/* Ligne : Ville + Badge de Distance */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                            {item.campus}
                        </Text>

                        {/* Badge de Distance style RU */}
                        {item.distance !== undefined && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: `${theme.primary}15`, 
                                paddingHorizontal: tokens.space.sm,
                                paddingVertical: 4,
                                borderRadius: tokens.radius.pill,
                            }}>
                                <MaterialIcons name="directions-walk" size={14} color={theme.primary} />
                                <Text style={{
                                    fontSize: tokens.fontSize.sm,
                                    fontWeight: tokens.fontWeight.bold as any,
                                    color: theme.primary,
                                    marginLeft: 4
                                }}>
                                    {item.distance < 1 
                                        ? `${Math.round(item.distance * 1000)} m` 
                                        : `${item.distance.toFixed(1)} km`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Jauge d'affluence avec son fix flexbox */}
                    <View style={{ marginTop: tokens.space.xs }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
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
                                <View style={{ height: '100%', borderRadius: 3, width: `${rate}%`, backgroundColor: statusColor }} />
                            )}
                        </View>
                    </View>

                </View>
            </TouchableOpacity>
        );
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
            <View style={{ flex: 1 }}>
                <Animated.FlatList
                    data={libraries}
                    onScroll={onAnimatedScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 120, paddingVertical: tokens.space.sm, flexGrow: 1 }}
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

export default withHeaderAnimation(LibraryScreen);