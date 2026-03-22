import React, { useEffect, useState, useContext, useRef } from 'react';
import { Animated, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { CrousService, CrousRestaurant } from './CrousService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import { withHeaderAnimation } from '../../shared/navigation/NavHelpers';

const defaultImage = require('../../../assets/images/default_resto.png');

function CrousScreen({ navigation, onAnimatedScroll, headerPadding }: any) {
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
                    data={restaurants}
                    onScroll={onAnimatedScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 115, paddingVertical: tokens.space.sm }}
                    renderItem={({ item }) => (
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
                                <Text style={{ 
                                    fontSize: tokens.fontSize.lg, 
                                    fontWeight: tokens.fontWeight.bold as any, 
                                    color: theme.font,
                                    marginBottom: tokens.space.xs
                                }}>
                                    {item.title}
                                </Text>
                                
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
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

export default withHeaderAnimation(CrousScreen);