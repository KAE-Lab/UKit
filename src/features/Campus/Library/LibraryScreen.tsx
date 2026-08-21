import React, { useState, useMemo } from 'react';

import Translator from '../../../shared/i18n/Translator';
import type { LibraryInfo } from '../services/LibraryService';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { LibraryListItem } from './components/LibraryListItem';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusPosition } from '../hooks/useCampusPosition';
import { useNearbyLibraries } from '../hooks/useNearbyLibraries';
import { useSavedFilter } from '../hooks/useSavedFilter';

function LibraryScreen({ navigation, onAnimatedScroll }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>; onAnimatedScroll?: (event: unknown) => void }) {

    const { lat, lon } = useCampusPosition();
    const { favorites, toggleFavorite } = useFavorites('library_favorites');
    const [selectedFilter, setSelectedFilter] = useSavedFilter('library_filter', 'all');

    const [searchText, setSearchText] = useState('');
    const { libraries, affluences, failure, secteursMuets, loading, retry } = useNearbyLibraries(lat, lon);

    const filteredData = useMemo(() => {
        let result = [...libraries].sort((a, b) => {
            const aFav = favorites.includes(a.id);
            const bFav = favorites.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });

        return result.filter(item => {
            if (selectedFilter === 'open') {
                const isOpen = affluences[item.id]?.isOpen ?? true; 
                if (!isOpen) return false;
            }

            if (searchText.trim().length > 0) {
                const query = searchText.toLowerCase().trim();
                const matchName = item.name.toLowerCase().includes(query);
                const matchCity = item.campus && item.campus.toLowerCase().includes(query);
                if (!matchName && !matchCity) return false;
            }

            return true;
        });
    }, [libraries, favorites, searchText, selectedFilter, affluences]);

    const filterOptions = [
        { id: 'all', label: Translator.get('ALL_LIBRARIES') },
        { id: 'open', label: Translator.get('OPEN_LIBRARIES') }
    ];

    const renderItem = ({ item }: { item: LibraryInfo }) => {
        return (
            <LibraryListItem
                item={item}
                affluenceData={affluences[item.id]}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluences[item.id] })}
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
            searchPlaceholder={Translator.get('SEARCH_BU_CITY')}
            
            filterOptions={filterOptions}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            
            emptyIcon="bookshelf"
            emptyTitle={Translator.get('NO_BU_NEARBY_TITLE')}
            emptyMessage={Translator.get('NO_BU_NEARBY')}
            failure={failure}
            onRetry={retry}
            partial={secteursMuets > 0}
        />
    );
}

export default withHeaderAnimation(LibraryScreen);