import React, { useEffect, useState, useContext, useRef } from 'react';
import { Animated, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import Translator from '../../shared/i18n/Translator';
import { CrousService, CrousRestaurant } from './CrousService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import { withHeaderAnimation } from '../../shared/navigation/NavHelpers';

const defaultImage = require('../../../assets/images/default_resto.png');

function CrousScreen({ navigation, onAnimatedScroll, headerPadding }: any) {
    const AppContextValues = useContext(AppContext) as any;
    const theme = style.Theme[AppContextValues.themeName];
    const insets = useSafeAreaInsets();

    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationError, setLocationError] = useState(false);

    const [favorites, setFavorites] = useState<string[]>([]);

    /* * On recharge les favoris a chaque fois que l'ecran est au premier plan.
     * C'est indispensable pour synchroniser l'etat si l'utilisateur a clique 
     * sur l'etoile depuis la page de details du restaurant.
     */
    useFocusEffect(
        useCallback(() => {
            const loadFavorites = async () => {
                try {
                    const savedFavs = await AsyncStorage.getItem('crous_favorites');
                    if (savedFavs) {
                        setFavorites(JSON.parse(savedFavs));
                    }
                } catch (e) {
                    console.error("Erreur de lecture des favoris", e);
                }
            };
            loadFavorites();
        }, [])
    );

    const toggleFavorite = async (id: string) => {
        try {
            let newFavs = [...favorites];
            if (newFavs.includes(id)) {
                newFavs = newFavs.filter(favId => favId !== id);
            } else {
                newFavs.push(id);
            }
            setFavorites(newFavs);
            await AsyncStorage.setItem('crous_favorites', JSON.stringify(newFavs));
        } catch (e) {
            console.error("Erreur de sauvegarde des favoris", e);
        }
    };

    /* * On ecrase le tri par defaut pour forcer les restaurants favoris en haut de la liste, 
     * puis on garde le tri par distance classique pour le reste.
     */
    const sortedRestaurants = [...restaurants].sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return (a.distance || 0) - (b.distance || 0);
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        let userLat: number | undefined = undefined;
        let userLon: number | undefined = undefined;

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status === 'granted') {
                let location = await Location.getLastKnownPositionAsync({});
                
                if (!location) {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }

                if (location) {
                    userLat = location.coords.latitude;
                    userLon = location.coords.longitude;
                }
            } else {
                setLocationError(true);
            }
        } catch (e) {
            setLocationError(true);
        }

        const data = await CrousService.fetchRestaurantsBordeaux(userLat, userLon);
        setRestaurants(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1 }}>
                <Animated.FlatList
                    data={sortedRestaurants}
                    onScroll={onAnimatedScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: (insets.top || 0) + 70, paddingVertical: tokens.space.sm, flexGrow: 1 }}
                    ListEmptyComponent={() => (
                        <View style={{ 
                            alignItems: 'center', 
                            paddingVertical: tokens.space.xl, 
                            paddingHorizontal: tokens.space.lg,
                            marginHorizontal: tokens.space.sm,
                            backgroundColor: theme.cardBackground, 
                            borderRadius: tokens.radius.lg, 
                            borderWidth: 1, 
                            borderColor: theme.border 
                        }}>
                            <MaterialCommunityIcons name="store-off-outline" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                fontSize: tokens.fontSize.md,
                                textAlign: 'center'
                            }}>
                                {Translator.get('NO_RU_NEARBY')}
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => (
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
                                backgroundColor: theme.cardBackground,
                                borderRadius: tokens.radius.xl, 
                                marginBottom: tokens.space.lg, 
                                marginHorizontal: tokens.space.sm,
                                ...tokens.shadow.md, 
                                overflow: 'hidden', 
                            }}
                        >
                            {/* Superposition des images pour gérer les 404 silencieusement sans state */}
                            <View style={{ width: '100%', height: 180, backgroundColor: theme.greyBackground }}>
                                <Image 
                                    source={defaultImage}
                                    style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                                />
                                
                                {item.image_url && (
                                    <Image 
                                        source={{ uri: item.image_url }}
                                        style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                                    />
                                )}
                            </View>

                            <View style={{ padding: tokens.space.md }}>
                                
                                {/* 1. TITRE ET ETOILE */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                                    <Text style={{ 
                                        fontSize: tokens.fontSize.lg, 
                                        fontWeight: tokens.fontWeight.bold as any, 
                                        color: theme.font,
                                        flexShrink: 1
                                    }}>
                                        {item.title}
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => toggleFavorite(item.id)}
                                        hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
                                        style={{ marginLeft: 6 }}
                                    >
                                        <MaterialCommunityIcons 
                                            name={favorites.includes(item.id) ? "star" : "star-outline"} 
                                            size={22} 
                                            color={favorites.includes(item.id) ? theme.primary : theme.fontSecondary} 
                                        />
                                    </TouchableOpacity>
                                </View>
                                
                                {/* 2. LOCALISATION ET BADGE DISTANCE (restaure) */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
                                    <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                                        {item.short_desc}
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
                                            <MaterialCommunityIcons name="walk" size={14} color={theme.primary} />
                                            <Text style={{
                                                fontSize: tokens.fontSize.sm,
                                                fontWeight: tokens.fontWeight.bold as any,
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

                                {/* 3. HORAIRES */}
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.fontSecondary} style={{ marginTop: 2 }} />
                                    <Text 
                                        style={{ 
                                            fontSize: tokens.fontSize.sm, 
                                            color: theme.fontSecondary, 
                                            marginLeft: 6, 
                                            flex: 1, 
                                            lineHeight: 20 
                                        }}
                                        numberOfLines={2} 
                                    >
                                        {item.opening}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Reanimated.View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

export default withHeaderAnimation(CrousScreen);