import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { CrousService, CrousRestaurant } from './CrousService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';

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
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('CrousMenu', { restaurantId: item.id, restaurantName: item.title, location: { lat: item.lat, lon: item.lon } })}
                            style={[
                                style.schedule.course.root, 
                                { 
                                    backgroundColor: theme.eventBackground,
                                    marginHorizontal: tokens.space.md,
                                    marginVertical: tokens.space.xs,
                                    borderRadius: tokens.radius.lg,
                                    borderLeftWidth: 4,
                                    borderLeftColor: theme.accent ?? theme.primary,
                                    borderWidth: 1,
                                    borderColor: theme.eventBorder,
                                    overflow: 'hidden',
                                    ...tokens.shadow.sm,
                                }
                            ] as any}
                        >
                            <View style={style.schedule.course.row as any}>
                                <View style={[style.schedule.course.contentBlock, { padding: tokens.space.sm, paddingLeft: tokens.space.md }] as any}>
                                    
                                    {/* En-tête : Titre et icône */}
                                    <View style={style.schedule.course.contentType as any}>
                                        <Text style={[style.schedule.course.title, { color: theme.font, flex: 1 }] as any}>
                                            {item.title}
                                        </Text>
                                        <MaterialCommunityIcons 
                                            name="silverware-fork-knife" 
                                            size={16} 
                                            color={theme.accent ?? theme.primary} 
                                        />
                                    </View>
                                    
                                    {/* Ville */}
                                    <View style={[style.schedule.course.line, { alignItems: 'center' }] as any}>
                                        <MaterialIcons
                                            name="room"
                                            size={14}
                                            color={theme.fontSecondary}
                                            style={{ marginRight: tokens.space.xs }}
                                        />
                                        <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.medium as any }}>
                                            {item.short_desc}
                                        </Text>
                                    </View>

                                    {/* Horaires */}
                                    <View style={[style.schedule.course.line, { alignItems: 'center' }] as any}>
                                        <MaterialIcons
                                            name="date-range"
                                            size={14}
                                            color={theme.fontSecondary}
                                            style={{ marginRight: tokens.space.xs }}
                                        />
                                        <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.medium as any }}>
                                            {item.opening}
                                        </Text>
                                    </View>

                                    {/* Distance */}
                                    {item.distance !== undefined && (
                                        <View style={[style.schedule.course.line as any, { alignItems: 'center' }]}>
                                            <MaterialIcons name="directions-walk" size={14} color={theme.accent ?? theme.primary} style={{ marginRight: tokens.space.xs }} />
                                            <Text style={{ fontSize: tokens.fontSize.xs, color: theme.accent ?? theme.primary, fontWeight: tokens.fontWeight.bold as any }}>
                                                {item.distance < 1 
                                                    ? `${Math.round(item.distance * 1000)} m` 
                                                    : `${item.distance.toFixed(1)} km`}
                                            </Text>
                                        </View>
                                    )}

                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </SafeAreaView>
    );
}