import React, { useEffect, useState, useContext, useRef } from 'react';
import { Animated, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback } from 'react';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import Translator from '../../shared/i18n/Translator';
import { CrousService, CrousRestaurant } from './CrousService';
import style, { tokens } from '../../shared/theme/Theme';
import { AppContext } from '../../shared/services/AppCore';
import { withHeaderAnimation, globalScrollValues } from '../../shared/navigation/NavHelpers';

const defaultImage = require('../../../assets/images/default_resto.png');

function CrousScreen({ navigation, onAnimatedScroll, headerPadding }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> & { setOptions: (options: unknown) => void }; onAnimatedScroll?: unknown; headerPadding?: unknown }) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const theme = style.Theme[AppContextValues.themeName];
    const insets = useSafeAreaInsets();

    const [restaurants, setRestaurants] = useState<CrousRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationError, setLocationError] = useState(false);

    const [favorites, setFavorites] = useState<string[]>([]);

    // Nouveaux états pour la recherche et le filtre
    const [searchText, setSearchText] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'resto', 'market'
    const [filterVisible, setFilterVisible] = useState(false);

    const route = useRoute();
    const mountedRef = useRef(true);
    useEffect(() => { return () => { mountedRef.current = false; }; }, []);

    useEffect(() => {
        const loadFilter = async () => {
            try {
                const savedFilter = await AsyncStorage.getItem('crous_filter');
                if (savedFilter) {
                    setSelectedFilter(savedFilter);
                }
            } catch (e) {
                console.error("Erreur de lecture du filtre", e);
            }
        };
        loadFilter();
    }, []);

    const updateFilter = async (filter: string) => {
        setSelectedFilter(filter);
        try {
            await AsyncStorage.setItem('crous_filter', filter);
        } catch (e) {
            console.error("Erreur de sauvegarde du filtre", e);
        }
    };

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

    const filteredRestaurants = sortedRestaurants.filter(item => {
        // Filtrer par catégorie (Resto U / Crous Market)
        if (selectedFilter !== 'all') {
            const isRestoU = item.title.includes("Crous Cafet") || item.title.includes("Resto U");
            const isMarket = item.title.includes("Crous Moovy Market") || item.title.includes("Crous Market");

            if (selectedFilter === 'resto' && !isRestoU) return false;
            if (selectedFilter === 'market' && !isMarket) return false;
        }

        // Filtrer par texte (nom ou ville)
        if (searchText.trim().length > 0) {
            const query = searchText.toLowerCase().trim();
            const matchName = item.title.toLowerCase().includes(query);
            const matchCity = item.short_desc && item.short_desc.toLowerCase().includes(query);
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
                if (mountedRef.current) setLocationError(true);
            }
        } catch (e) {
            if (mountedRef.current) setLocationError(true);
        }

        const data = await CrousService.fetchRestaurantsBordeaux(userLat, userLon);
        if (!mountedRef.current) return;
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
                    data={filteredRestaurants}
                    onScroll={onAnimatedScroll as never}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: (insets.top || 0) + 70, paddingBottom: Math.max(tokens.space.sm, (insets?.bottom || 0)) + 80, flexGrow: 1 }}
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
                                {searchText.length > 0 || selectedFilter !== 'all'
                                    ? Translator.get('NO_RESULTS_FOUND' as Parameters<typeof Translator.get>[0])
                                    : Translator.get('NO_RU_NEARBY')}
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
                                            fontWeight: tokens.fontWeight.bold as never,
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
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
                            placeholder={Translator.get('SEARCH_RESTO_CITY' as Parameters<typeof Translator.get>[0])}
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
                                    <Text style={{ color: selectedFilter === 'all' ? theme.primary : theme.font, fontSize: tokens.fontSize.md, fontWeight: selectedFilter === 'all' ? 'bold' : 'normal' }}>{Translator.get('ALL_ESTABLISHMENTS' as Parameters<typeof Translator.get>[0])}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => { updateFilter('resto'); setFilterVisible(false); }} style={{ paddingVertical: tokens.space.md, borderBottomWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name={selectedFilter === 'resto' ? "radiobox-marked" : "radiobox-blank"} size={22} color={selectedFilter === 'resto' ? theme.primary : theme.fontSecondary} style={{ marginRight: tokens.space.sm }} />
                                    <Text style={{ color: selectedFilter === 'resto' ? theme.primary : theme.font, fontSize: tokens.fontSize.md, fontWeight: selectedFilter === 'resto' ? 'bold' : 'normal' }}>{Translator.get('RESTO_U' as Parameters<typeof Translator.get>[0])}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => { updateFilter('market'); setFilterVisible(false); }} style={{ paddingVertical: tokens.space.md, flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name={selectedFilter === 'market' ? "radiobox-marked" : "radiobox-blank"} size={22} color={selectedFilter === 'market' ? theme.primary : theme.fontSecondary} style={{ marginRight: tokens.space.sm }} />
                                    <Text style={{ color: selectedFilter === 'market' ? theme.primary : theme.font, fontSize: tokens.fontSize.md, fontWeight: selectedFilter === 'market' ? 'bold' : 'normal' }}>{Translator.get('CROUS_MARKET' as Parameters<typeof Translator.get>[0])}</Text>
                                </TouchableOpacity>

                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

export default withHeaderAnimation(CrousScreen);