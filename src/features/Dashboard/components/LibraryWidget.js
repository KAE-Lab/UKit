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
import LibraryService from '../../Library/LibraryService';

const LibraryWidget = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const [library, setLibrary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState([]);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;
            const loadLibrary = async () => {
                try {
                    const savedFavs = await AsyncStorage.getItem('library_favorites');
                    let favs = [];
                    if (savedFavs) {
                        favs = JSON.parse(savedFavs);
                        if (isMounted) setFavorites(favs);
                    }

                    let lat = 44.8048;
                    let lon = -0.5954;

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
                        console.log("Erreur GPS LibraryWidget", e);
                    }

                    const libraries = await LibraryService.fetchNearbyLibraries(lat, lon);
                    if (isMounted && libraries && libraries.length > 0) {
                        const sortedLibraries = [...libraries].sort((a, b) => {
                            const aFav = favs.includes(a.id);
                            const bFav = favs.includes(b.id);
                            if (aFav && !bFav) return -1;
                            if (!aFav && bFav) return 1;
                            return (a.distance || 0) - (b.distance || 0);
                        });

                        const topLibrary = sortedLibraries[0];
                        const affluence = await LibraryService.getAffluencesData(topLibrary.slug);
                        setLibrary({ ...topLibrary, affluence });
                    }
                } catch (error) {
                    console.log(error);
                } finally {
                    if (isMounted) setLoading(false);
                }
            };

            loadLibrary();

            return () => { isMounted = false; };
        }, [])
    );

    if (loading || !library) {
        return (
            <WidgetCard 
                title={Translator.get('LIBRARIES') || "Bibliothèques (BU)"}
                icon="bookshelf"
                onPress={() => navigation.navigate('Library')}
                fullWidth
                color={theme.sectionsHeaders[2] || theme.primary}
            >
                <View style={styles.centerContent}>
                    {loading ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={{ color: theme.fontSecondary }}>{Translator.get('NO_BU_NEARBY')}</Text>}
                </View>
            </WidgetCard>
        );
    }

    const rate = library.affluence?.occupancyRate ?? null;
    const isOpen = library.affluence?.isOpen ?? true; 

    let statusColor = '#f44336';
    if (isOpen) {
        if (rate === null || rate < 50) statusColor = '#4caf50';
        else if (rate < 80) statusColor = '#ff9800';
        else statusColor = '#ff4436';
    }

    let statusText = isOpen ? (Translator.get('BU_OPEN') || 'Ouvert') : (Translator.get('BU_CLOSED') || 'Fermé');
    if (!isOpen && library.affluence?.openingText) { 
        statusText = `${statusText} - ${library.affluence.openingText}`;
    }

    return (
        <WidgetCard 
            title={Translator.get('LIBRARIES') || "Bibliothèques (BU)"}
            icon="bookshelf"
            onPress={() => navigation.navigate('Library')}
            fullWidth
            transparent={true}
            color={theme.sectionsHeaders[2] || theme.primary}
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
                {/* Titre et Etoile */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                    <Text style={{ 
                        fontSize: tokens.fontSize.lg, 
                        fontWeight: tokens.fontWeight.bold, 
                        color: theme.font,
                        flexShrink: 1
                    }}>
                        {library.name}
                    </Text>
                    <MaterialCommunityIcons 
                        name={favorites.includes(library.id) ? "star" : "star-outline"} 
                        size={22} 
                        color={favorites.includes(library.id) ? theme.primary : theme.fontSecondary} 
                        style={{ marginLeft: 6 }}
                    />
                </View>
                
                {/* Ligne : Ville + Badge de Distance */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
                    <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                    <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                        {library.campus}
                    </Text>

                    {/* Badge de Distance style RU */}
                    {library.distance !== undefined && (
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
                                fontWeight: tokens.fontWeight.bold,
                                color: theme.primary,
                                marginLeft: 4
                            }}>
                                {library.distance < 1 
                                    ? `${Math.round(library.distance * 1000)} m` 
                                    : `${library.distance.toFixed(1)} km`}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Jauge d'affluence */}
                <View style={{ marginTop: tokens.space.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <View style={{ flex: 1, paddingRight: tokens.space.sm }}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode='tail'
                                style={{
                                    fontSize: tokens.fontSize.xs,
                                    fontWeight: tokens.fontWeight.semibold,
                                    color: statusColor
                                }}>
                                {statusText} 
                            </Text>
                        </View>
                        {rate !== null && (
                            <View style={{ flexShrink: 0, minWidth: 35, alignItems: 'flex-end', paddingRight: 2 }}>
                                <Text style={{
                                    fontSize: tokens.fontSize.xs,
                                    color: theme.font,
                                    fontWeight: tokens.fontWeight.semibold
                                }}>
                                    {rate}%
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}>
                        {rate !== null && (
                            <View style={{ height: '100%', borderRadius: 3, width: `${rate}%`, backgroundColor: statusColor }} />
                        )}
                    </View>
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

export default LibraryWidget;
