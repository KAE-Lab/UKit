import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { DataManager } from '../../../../shared/services/DataService';
import { getDistanceInKm, BuildingInfo } from '../../services/FreeRoomService';
import { useFavorites } from '../../hooks/useFavorites';

const defaultImage = require('../../../../../assets/images/default_resto.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export function FreeRoomSection({ navigation, userLat, userLon }: { navigation: any, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const { favorites: favBuildings, toggleFavorite: toggleFavBuilding } = useFavorites('freeroom_favorites');

    useEffect(() => {
        mountedRef.current = true;
        if (userLat === undefined || userLon === undefined) return;

        const loadBuildings = async () => {
            setLoading(true);
            try {
                let bList = DataManager.getBuildingList();
                if (!bList || bList.length === 0) {
                    await DataManager.fetchBuildingList();
                    bList = DataManager.getBuildingList();
                }
                if (mountedRef.current) {
                    if (bList) {
                        bList = (bList as any[]).map(b => {
                            if (userLat !== undefined && userLon !== undefined && b.lat && b.lng) {
                                b.distance = getDistanceInKm(userLat, userLon, b.lat, b.lng);
                            }
                            return b;
                        }) as any;
                    }
                    setBuildings((bList as any) || []);
                    setLoading(false);
                }
            } catch (e) {
                if (mountedRef.current) setLoading(false);
            }
        };

        loadBuildings();
        return () => { mountedRef.current = false; };
    }, [userLat, userLon]);

    const sortedBuildings = useMemo(() => {
        return [...buildings].sort((a, b) => {
            const aFav = favBuildings.includes(a.id);
            const bFav = favBuildings.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });
    }, [buildings, favBuildings]);

    const renderCard = ({ item }: { item: BuildingInfo }) => {
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
                        width: CARD_WIDTH,
                        backgroundColor: theme.cardBackground,
                        borderRadius: tokens.radius.xl, 
                        marginRight: tokens.space.md,
                        ...tokens.shadow.md, 
                        overflow: 'hidden', 
                    }}
                >
                    <Image source={imageSource} style={{ width: '100%', height: 160, resizeMode: 'cover', backgroundColor: theme.greyBackground }} />

                    <View style={{ padding: tokens.space.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, flexShrink: 1 }} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <TouchableOpacity onPress={() => toggleFavBuilding(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                                <MaterialCommunityIcons name={favBuildings.includes(item.id) ? "star" : "star-outline"} size={22} color={favBuildings.includes(item.id) ? theme.primary : theme.fontSecondary} />
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
                                {hoursText} • {totalRooms} {Translator.get('ROOMS' as Parameters<typeof Translator.get>[0]) || 'Salles'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Reanimated.View>
        );
    };

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                onPress={() => navigation.navigate('FreeRoomScreen')} // Wait, navigation key in Dashboard was 'FreeRoomScreen'? 
                // Let's keep it 'FreeRoomScreen' to match original file
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold as any, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
                    {Translator.get('FREE_ROOMS') || 'Salles Libres'}
                </Text>
                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
            ) : (
                <FlatList
                    horizontal
                    data={sortedBuildings}
                    renderItem={renderCard}
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + tokens.space.md}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                />
            )}
        </View>
    );
}
