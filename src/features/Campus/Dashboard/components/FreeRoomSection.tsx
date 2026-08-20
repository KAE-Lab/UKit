import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, FlatList, Dimensions } from 'react-native';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { LoadingState } from '../../../../shared/ui/LoadingState';
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
            } catch {
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
            <SectionHeader
                title={Translator.get('FREE_ROOMS')}
                theme={theme}
                onPress={() => navigation.navigate('FreeRoomScreen')}
            />

            {loading ? (
                <LoadingState theme={theme} />
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
