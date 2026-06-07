import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { AppContext } from '../../../shared/services/AppCore';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { CampusDataManager as DataManager } from '../services/CampusDataManager';
import { BuildingInfo, getDistanceInKm } from '../services/FreeRoomService';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { FreeRoomListItem } from './components/FreeRoomListItem';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusLocation } from '../hooks/useCampusLocation';

function FreeRoomScreen({ navigation, onAnimatedScroll }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, onAnimatedScroll?: (event: unknown) => void }) {
    const AppContextValues = useContext(AppContext);
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const { fetchLocation } = useCampusLocation();
    const { favorites, toggleFavorite } = useFavorites('freeroom_favorites');
    
    const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadBuildings = async () => {
            setLoading(true);
            try {
                let bList: BuildingInfo[] = DataManager.getBuildingList() as unknown as BuildingInfo[];
                if (!bList || bList.length === 0) {
                    await DataManager.fetchBuildingList();
                    bList = DataManager.getBuildingList() as unknown as BuildingInfo[];
                }

                if (mounted) {
                    const { lat, lon } = await fetchLocation();

                    if (bList) {
                        bList = bList.map((b: BuildingInfo) => {
                            if (lat !== undefined && lon !== undefined && b.lat && b.lng) {
                                b.distance = getDistanceInKm(lat, lon, b.lat, b.lng);
                            }
                            return b;
                        });
                    }

                    setBuildings(bList || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadBuildings();
        return () => { mounted = false; };
    }, [fetchLocation]);

    const filteredData = useMemo(() => {
        let result = [...buildings].sort((a, b) => {
            const aFav = favorites.includes(a.id);
            const bFav = favorites.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });
        
        if (searchText.trim().length > 0) {
            const query = searchText.toLowerCase().trim();
            result = result.filter(item => {
                const matchName = item.name.toLowerCase().includes(query);
                const matchCity = item.campus && item.campus.toLowerCase().includes(query);
                return matchName || matchCity;
            });
        }

        return result;
    }, [buildings, favorites, searchText]);

    const renderItem = ({ item }: { item: BuildingInfo }) => {
        return (
            <FreeRoomListItem
                item={item}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
            />
        );
    };

    return (
        <CampusListLayout
            data={filteredData}
            loading={loading}
            renderItem={renderItem}
            onAnimatedScroll={onAnimatedScroll}
            navigation={navigation}
            
            hasSearch={true}
            searchText={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={Translator.get('SEARCH_BUILDING' as Parameters<typeof Translator.get>[0]) || 'Rechercher un bâtiment...'}
            
            emptyIcon="domain"
            emptyMessage={Translator.get('NO_BUILDING_FOUND' as Parameters<typeof Translator.get>[0]) || 'Aucun bâtiment trouvé'}
        />
    );
}

export default withHeaderAnimation(FreeRoomScreen);
