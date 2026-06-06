import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { CampusDataManager as DataManager } from '../../services/CampusDataManager';
import { getDistanceInKm, BuildingInfo } from '../../services/FreeRoomService';
import { useFavorites } from '../../hooks/useFavorites';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

import { FreeRoomSectionCard } from './FreeRoomSectionCard';

export function FreeRoomSection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
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
                let bList: BuildingInfo[] = DataManager.getBuildingList() as unknown as BuildingInfo[];
                if (!bList || bList.length === 0) {
                    await DataManager.fetchBuildingList();
                    bList = DataManager.getBuildingList() as unknown as BuildingInfo[];
                }
                if (mountedRef.current) {
                    if (bList) {
                        bList = bList.map(b => {
                            if (userLat !== undefined && userLon !== undefined && b.lat && b.lng) {
                                b.distance = getDistanceInKm(userLat, userLon, b.lat, b.lng);
                            }
                            return b;
                        });
                    }
                    setBuildings(bList || []);
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
        return (
            <FreeRoomSectionCard 
                item={item} 
                navigation={navigation} 
                isFavorite={favBuildings.includes(item.id)} 
                onToggleFavorite={toggleFavBuilding} 
            />
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
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
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
