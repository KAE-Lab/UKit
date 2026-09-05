import React, { useState, useContext, useMemo } from 'react';

import { AppContext } from '../../../shared/services/AppCore';
import style from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import type { CrousRestaurant } from '../services/CrousService';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { CrousRestaurantListItem } from './components/CrousRestaurantListItem';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusPosition } from '../hooks/useCampusPosition';
import { useCrousRestaurants } from '../hooks/useCrousRestaurants';
import { useSavedFilter } from '../hooks/useSavedFilter';

function CrousScreen({ navigation, onAnimatedScroll }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>; onAnimatedScroll?: (event: unknown) => void }) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const { lat, lon } = useCampusPosition();
    const { favorites, toggleFavorite } = useFavorites('crous_favorites');
    const [selectedFilter, setSelectedFilter] = useSavedFilter('crous_filter', 'all');

    const [searchText, setSearchText] = useState('');
    const { restaurants, failure, loading, retry } = useCrousRestaurants(lat, lon);

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
        { id: 'all', label: Translator.get('ALL_ESTABLISHMENTS') },
        { id: 'resto', label: Translator.get('RESTO_U') },
        { id: 'market', label: Translator.get('CROUS_MARKET') }
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
                // `lng` est la convention de l'application ; le `lon` de Croustillant se traduit ici.
                location: { lat: item.lat, lng: item.lon },
                openingLines: item.openingLines
            })}
        />
    );

    return (
        <CampusListLayout
            data={filteredData}
            loading={loading}
            messageChargement={Translator.get('LOADING_CAMPUS_OPEN')}
            renderItem={renderItem}
            onAnimatedScroll={onAnimatedScroll}
            navigation={navigation}
            
            hasSearch={true}
            searchText={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={Translator.get('SEARCH_RESTO_CITY')}
            
            filterOptions={filterOptions}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            
            emptyIcon="store-off-outline"
            emptyTitle={Translator.get('NO_RU_NEARBY_TITLE')}
            emptyMessage={Translator.get('NO_RU_NEARBY')}
            failure={failure}
            onRetry={retry}
        />
    );
}

export default withHeaderAnimation(CrousScreen);