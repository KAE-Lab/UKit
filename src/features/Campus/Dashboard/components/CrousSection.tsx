import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { CrousService, CrousRestaurant } from '../../services/CrousService';
import { useFavorites } from '../../hooks/useFavorites';
import { useSavedFilter } from '../../hooks/useSavedFilter';
import { CrousSectionCard, CARD_WIDTH } from './CrousSectionCard';
import { UnifiedTouchable } from '../../../../shared/ui/UnifiedTouchable';

const { width } = Dimensions.get('window');

export function CrousSection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const { favorites: favRu, toggleFavorite: toggleFavRu } = useFavorites('crous_favorites');
    const [crousFilter] = useSavedFilter('crous_filter', 'all');

    useEffect(() => {
        mountedRef.current = true;
        if (userLat === undefined || userLon === undefined) return;

        setLoading(true);
        CrousService.fetchRestaurantsBordeaux(userLat, userLon).then(data => {
            if (mountedRef.current) {
                setRestaurants(data);
                setLoading(false);
            }
        }).catch(() => {
            if (mountedRef.current) setLoading(false);
        });
        return () => { mountedRef.current = false; };
    }, [userLat, userLon]);

    const filteredRestaurants = useMemo(() => {
        return [...restaurants].filter(item => {
            if (crousFilter !== 'all') {
                const titleLower = item.title.toLowerCase();
                const isRestoU = titleLower.includes("crous cafet") || titleLower.includes("resto u");
                const isMarket = titleLower.includes("crous moovy market") || titleLower.includes("crous market");
                
                if (crousFilter === 'resto' && !isRestoU) return false;
                if (crousFilter === 'market' && !isMarket) return false;
            }
            return true;
        }).sort((a, b) => {
            const aFav = favRu.includes(a.id);
            const bFav = favRu.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });
    }, [restaurants, favRu, crousFilter]);

    const renderCard = ({ item }: { item: CrousRestaurant }) => (
        <CrousSectionCard
            item={item}
            theme={theme}
            isFavorite={favRu.includes(item.id)}
            onToggleFavorite={toggleFavRu}
            onPress={() => navigation.navigate('CrousMenu', {
                restaurantId: item.id,
                restaurantName: item.title,
                location: { lat: item.lat, lon: item.lon }
            })}
        />
    );

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <UnifiedTouchable
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                onPress={() => navigation.navigate('Crous')}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
                    {Translator.get('RESTAURANT_U') || 'Restaurants Universitaires'}
                </Text>
                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
            </UnifiedTouchable>

            {loading ? (
                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
            ) : (
                <FlatList
                    horizontal
                    data={filteredRestaurants}
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
