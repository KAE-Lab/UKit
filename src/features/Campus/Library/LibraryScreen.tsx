import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { AppContext } from '../../../shared/services/AppCore';
import style, { tokens } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import LibraryService, { LibraryInfo, AffluencesData } from '../services/LibraryService';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { CampusCard } from '../components/CampusCard';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusLocation } from '../hooks/useCampusLocation';
import { useSavedFilter } from '../hooks/useSavedFilter';

function LibraryScreen({ navigation, onAnimatedScroll }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>; onAnimatedScroll?: (event: unknown) => void }) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    const { fetchLocation } = useCampusLocation();
    const { favorites, toggleFavorite } = useFavorites('library_favorites');
    const [selectedFilter, setSelectedFilter] = useSavedFilter('library_filter', 'all');
    
    const [searchText, setSearchText] = useState('');
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [affluences, setAffluences] = useState<Record<string, AffluencesData>>({});
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const loadLibraries = async () => {
            setLoading(true);
            try {
                const { lat, lon } = await fetchLocation();
                
                const nearbyLibs = await LibraryService.fetchNearbyLibraries(lat, lon);
                if (!mounted) return;
                setLibraries(nearbyLibs);

                const affluencesPromises = nearbyLibs.map(async (lib) => {
                    const data = await LibraryService.getAffluencesData(lib.slug);
                    return { id: lib.id, data };
                });

                const results = await Promise.all(affluencesPromises);
                if (!mounted) return;

                const newAffluences: Record<string, AffluencesData> = {};
                results.forEach(res => {
                    if (res.data) newAffluences[res.id] = res.data;
                });
                setAffluences(newAffluences);
            } catch (error) {
                console.error("Erreur critique dans loadLibraries:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadLibraries();
        return () => { mounted = false; };
    }, [fetchLocation]);

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
        { id: 'all', label: Translator.get('ALL_LIBRARIES' as Parameters<typeof Translator.get>[0]) },
        { id: 'open', label: Translator.get('OPEN_LIBRARIES' as Parameters<typeof Translator.get>[0]) }
    ];

    const renderItem = ({ item }: { item: LibraryInfo }) => {
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

        return (
            <CampusCard
                title={item.name}
                imageUrl={item.imageUrl}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluenceData })}
            >
                {/* Ligne : Ville + Badge de Distance */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                    <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                        {item.campus}
                    </Text>

                    {item.distance !== undefined && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: `${theme.primary}15`, 
                            paddingHorizontal: tokens.space.sm,
                            paddingVertical: 4,
                            borderRadius: tokens.radius.md,
                        }}>
                            <MaterialIcons name="directions-walk" size={14} color={theme.primary} />
                            <Text style={{
                                fontSize: tokens.fontSize.sm,
                                fontWeight: tokens.fontWeight.bold as never,
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

                {/* Jauge d'affluence en une ligne */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={16} color={statusColor} />
                    <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold as never, color: statusColor, marginLeft: 4, flexShrink: 1 }}>
                        {statusText}
                    </Text>
                    
                    {isOpen && rate !== null && (
                        <>
                            <View style={{ flex: 1, height: 6, backgroundColor: theme.greyBackground, borderRadius: 3, overflow: 'hidden', marginHorizontal: tokens.space.sm }}>
                                <View style={{ width: `${rate}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                            </View>
                            <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.bold as never }}>
                                {`${rate}%`}
                            </Text>
                        </>
                    )}
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
            searchPlaceholder={Translator.get('SEARCH_BU_CITY' as Parameters<typeof Translator.get>[0])}
            
            filterOptions={filterOptions}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            
            emptyIcon="bookshelf"
            emptyMessage={Translator.get('NO_BU_NEARBY')}
        />
    );
}

export default withHeaderAnimation(LibraryScreen);