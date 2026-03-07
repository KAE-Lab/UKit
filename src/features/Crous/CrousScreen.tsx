import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { CrousService, CrousRestaurant } from './CrousService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';

const defaultImage = require('../../../assets/images/default_resto.png');

export default function CrousScreen({ navigation }: any) {
    const AppContextValues = useContext(AppContext) as any;
    const theme = style.Theme[AppContextValues.themeName];

    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationError, setLocationError] = useState(false);

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

        // Coordonnées du A22 en dur si la localisation échoue (pour les tests sur émulateur)
        userLat = 44.8048;
        userLon = -0.5954;


        const data = await CrousService.fetchRestaurantsBordeaux(userLat, userLon);
        setRestaurants(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.accent ?? theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.courseBackground }}>
            <View style={{ flex: 1 }}>
                <FlatList
                    data={restaurants}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: tokens.space.sm }}
                    renderItem={({ item }) => {
                        const imageSource = item.image_url ? { uri: item.image_url } : defaultImage;

                        return (
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
                                    marginHorizontal: tokens.space.md,
                                    ...tokens.shadow.md, 
                                    overflow: 'hidden', 
                                }}
                            >
                                {/* IMAGE */}
                                <Image 
                                    source={imageSource}
                                    style={{
                                        width: '100%',
                                        height: 180, 
                                        resizeMode: 'cover',
                                        backgroundColor: theme.greyBackground 
                                    }}
                                />

                                {/* LES INFOS */}
                                <View style={{ padding: tokens.space.md }}>
                                    
                                    {/* Titre */}
                                    <Text style={{ 
                                        fontSize: tokens.fontSize.lg, 
                                        fontWeight: tokens.fontWeight.bold as any, 
                                        color: theme.font,
                                        marginBottom: tokens.space.xs
                                    }}>
                                        {item.title}
                                    </Text>
                                    
                                    {/* Ligne : Ville + Badge de Distance */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
                                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                                            {item.short_desc}
                                        </Text>

                                        {/* Badge de Distance */}
                                        {item.distance !== undefined && (
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: `${theme.primary}15`, 
                                                paddingHorizontal: tokens.space.sm,
                                                paddingVertical: 4,
                                                borderRadius: tokens.radius.pill,
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

                                    {/* Ligne : Horaires */}
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
                        );
                    }}
                />
            </View>
        </SafeAreaView>
    );
}