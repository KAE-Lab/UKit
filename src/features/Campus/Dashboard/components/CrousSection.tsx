import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { CrousService, CrousRestaurant } from '../../services/CrousService';
import { useFavorites } from '../../hooks/useFavorites';
import { useSavedFilter } from '../../hooks/useSavedFilter';

const defaultRuImage = require('../../../../../assets/images/default_resto.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

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
        <Reanimated.View
            entering={FadeIn}
            layout={LinearTransition.springify()}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CrousMenu', {
                    restaurantId: item.id,
                    restaurantName: item.title,
                    location: { lat: item.lat, lon: item.lon }
                })}
                style={{
                    width: CARD_WIDTH,
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl,
                    marginRight: tokens.space.md,
                    ...tokens.shadow.md,
                    overflow: 'hidden',
                }}
            >
                <View style={{ width: '100%', height: 160, backgroundColor: theme.greyBackground }}>
                    <Image source={defaultRuImage} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    {item.image_url && (
                        <Image source={{ uri: item.image_url }} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    )}
                </View>

                <View style={{ padding: tokens.space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1 }} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <TouchableOpacity onPress={() => toggleFavRu(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                            <MaterialCommunityIcons name={favRu.includes(item.id) ? "star" : "star-outline"} size={22} color={favRu.includes(item.id) ? theme.primary : theme.fontSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                            {item.short_desc}
                        </Text>

                        {item.distance !== undefined && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md }}>
                                <MaterialCommunityIcons name="walk" size={14} color={theme.primary} />
                                <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary, marginLeft: 4 }}>
                                    {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.fontSecondary} style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1, lineHeight: 20 }} numberOfLines={2}>
                            {item.opening || Translator.get('UNKNOWN')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    );

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                onPress={() => navigation.navigate('Crous')}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
                    {Translator.get('RESTAURANT_U') || 'Restaurants Universitaires'}
                </Text>
                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>

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
