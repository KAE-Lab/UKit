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
import { CampusCard } from '../components/CampusCard';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusLocation } from '../hooks/useCampusLocation';

function FreeRoomScreen({ navigation, onAnimatedScroll }: any) {
    const AppContextValues = useContext(AppContext) as any;
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
                let bList = DataManager.getBuildingList();
                if (!bList || bList.length === 0) {
                    await DataManager.fetchBuildingList();
                    bList = DataManager.getBuildingList();
                }

                if (mounted) {
                    const { lat, lon } = await fetchLocation();

                    if (bList) {
                        bList = (bList as any[]).map((b: BuildingInfo) => {
                            if (lat !== undefined && lon !== undefined && b.lat && b.lng) {
                                b.distance = getDistanceInKm(lat, lon, b.lat, b.lng);
                            }
                            return b;
                        }) as any;
                    }

                    setBuildings(bList as any || []);
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
        const totalRooms = item.rooms ? item.rooms.length : 0;

        let hoursText = Translator.get('UNKNOWN') || 'Non communiqué';
        if (item.schedule) {
            const currentDay = new Date().getDay() || 7;
            const daySchedule = item.schedule[String(currentDay)];
            if (daySchedule) {
                hoursText = `${daySchedule.open} - ${daySchedule.close}`;
            } else {
                hoursText = Translator.get('BU_CLOSED') || 'Fermé';
            }
        }
        
        return (
            <CampusCard
                title={item.name}
                imageUrl={item.imageUrl}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
            >
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
            </CampusCard>
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
