import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import LibraryService, { LibraryInfo, AffluencesData } from '../../services/LibraryService';
import { useFavorites } from '../../hooks/useFavorites';
import { useSavedFilter } from '../../hooks/useSavedFilter';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

import { LibrarySectionCard } from './LibrarySectionCard';

export function LibrarySection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [affluences, setAffluences] = useState<Record<string, AffluencesData>>({});
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const { favorites: favBu, toggleFavorite: toggleFavBu } = useFavorites('library_favorites');
    const [libraryFilter] = useSavedFilter('library_filter', 'all');

    useEffect(() => {
        mountedRef.current = true;
        if (userLat === undefined || userLon === undefined) return;

        const loadBu = async () => {
            setLoading(true);
            try {
                const buData = await LibraryService.fetchNearbyLibraries(userLat, userLon);
                if (!mountedRef.current) return;
                setLibraries(buData);
                setLoading(false);

                const newAffluences: Record<string, AffluencesData> = {};
                const promises = buData.map(lib =>
                    LibraryService.getAffluencesData(lib.slug)
                        .then(res => { if (res) newAffluences[lib.id] = res; })
                        .catch(() => { })
                );
                await Promise.all(promises);
                if (mountedRef.current) setAffluences(newAffluences);
            } catch (e) {
                if (mountedRef.current) setLoading(false);
            }
        };

        loadBu();
        return () => { mountedRef.current = false; };
    }, [userLat, userLon]);

    const filteredLibraries = useMemo(() => {
        return [...libraries].filter(item => {
            if (libraryFilter === 'open') {
                const affluenceData = affluences[item.id];
                const isOpen = affluenceData?.isOpen ?? true;
                if (!isOpen) return false;
            }
            return true;
        }).sort((a, b) => {
            const aFav = favBu.includes(a.id);
            const bFav = favBu.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });
    }, [libraries, favBu, libraryFilter, affluences]);

    const renderCard = ({ item }: { item: LibraryInfo }) => {
        return (
            <LibrarySectionCard
                item={item}
                affluenceData={affluences[item.id]}
                navigation={navigation}
                isFavorite={favBu.includes(item.id)}
                onToggleFavorite={toggleFavBu}
            />
        );
    };

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                onPress={() => navigation.navigate('Library')}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
                    {Translator.get('UNIVERSITY_LIBRARY') || 'Bibliothèques Universitaires'}
                </Text>
                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
            ) : (
                <FlatList
                    horizontal
                    data={filteredLibraries}
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
