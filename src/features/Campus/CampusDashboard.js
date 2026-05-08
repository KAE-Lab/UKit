import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import Translator from '../../shared/i18n/Translator';
import { CrousService, CrousRestaurant } from '../Crous/CrousService';
import { LibraryService, LibraryInfo } from '../Library/LibraryService';
import BdeWidget from '../Dashboard/components/BdeWidget'; // On réutilise le widget BDE tel quel pour l'instant

const defaultRuImage = require('../../../assets/images/default_resto.png');
const defaultBuImage = require('../../../assets/images/default_resto.png');

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85; // Pour laisser dépasser la carte suivante

const CampusDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const [restaurants, setRestaurants] = useState([]);
    const [libraries, setLibraries] = useState([]);
    const [affluences, setAffluences] = useState({});
    const [loadingRu, setLoadingRu] = useState(true);
    const [loadingBu, setLoadingBu] = useState(true);

    const [favRu, setFavRu] = useState([]);
    const [favBu, setFavBu] = useState([]);
    const mountedRef = useRef(true);
    const scrollY = useRef(new Animated.Value(0)).current;

    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    useFocusEffect(
        useCallback(() => {
            const loadFavorites = async () => {
                try {
                    const savedFavRu = await AsyncStorage.getItem('crous_favorites');
                    if (savedFavRu) setFavRu(JSON.parse(savedFavRu));

                    const savedFavBu = await AsyncStorage.getItem('library_favorites');
                    if (savedFavBu) setFavBu(JSON.parse(savedFavBu));
                } catch (e) { }
            };
            loadFavorites();
        }, [])
    );

    const toggleFavRu = async (id) => {
        try {
            let newFavs = favRu.includes(id) ? favRu.filter(favId => favId !== id) : [...favRu, id];
            setFavRu(newFavs);
            await AsyncStorage.setItem('crous_favorites', JSON.stringify(newFavs));
        } catch (e) { }
    };

    const toggleFavBu = async (id) => {
        try {
            let newFavs = favBu.includes(id) ? favBu.filter(favId => favId !== id) : [...favBu, id];
            setFavBu(newFavs);
            await AsyncStorage.setItem('library_favorites', JSON.stringify(newFavs));
        } catch (e) { }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        let userLat = undefined;
        let userLon = undefined;

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getLastKnownPositionAsync({});
                if (!location) location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (location) {
                    userLat = location.coords.latitude;
                    userLon = location.coords.longitude;
                }
            }
        } catch (e) { }

        // Fallback sur le campus de Talence si GPS absent (identique à LibraryScreen)
        if (userLat === undefined || userLon === undefined) {
            userLat = 44.8048;
            userLon = -0.5954;
        }

        // Load RUs
        setLoadingRu(true);
        try {
            const ruData = await CrousService.fetchRestaurantsBordeaux(userLat, userLon);
            if (mountedRef.current) {
                setRestaurants(ruData);
                setLoadingRu(false);
            }
        } catch (e) {
            if (mountedRef.current) setLoadingRu(false);
        }

        // Load BUs (async/await propre, identique à LibraryScreen)
        setLoadingBu(true);
        try {
            const buData = await LibraryService.fetchNearbyLibraries(userLat, userLon);
            if (!mountedRef.current) return;
            setLibraries(buData);
            setLoadingBu(false);

            const newAffluences = {};
            const promises = buData.map(lib =>
                LibraryService.getAffluencesData(lib.slug)
                    .then(res => { if (res) newAffluences[lib.id] = res; })
                    .catch(() => { })
            );
            await Promise.all(promises);
            if (mountedRef.current) setAffluences(newAffluences);
        } catch (e) {
            console.error('Erreur chargement BUs', e);
            if (mountedRef.current) setLoadingBu(false);
        }
    };

    const sortedRestaurants = [...restaurants].sort((a, b) => {
        const aFav = favRu.includes(a.id);
        const bFav = favRu.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return (a.distance || 0) - (b.distance || 0);
    });

    const sortedLibraries = [...libraries].sort((a, b) => {
        const aFav = favBu.includes(a.id);
        const bFav = favBu.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return (a.distance || 0) - (b.distance || 0);
    });

    const renderHeader = (insets) => {
        const topPadding = (insets?.top || 0);

        const opacity = scrollY.interpolate({
            inputRange: [0, 50],
            outputRange: [1, 0],
            extrapolate: 'clamp'
        });

        return (
            <Animated.View style={[styles.headerContainer, { paddingTop: topPadding, backgroundColor: 'transparent', opacity }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        {Translator.get('CAMPUS') || 'Campus'}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    const renderRuCard = useCallback(({ item }) => (
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
                        <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1 }}>
                            {item.title}
                        </Text>
                        <TouchableOpacity onPress={() => toggleFavRu(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                            <MaterialCommunityIcons name={favRu.includes(item.id) ? "star" : "star-outline"} size={22} color={favRu.includes(item.id) ? theme.primary : theme.fontSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
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
                            {item.opening_desc || Translator.get('UNKNOWN')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    ), [favRu, theme]);

    const renderBuCard = useCallback(({ item }) => {
        const affluenceData = affluences[item.id];
        const rate = affluenceData?.occupancyRate ?? null;
        const isOpen = affluenceData?.isOpen ?? true;

        let statusColor = '#f44336';
        if (isOpen) {
            if (rate === null || rate < 50) statusColor = '#4caf50';
            else if (rate < 80) statusColor = '#ff9800';
            else statusColor = '#ff4436';
        }

        let statusText = isOpen ? (Translator.get('BU_OPEN') || 'Ouvert') : (Translator.get('BU_CLOSED') || 'Fermé');
        if (!isOpen && affluenceData?.openingText) {
            statusText = `${statusText} - ${affluenceData.openingText}`;
        }

        const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultBuImage;

        return (
            <Reanimated.View
                entering={FadeIn}
                layout={LinearTransition.springify()}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluenceData })}
                    style={{
                        width: CARD_WIDTH,
                        backgroundColor: theme.cardBackground,
                        borderRadius: tokens.radius.xl,
                        marginRight: tokens.space.md,
                        ...tokens.shadow.md,
                        overflow: 'hidden',
                    }}
                >
                    <Image source={imageSource} style={{ width: '100%', height: 160, resizeMode: 'cover', backgroundColor: theme.greyBackground }} />

                    <View style={{ padding: tokens.space.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1 }} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <TouchableOpacity onPress={() => toggleFavBu(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                                <MaterialCommunityIcons name={favBu.includes(item.id) ? "star" : "star-outline"} size={22} color={favBu.includes(item.id) ? theme.primary : theme.fontSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.sm }}>
                            <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                                {item.campus}
                            </Text>

                            {item.distance !== undefined && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md }}>
                                    <MaterialIcons name="directions-walk" size={14} color={theme.primary} />
                                    <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary, marginLeft: 4 }}>
                                        {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ marginTop: tokens.space.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <View style={{ flex: 1, paddingRight: tokens.space.sm }}>
                                    <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: statusColor }}>
                                        {statusText}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary }}>
                                    {rate !== null ? `${rate}%` : (Translator.get('NO_AFFLUENCE_DATA') || 'Pas de données')}
                                </Text>
                            </View>

                            <View style={{ height: 6, backgroundColor: theme.greyBackground, borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ width: `${rate ?? 0}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Reanimated.View>
        );
    }, [favBu, affluences, theme]);

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}

                    <Animated.FlatList
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        ListHeaderComponent={() => (
                            <View style={{ paddingTop: (insets?.top || 0) + 60 }}>
                                {/* BDE Widget */}
                                <BdeWidget />

                                {/* Restaurants */}
                                <View style={{ marginTop: tokens.space.md }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}>
                                        <Text style={[styles.sectionTitle, { color: theme.fontSecondary, marginBottom: 0 }]}>
                                            {Translator.get('RESTAURANT_U') || 'Restaurants Universitaires'}
                                        </Text>
                                        <TouchableOpacity onPress={() => navigation.navigate('Crous')}>
                                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.fontSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {loadingRu ? (
                                        <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
                                    ) : (
                                        <FlatList
                                            horizontal
                                            data={sortedRestaurants}
                                            renderItem={renderRuCard}
                                            keyExtractor={item => item.id}
                                            extraData={favRu}
                                            showsHorizontalScrollIndicator={false}
                                            snapToInterval={CARD_WIDTH + tokens.space.md}
                                            decelerationRate="fast"
                                            contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                                        />
                                    )}
                                </View>

                                {/* Bibliothèques */}
                                <View style={{ marginTop: tokens.space.md }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}>
                                        <Text style={[styles.sectionTitle, { color: theme.fontSecondary, marginBottom: 0 }]}>
                                            {Translator.get('UNIVERSITY_LIBRARY') || 'Bibliothèques Universitaires'}
                                        </Text>
                                        <TouchableOpacity onPress={() => navigation.navigate('Library')}>
                                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.fontSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {loadingBu ? (
                                        <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
                                    ) : (
                                        <FlatList
                                            horizontal
                                            data={sortedLibraries}
                                            renderItem={renderBuCard}
                                            keyExtractor={item => item.id}
                                            extraData={[favBu, affluences]}
                                            showsHorizontalScrollIndicator={false}
                                            snapToInterval={CARD_WIDTH + tokens.space.md}
                                            decelerationRate="fast"
                                            contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                                        />
                                    )}
                                </View>
                            </View>
                        )}
                        data={[]} // On utilise ListHeaderComponent pour tout le contenu afin de gérer le scroll principal proprement
                        renderItem={() => null}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: tokens.space.xxl + 80 }} // Espace pour la tab bar
                    />
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 34,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: tokens.space.md,
    },
    sectionTitle: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.bold,
        marginLeft: tokens.space.xs,
        fontFamily: 'Montserrat_600SemiBold',
    },
});

export default CampusDashboard;
