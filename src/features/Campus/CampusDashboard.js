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
import { DataManager } from '../../shared/services/DataService';
import { CrousService, CrousRestaurant } from '../Crous/CrousService';
import LibraryService from '../Library/LibraryService';
import BdeService from '../Bde/BdeService';
import { getDistanceInKm } from '../FreeRoom/FreeRoomService';

const defaultRuImage = require('../../../assets/images/default_resto.png');
const defaultBuImage = require('../../../assets/images/default_resto.png');

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85; // Pour laisser dépasser la carte suivante

const CampusDashboard = ({ navigation }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const [restaurants, setRestaurants] = useState([]);
    const [libraries, setLibraries] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [affluences, setAffluences] = useState({});
    const [loadingRu, setLoadingRu] = useState(true);
    const [loadingBu, setLoadingBu] = useState(true);
    const [loadingBuildings, setLoadingBuildings] = useState(true);
    const [annonces, setAnnonces] = useState([]);
    const [loadingBde, setLoadingBde] = useState(true);

    const [favRu, setFavRu] = useState([]);
    const [favBu, setFavBu] = useState([]);
    const [favBuildings, setFavBuildings] = useState([]);
    const [crousFilter, setCrousFilter] = useState('all');
    const [libraryFilter, setLibraryFilter] = useState('all');
    
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

                    const savedFavBuildings = await AsyncStorage.getItem('freeroom_favorites');
                    if (savedFavBuildings) setFavBuildings(JSON.parse(savedFavBuildings));
                    
                    const savedFilter = await AsyncStorage.getItem('crous_filter');
                    if (savedFilter) setCrousFilter(savedFilter);

                    const savedLibFilter = await AsyncStorage.getItem('library_filter');
                    if (savedLibFilter) setLibraryFilter(savedLibFilter);
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

    const toggleFavBuilding = async (id) => {
        try {
            let newFavs = favBuildings.includes(id) ? favBuildings.filter(favId => favId !== id) : [...favBuildings, id];
            setFavBuildings(newFavs);
            await AsyncStorage.setItem('freeroom_favorites', JSON.stringify(newFavs));
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

        // Load BDE
        setLoadingBde(true);
        try {
            const bdeData = await BdeService.fetchAnnonces();
            if (mountedRef.current) {
                setAnnonces(bdeData);
                setLoadingBde(false);
            }
        } catch (e) {
            if (mountedRef.current) setLoadingBde(false);
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

        // Load Buildings
        setLoadingBuildings(true);
        try {
            let bList = DataManager.getBuildingList();
            if (!bList || bList.length === 0) {
                await DataManager.fetchBuildingList();
                bList = DataManager.getBuildingList();
            }
            if (mountedRef.current) {
                if (bList) {
                    bList = bList.map(b => {
                        if (userLat !== undefined && userLon !== undefined && b.lat && b.lng) {
                            b.distance = getDistanceInKm(userLat, userLon, b.lat, b.lng);
                        }
                        return b;
                    });
                }
                setBuildings(bList || []);
                setLoadingBuildings(false);
            }
        } catch (e) {
            if (mountedRef.current) setLoadingBuildings(false);
        }
    };

    const filteredRestaurants = [...restaurants].filter(item => {
        if (crousFilter !== 'all') {
            const isRestoU = item.title.includes("Crous Cafet") || item.title.includes("Resto U");
            const isMarket = item.title.includes("Crous Moovy Market") || item.title.includes("Crous Market");
            
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

    const filteredLibraries = [...libraries].filter(item => {
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

    const sortedBuildings = [...buildings].sort((a, b) => {
        const aFav = favBuildings.includes(a.id);
        const bFav = favBuildings.includes(b.id);
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

    const renderRuCard = ({ item }) => (
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
                            {item.opening_desc || Translator.get('UNKNOWN')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    );

    const renderBuCard = ({ item }) => {
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

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
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

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={16} color={statusColor} />
                            <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: statusColor, marginLeft: 4, flexShrink: 1 }}>
                                {statusText}
                            </Text>
                            
                            {isOpen && rate !== null && (
                                <>
                                    <View style={{ flex: 1, height: 6, backgroundColor: theme.greyBackground, borderRadius: 3, overflow: 'hidden', marginHorizontal: tokens.space.sm }}>
                                        <View style={{ width: `${rate}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                                    </View>
                                    <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.bold }}>
                                        {`${rate}%`}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Reanimated.View>
        );
    };

    const renderBuildingCard = ({ item }) => {
        const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultRuImage;
        const totalRooms = item.rooms ? item.rooms.length : 0;
        
        let hoursText = Translator.get('UNKNOWN') || 'Non communiqué';
        if (item.schedule) {
            const currentDay = new Date().getDay() || 7; // 1-7
            const daySchedule = item.schedule[String(currentDay)];
            if (daySchedule) {
                hoursText = `${daySchedule.open} - ${daySchedule.close}`;
            } else {
                hoursText = Translator.get('BU_CLOSED') || 'Fermé';
            }
        }
        
        return (
            <Reanimated.View 
                entering={FadeIn}
                layout={LinearTransition.springify()}
            >
                <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
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
                            <TouchableOpacity onPress={() => toggleFavBuilding(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                                <MaterialCommunityIcons name={favBuildings.includes(item.id) ? "star" : "star-outline"} size={22} color={favBuildings.includes(item.id) ? theme.primary : theme.fontSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                            <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                                {item.campus || 'Talence'}
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
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color={theme.fontSecondary} />
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                                {hoursText} • {totalRooms} {Translator.get('ROOMS') || 'Salles'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Reanimated.View>
        );
    };

    const renderBdeCard = ({ item }) => (
        <Reanimated.View
            entering={FadeIn}
            layout={LinearTransition.springify()}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('BdeDetail', { annonce: item })}
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
                    {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    ) : null}
                </View>

                <View style={{ padding: tokens.space.md }}>
                    <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1, marginBottom: 4 }} numberOfLines={1}>
                        {item.title}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: item.info_label ? 4 : 0 }}>
                        <MaterialCommunityIcons name="account" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                            {item.issuer_name}
                        </Text>
                    </View>

                    {item.info_label ? (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <MaterialCommunityIcons name="information-outline" size={16} color={theme.fontSecondary} style={{ marginTop: 2 }} />
                            <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1, lineHeight: 20 }} numberOfLines={2}>
                                {item.info_label}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    );

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderHeader(insets)}

                    <Animated.ScrollView
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: (insets?.top || 0) + 60, paddingBottom: tokens.space.xxl + 80 }}
                    >
                        {/* Student life */}
                        {(loadingBde || annonces.length > 0) ? (
                            <View style={{ marginTop: tokens.space.md }}>
                                <TouchableOpacity 
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                                    onPress={() => navigation.navigate('Bde')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.sectionTitle, { color: theme.font }]}>
                                        {Translator.get('STUDENT_LIFE') || 'Student life'}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
                                </TouchableOpacity>

                                {loadingBde ? (
                                    <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
                                ) : (
                                    <FlatList
                                        horizontal
                                        data={annonces}
                                        renderItem={renderBdeCard}
                                        keyExtractor={item => item.id}
                                        showsHorizontalScrollIndicator={false}
                                        snapToInterval={CARD_WIDTH + tokens.space.md}
                                        decelerationRate="fast"
                                        contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                                    />
                                )}
                            </View>
                        ) : null}

                        {/* Restaurants */}
                        <View style={{ marginTop: tokens.space.md }}>
                        <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                                onPress={() => navigation.navigate('Crous')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.sectionTitle, { color: theme.font }]}>
                                    {Translator.get('RESTAURANT_U') || 'Restaurants Universitaires'}
                                </Text>
                                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>

                            {loadingRu ? (
                                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
                            ) : (
                                <FlatList
                                    horizontal
                                    data={filteredRestaurants}
                                    renderItem={renderRuCard}
                                    keyExtractor={item => item.id}
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={CARD_WIDTH + tokens.space.md}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                                />
                            )}
                        </View>

                        {/* Bibliothèques */}
                        <View style={{ marginTop: tokens.space.md }}>
                        <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                                onPress={() => navigation.navigate('Library')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.sectionTitle, { color: theme.font }]}>
                                    {Translator.get('UNIVERSITY_LIBRARY') || 'Bibliothèques Universitaires'}
                                </Text>
                                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>

                            {loadingBu ? (
                                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
                            ) : (
                                <FlatList
                                    horizontal
                                    data={filteredLibraries}
                                    renderItem={renderBuCard}
                                    keyExtractor={item => item.id}
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={CARD_WIDTH + tokens.space.md}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                                />
                            )}
                        </View>

                        {/* Salles Libres (Bâtiments) */}
                        <View style={{ marginTop: tokens.space.md }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                                onPress={() => navigation.navigate('FreeRoomScreen')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.sectionTitle, { color: theme.font }]}>
                                    {Translator.get('FREE_ROOMS') || 'Salles Libres'}
                                </Text>
                                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>

                            {loadingBuildings ? (
                                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
                            ) : (
                                <FlatList
                                    horizontal
                                    data={sortedBuildings}
                                    renderItem={renderBuildingCard}
                                    keyExtractor={item => item.id}
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={CARD_WIDTH + tokens.space.md}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                                />
                            )}
                        </View>
                    </Animated.ScrollView>
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
        fontSize: 22,
        fontWeight: tokens.fontWeight.bold,
        fontFamily: 'Montserrat_600SemiBold',
    },
});

export default CampusDashboard;
