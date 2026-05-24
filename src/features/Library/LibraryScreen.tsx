import React, { useState, useEffect, useContext, useRef } from 'react';
import { Animated, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback } from 'react';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { AppContext } from '../../shared/services/AppCore';
import style, { tokens } from '../../shared/theme/Theme';
import Translator from '../../shared/i18n/Translator';
import LibraryService, { LibraryInfo, AffluencesData } from './LibraryService';
import { withHeaderAnimation, globalScrollValues } from '../../shared/navigation/NavHelpers';

const defaultLibraryImage = require('../../../assets/images/default_resto.png');

function LibraryScreen({ navigation, onAnimatedScroll, headerPadding }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void }; onAnimatedScroll?: unknown; headerPadding?: unknown }) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();

    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [affluences, setAffluences] = useState<Record<string, AffluencesData>>({});
    const [locationError, setLocationError] = useState(false);

    const [favorites, setFavorites] = useState<string[]>([]);
    
    // Search and filter state
    const [searchText, setSearchText] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'open'
    const [filterVisible, setFilterVisible] = useState(false);
    
    const route = useRoute();
    const mountedRef = useRef(true);
    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    useEffect(() => {
        const loadFilter = async () => {
            try {
                const savedFilter = await AsyncStorage.getItem('library_filter');
                if (savedFilter) {
                    setSelectedFilter(savedFilter);
                }
            } catch (e) { }
        };
        loadFilter();
    }, []);

    const updateFilter = async (filter: string) => {
        setSelectedFilter(filter);
        try {
            await AsyncStorage.setItem('library_filter', filter);
        } catch (e) { }
    };

    useFocusEffect(
        useCallback(() => {
            const loadFavorites = async () => {
                try {
                    const savedFavs = await AsyncStorage.getItem('library_favorites');
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
            await AsyncStorage.setItem('library_favorites', JSON.stringify(newFavs));
        } catch (e) {
            console.error("Erreur de sauvegarde des favoris", e);
        }
    };

    const sortedLibraries = [...libraries].sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return (a.distance || 0) - (b.distance || 0);
    });

    const filteredLibraries = sortedLibraries.filter(item => {
        if (selectedFilter === 'open') {
            const affluenceData = affluences[item.id];
            const isOpen = affluenceData?.isOpen ?? true; 
            if (!isOpen) return false;
        }

        if (searchText.trim().length > 0) {
            const query = searchText.toLowerCase().trim();
            const matchName = item.name.toLowerCase().includes(query);
            const matchCity = item.campus && item.campus.toLowerCase().includes(query);
            if (!matchName && !matchCity) return false;
        }

        return true;
    });

    useEffect(() => {
        const safeScrollY = globalScrollValues[route.key];
        const scale = safeScrollY?._buttonScale || 1.14;

        navigation.setOptions({
            headerRight: () => (
                <Animated.View style={{ transform: [{ scale }], height: 45, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => setFilterVisible(true)} style={{ paddingRight: tokens.space.md }}>
                        <View style={{ 
                            backgroundColor: theme.greyBackground, 
                            width: 45, height: 45, 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            borderRadius: tokens.radius.md, 
                            flexShrink: 0
                        }}>
                            <MaterialCommunityIcons 
                                name="filter-variant"
                                size={26} 
                                color={selectedFilter !== 'all' ? theme.primary : theme.fontSecondary} 
                            />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )
        });
    }, [navigation, theme, route.key, selectedFilter]);

    useEffect(() => {
        loadLibraries();
    }, []);

    const loadLibraries = async () => {
        setLoading(true);
        try {
            let userLat: number | undefined = undefined;
            let userLng: number | undefined = undefined;

            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status === 'granted') {
                let location = await Location.getLastKnownPositionAsync({});
                if (!location) {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
                if (location) {
                    userLat = location.coords.latitude;
                    userLng = location.coords.longitude;
                }
            } else {
                if (mountedRef.current) setLocationError(true);
            }

            // Fallback sur le campus de Talence si le GPS de l'émulateur échoue
            if (userLat === undefined || userLng === undefined) {
                userLat = 44.8048;
                userLng = -0.5954;
            }

            const fetchedLibs = await LibraryService.fetchNearbyLibraries(userLat, userLng);
            if (!mountedRef.current) return;

            const nearbyLibs = fetchedLibs;
            setLibraries(nearbyLibs);

            const affluencesPromises = nearbyLibs.map(async (lib) => {
                const data = await LibraryService.getAffluencesData(lib.slug);
                return { id: lib.id, data };
            });

            const results = await Promise.all(affluencesPromises);
            if (!mountedRef.current) return;

            const newAffluences: Record<string, AffluencesData> = {};
            results.forEach(res => {
                if (res.data) newAffluences[res.id] = res.data;
            });
            setAffluences(newAffluences);

        } catch (error) {
            console.error("Erreur critique dans loadLibraries:", error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const getOccupancyColor = (rate: number | null) => {
        if (rate === null) return theme.border;
        if (rate < 50) return '#4caf50'; 
        if (rate < 80) return '#ff9800'; 
        return '#f44336'; 
    };

    const renderLibraryCard = ({ item }: { item: LibraryInfo }) => {
        const affluenceData = affluences[item.id];
        const rate = affluenceData?.occupancyRate ?? null;
        const isOpen = affluenceData?.isOpen ?? true; 

        let statusColor = '#f44336';
        if (isOpen) {
            if (rate === null || rate < 50) statusColor = '#4caf50';
            else if (rate < 80) statusColor = '#ff9800';
            else statusColor = '#ff4436';
        }

        let statusText = isOpen ? (Translator.get('BU_OPEN')) : (Translator.get('BU_CLOSED'));
        if (!isOpen && affluenceData?.openingText) { 
            statusText = `${statusText} - ${affluenceData.openingText}`;
        }

        const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultLibraryImage;
        
        return (
            <Reanimated.View 
                entering={FadeIn}
                layout={LinearTransition.springify()}
            >
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluenceData })}
                style={{
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl, 
                    marginBottom: tokens.space.lg, 
                    marginHorizontal: tokens.space.sm,
                    ...tokens.shadow.md, 
                    overflow: 'hidden', 
                }}
            >
                {/* LA GRANDE IMAGE (Comme pour les RUs) */}
                <Image 
                    source={imageSource}
                    style={{
                        width: '100%',
                        height: 180, 
                        resizeMode: 'cover',
                        backgroundColor: theme.greyBackground 
                    }}
                />

                {/* LES INFOS EN DESSOUS */}
                <View style={{ padding: tokens.space.md }}>
                    
                    {/* Titre */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <Text style={{ 
                            fontSize: tokens.fontSize.lg, 
                            fontWeight: tokens.fontWeight.bold as never, 
                            color: theme.font,
                            flexShrink: 1
                        }}>
                            {item.name}
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
                    
                    {/* Ligne : Ville + Badge de Distance */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                            {item.campus}
                        </Text>

                        {/* Badge de Distance style RU */}
                        {item.distance !== undefined && (
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
                                    fontWeight: tokens.fontWeight.bold as never,
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

                    {/* Jauge d'affluence en une ligne */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={16} color={statusColor} />
                        <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold as never, color: statusColor, marginLeft: 4, flexShrink: 1 }}>
                            {statusText}
                        </Text>
                        
                        {isOpen && rate !== null && (
                            <>
                                <View style={{ flex: 1, height: 6, backgroundColor: theme.greyBackground, borderRadius: 3, overflow: 'hidden', marginHorizontal: tokens.space.sm }}>
                                    <View style={{ width: `${rate}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                                </View>
                                <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.bold as never }}>
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
                    data={filteredLibraries}
                    onScroll={onAnimatedScroll as never}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: (insets.top || 0) + 70, paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0)) + 80, flexGrow: 1 }}
                    renderItem={renderLibraryCard}
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
                            <MaterialCommunityIcons name="bookshelf" size={48} color={theme.fontSecondary} style={{ marginBottom: tokens.space.sm }} />
                            <Text style={{ 
                                color: theme.fontSecondary, 
                                fontSize: tokens.fontSize.md,
                                textAlign: 'center'
                            }}>
                                {searchText.length > 0 || selectedFilter !== 'all' 
                                    ? Translator.get('NO_RESULTS_FOUND' as Parameters<typeof Translator.get>[0]) 
                                    : Translator.get('NO_BU_NEARBY')}
                            </Text>
                        </View>
                    )}
                />
            </View>

            {/* SEARCH BAR */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'position' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                }}
            >
                <View style={{
                    paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0) - 15)
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.greyBackground,
                        borderRadius: tokens.radius.md,
                        paddingHorizontal: tokens.space.md,
                        marginHorizontal: tokens.space.md,
                        height: 45,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                    }}>
                        <MaterialCommunityIcons
                            name="magnify"
                            size={22}
                            color={theme.fontSecondary}
                            style={{ marginRight: tokens.space.sm }}
                        />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: tokens.fontSize.md,
                                color: theme.font,
                                padding: 0
                            }}
                            placeholder={Translator.get('SEARCH_BU_CITY' as Parameters<typeof Translator.get>[0])}
                            placeholderTextColor={theme.fontSecondary}
                            onChangeText={setSearchText}
                            value={searchText}
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchText('')}
                                style={{ padding: tokens.space.xs }}
                            >
                                <MaterialCommunityIcons name="close-circle" size={18} color={theme.fontSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* FILTER MODAL */}
            <Modal animationType="fade" transparent={true} visible={filterVisible} onRequestClose={() => setFilterVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
                    <View style={(theme.settings?.popup?.background || { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }) as never}>
                        <TouchableWithoutFeedback>
                            <View style={(theme.settings?.popup?.container || { backgroundColor: theme.cardBackground, width: "85%", borderRadius: tokens.radius.xl, padding: tokens.space.lg }) as never}>
                                <View style={(theme.settings?.popup?.header || { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.md }) as never}>
                                    <Text style={theme.settings?.popup?.textHeader || { fontSize: tokens.fontSize.lg, fontWeight: 'bold', color: theme.font }}>
                                        {Translator.get('FILTERS')}
                                    </Text>
                                    <TouchableOpacity onPress={() => setFilterVisible(false)}>
                                        <MaterialIcons name="close" size={28} color={theme.fontSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity onPress={() => { updateFilter('all'); setFilterVisible(false); }} style={{ paddingVertical: tokens.space.md, borderBottomWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name={selectedFilter === 'all' ? "radiobox-marked" : "radiobox-blank"} size={22} color={selectedFilter === 'all' ? theme.primary : theme.fontSecondary} style={{ marginRight: tokens.space.sm }} />
                                    <Text style={{ color: selectedFilter === 'all' ? theme.primary : theme.font, fontSize: tokens.fontSize.md, fontWeight: selectedFilter === 'all' ? 'bold' : 'normal' }}>{Translator.get('ALL_LIBRARIES' as Parameters<typeof Translator.get>[0])}</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity onPress={() => { updateFilter('open'); setFilterVisible(false); }} style={{ paddingVertical: tokens.space.md, flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name={selectedFilter === 'open' ? "radiobox-marked" : "radiobox-blank"} size={22} color={selectedFilter === 'open' ? theme.primary : theme.fontSecondary} style={{ marginRight: tokens.space.sm }} />
                                    <Text style={{ color: selectedFilter === 'open' ? theme.primary : theme.font, fontSize: tokens.fontSize.md, fontWeight: selectedFilter === 'open' ? 'bold' : 'normal' }}>{Translator.get('OPEN_LIBRARIES' as Parameters<typeof Translator.get>[0])}</Text>
                                </TouchableOpacity>
                                
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

export default withHeaderAnimation(LibraryScreen);