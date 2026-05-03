import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import WidgetCard from './WidgetCard';
import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { CrousService } from '../../Crous/CrousService';

const CrousWidget = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState([]);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            const loadResto = async () => {
                try {
                    const savedFavs = await AsyncStorage.getItem('crous_favorites');
                    let favs = [];
                    if (savedFavs) {
                        favs = JSON.parse(savedFavs);
                        if (isMounted) setFavorites(favs);
                    }

                    let lat = 44.8377;
                    let lon = -0.5791;

                    try {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === 'granted') {
                            const location = await Location.getLastKnownPositionAsync({});
                            if (location) {
                                lat = location.coords.latitude;
                                lon = location.coords.longitude;
                            }
                        }
                    } catch (e) {
                        console.log("Erreur GPS CrousWidget", e);
                    }

                    const restaurants = await CrousService.fetchRestaurantsBordeaux(lat, lon);
                    
                    if (isMounted && restaurants && restaurants.length > 0) {
                        const sortedRestaurants = [...restaurants].sort((a, b) => {
                            const aFav = favs.includes(a.id);
                            const bFav = favs.includes(b.id);
                            if (aFav && !bFav) return -1;
                            if (!aFav && bFav) return 1;
                            return (a.distance || 0) - (b.distance || 0);
                        });
                        
                        setRestaurant(sortedRestaurants[0]);
                    }
                } catch (error) {
                    console.log(error);
                } finally {
                    if (isMounted) setLoading(false);
                }
            };

            loadResto();

            return () => { isMounted = false; };
        }, [])
    );

    if (loading || !restaurant) {
        return (
            <WidgetCard 
                title={Translator.get('RESTAURANTS_U') || "Restos U & Cafets"}
                icon="food-fork-drink"
                onPress={() => navigation.navigate('Crous')}
                fullWidth
                color={theme.sectionsHeaders[1] || theme.secondary}
            >
                <View style={styles.centerContent}>
                    {loading ? <ActivityIndicator size="small" color={theme.secondary} /> : <Text style={{ color: theme.fontSecondary }}>{Translator.get('NO_RU_NEARBY')}</Text>}
                </View>
            </WidgetCard>
        );
    }

    return (
        <WidgetCard 
            title={Translator.get('RESTAURANTS_U') || "Restos U & Cafets"}
            icon="food-fork-drink"
            onPress={() => navigation.navigate('Crous')}
            fullWidth
            transparent={true}
            color={theme.sectionsHeaders[1] || theme.secondary}
        >
            <View 
                style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl, 
                    marginHorizontal: tokens.space.sm,
                    ...tokens.shadow.md, 
                    overflow: 'hidden', 
                }}
            >
                <View style={{ padding: tokens.space.md }}>
                {/* 1. TITRE ET ETOILE */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                    <Text style={{ 
                        fontSize: tokens.fontSize.lg, 
                        fontWeight: tokens.fontWeight.bold, 
                        color: theme.font,
                        flexShrink: 1
                    }}>
                        {restaurant.title}
                    </Text>
                    <MaterialCommunityIcons 
                        name={favorites.includes(restaurant.id) ? "star" : "star-outline"} 
                        size={22} 
                        color={favorites.includes(restaurant.id) ? theme.primary : theme.fontSecondary} 
                        style={{ marginLeft: 6 }}
                    />
                </View>
                
                {/* 2. LOCALISATION ET BADGE DISTANCE */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
                    <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                        {restaurant.short_desc}
                    </Text>

                    {restaurant.distance !== undefined && (
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
                                fontWeight: tokens.fontWeight.bold,
                                color: theme.primary,
                                marginLeft: 4
                            }}>
                                {restaurant.distance < 1 
                                    ? `${Math.round(restaurant.distance * 1000)} m` 
                                    : `${restaurant.distance.toFixed(1)} km`}
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
                        {restaurant.opening}
                    </Text>
                </View>
                </View>
            </View>
        </WidgetCard>
    );
};

const styles = StyleSheet.create({
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: tokens.space.sm,
    }
});

export default CrousWidget;
