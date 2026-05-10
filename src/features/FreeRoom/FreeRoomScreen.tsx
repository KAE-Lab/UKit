import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Animated, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import * as Location from 'expo-location';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import { DataManager } from '../../shared/services/DataService';
import { BuildingInfo, getDistanceInKm } from './FreeRoomService';
import { withHeaderAnimation } from '../../shared/navigation/NavHelpers';

const defaultImage = require('../../../assets/images/default_resto.png');

function FreeRoomScreen({ navigation, onAnimatedScroll }: any) {
    const AppContextValues = useContext(AppContext) as any;
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();

    const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [favorites, setFavorites] = useState<string[]>([]);
    const mountedRef = useRef(true);

    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    useFocusEffect(
        useCallback(() => {
            const loadFavorites = async () => {
                try {
                    const savedFavs = await AsyncStorage.getItem('freeroom_favorites');
                    if (savedFavs) {
                        setFavorites(JSON.parse(savedFavs));
                    }
                } catch (e) {
                    console.error("Erreur de lecture des favoris", e);
                }
            };
            loadFavorites();
        }, [])
    );

    const toggleFavorite = async (id: string) => {
        try {
            let newFavs = [...favorites];
            if (newFavs.includes(id)) {
                newFavs = newFavs.filter(favId => favId !== id);
            } else {
                newFavs.push(id);
            }
            setFavorites(newFavs);
            await AsyncStorage.setItem('freeroom_favorites', JSON.stringify(newFavs));
        } catch (e) {
            console.error("Erreur de sauvegarde des favoris", e);
        }
    };

    const sortedBuildings = [...buildings].sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return (a.distance || 0) - (b.distance || 0);
    });

    useEffect(() => {
        loadBuildings();
    }, []);

    const loadBuildings = async () => {
        setLoading(true);
        try {
            let bList = DataManager.getBuildingList();
            if (!bList || bList.length === 0) {
                await DataManager.fetchBuildingList();
                bList = DataManager.getBuildingList();
            }
            if (mountedRef.current) {
                let userLat = undefined;
                let userLon = undefined;
                try {
                    let { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        let location = await Location.getLastKnownPositionAsync({});
                        if (!location) location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (location) {
                            userLat = location.coords.latitude;
                            userLon = location.coords.longitude;
                        }
                    }
                } catch (e) { }

                if (bList) {
                    bList = bList.map((b: BuildingInfo) => {
                        if (userLat !== undefined && userLon !== undefined && b.lat && b.lng) {
                            b.distance = getDistanceInKm(userLat, userLon, b.lat, b.lng);
                        }
                        return b;
                    });
                }

                setBuildings(bList || []);
                setLoading(false);
            }
        } catch (error) {
            if (mountedRef.current) setLoading(false);
        }
    };

    const renderBuildingCard = ({ item }: { item: BuildingInfo }) => {
        const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultImage;
        const totalRooms = item.rooms ? item.rooms.length : 0;

        let hoursText = Translator.get('UNKNOWN') || 'Non communiqué';
        if (item.schedule) {
            const currentDay = new Date().getDay() || 7; // 1-7
            const daySchedule = item.schedule[String(currentDay)];
            if (daySchedule) {
                hoursText = `${daySchedule.open} - ${daySchedule.close}`;
            } else {
                hoursText = Translator.get('BU_CLOSED') || 'Fermé';
            }
        }
        
        return (
            <Reanimated.View 
                entering={FadeIn}
                layout={LinearTransition.springify()}
            >
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
                style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl, 
                    marginBottom: tokens.space.lg, 
                    marginHorizontal: tokens.space.sm,
                    ...tokens.shadow.md, 
                    overflow: 'hidden', 
                }}
            >
                <Image 
                    source={imageSource}
                    style={{
                        width: '100%',
                        height: 180, 
                        resizeMode: 'cover',
                        backgroundColor: theme.greyBackground 
                    }}
                />

                <View style={{ padding: tokens.space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <Text style={{ 
                            fontSize: tokens.fontSize.lg, 
                            fontWeight: tokens.fontWeight.bold as any, 
                            color: theme.font,
                            flexShrink: 1
                        }}>
                            {item.name}
                        </Text>
                        <TouchableOpacity 
                            onPress={() => toggleFavorite(item.id)}
                            hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
                            style={{ marginLeft: 6 }}
                        >
                            <MaterialCommunityIcons 
                                name={favorites.includes(item.id) ? "star" : "star-outline"} 
                                size={22} 
                                color={favorites.includes(item.id) ? theme.primary : theme.fontSecondary} 
                            />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                            {item.campus || 'Talence'}
                        </Text>

                        {item.distance !== undefined && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md }}>
                                <MaterialCommunityIcons name="walk" size={14} color={theme.primary} />
                                <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold as any, color: theme.primary, marginLeft: 4 }}>
                                    {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                            {hoursText} • {totalRooms} {Translator.get('ROOMS') || 'Salles'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Reanimated.View>
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
                    data={sortedBuildings}
                    onScroll={onAnimatedScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: (insets.top || 0) + 70, paddingVertical: tokens.space.sm, flexGrow: 1 }}
                    renderItem={renderBuildingCard}
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
                            <MaterialCommunityIcons name="domain" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                fontSize: tokens.fontSize.md,
                                textAlign: 'center'
                            }}>
                                {Translator.get('NO_BUILDING_FOUND') || 'Aucun bâtiment trouvé'}
                            </Text>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

export default withHeaderAnimation(FreeRoomScreen);
