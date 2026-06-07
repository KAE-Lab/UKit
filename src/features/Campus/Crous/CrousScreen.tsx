import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { AppContext } from '../../../shared/services/AppCore';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { CrousService, CrousRestaurant } from '../services/CrousService';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { CrousRestaurantListItem } from './components/CrousRestaurantListItem';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusLocation } from '../hooks/useCampusLocation';
import { useSavedFilter } from '../hooks/useSavedFilter';

function CrousScreen({ navigation, onAnimatedScroll }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>; onAnimatedScroll?: (event: unknown) => void }) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const { fetchLocation } = useCampusLocation();
    const { favorites, toggleFavorite } = useFavorites('crous_favorites');
    const [selectedFilter, setSelectedFilter] = useSavedFilter('crous_filter', 'all');
    
    const [searchText, setSearchText] = useState('');
    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            setLoading(true);
            const { lat, lon } = await fetchLocation();
            
            const data = await CrousService.fetchRestaurantsBordeaux(lat, lon);
            if (!mounted) return;
            setRestaurants(data);
            setLoading(false);
        };

        loadData();
        return () => { mounted = false; };
    }, [fetchLocation]);

    const filteredData = useMemo(() => {
        let result = [...restaurants].sort((a, b) => {
            const aFav = favorites.includes(a.id);
            const bFav = favorites.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });

        return result.filter(item => {
            if (selectedFilter !== 'all') {
                const titleLower = item.title.toLowerCase();
                const isRestoU = titleLower.includes("crous cafet") || titleLower.includes("resto u");
                const isMarket = titleLower.includes("crous moovy market") || titleLower.includes("crous market");

                if (selectedFilter === 'resto' && !isRestoU) return false;
                if (selectedFilter === 'market' && !isMarket) return false;
            }

            if (searchText.trim().length > 0) {
                const query = searchText.toLowerCase().trim();
                const matchName = item.title.toLowerCase().includes(query);
                const matchCity = item.short_desc && item.short_desc.toLowerCase().includes(query);
                if (!matchName && !matchCity) return false;
            }

            return true;
        });
    }, [restaurants, favorites, searchText, selectedFilter]);

    const filterOptions = [
        { id: 'all', label: Translator.get('ALL_ESTABLISHMENTS' as Parameters<typeof Translator.get>[0]) },
        { id: 'resto', label: Translator.get('RESTO_U' as Parameters<typeof Translator.get>[0]) },
        { id: 'market', label: Translator.get('CROUS_MARKET' as Parameters<typeof Translator.get>[0]) }
    ];

    const renderItem = ({ item }: { item: CrousRestaurant }) => (
        <CrousRestaurantListItem
            item={item}
            theme={theme}
            isFavorite={favorites.includes(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onPress={() => navigation.navigate('CrousMenu', {
                restaurantId: item.id,
                restaurantName: item.title,
                location: { lat: item.lat, lon: item.lon }
            })}
        />
    );

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
            searchPlaceholder={Translator.get('SEARCH_RESTO_CITY' as Parameters<typeof Translator.get>[0])}
            
            filterOptions={filterOptions}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            
            emptyIcon="store-off-outline"
            emptyMessage={Translator.get('NO_RU_NEARBY')}
        />
    );
}

export default withHeaderAnimation(CrousScreen);