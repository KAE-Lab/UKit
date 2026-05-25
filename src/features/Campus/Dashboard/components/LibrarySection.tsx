import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import LibraryService, { LibraryInfo, AffluencesData } from '../../services/LibraryService';
import { useFavorites } from '../../hooks/useFavorites';
import { useSavedFilter } from '../../hooks/useSavedFilter';

const defaultBuImage = require('../../../../../assets/images/default_resto.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export function LibrarySection({ navigation, userLat, userLon }: { navigation: any, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [affluences, setAffluences] = useState<Record<string, AffluencesData>>({});
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const { favorites: favBu, toggleFavorite: toggleFavBu } = useFavorites('library_favorites');
    const [libraryFilter] = useSavedFilter('library_filter', 'all');

    useEffect(() => {
        mountedRef.current = true;
        if (userLat === undefined || userLon === undefined) return;

        const loadBu = async () => {
            setLoading(true);
            try {
                const buData = await LibraryService.fetchNearbyLibraries(userLat, userLon);
                if (!mountedRef.current) return;
                setLibraries(buData);
                setLoading(false);

                const newAffluences: Record<string, AffluencesData> = {};
                const promises = buData.map(lib =>
                    LibraryService.getAffluencesData(lib.slug)
                        .then(res => { if (res) newAffluences[lib.id] = res; })
                        .catch(() => { })
                );
                await Promise.all(promises);
                if (mountedRef.current) setAffluences(newAffluences);
            } catch (e) {
                if (mountedRef.current) setLoading(false);
            }
        };

        loadBu();
        return () => { mountedRef.current = false; };
    }, [userLat, userLon]);

    const filteredLibraries = useMemo(() => {
        return [...libraries].filter(item => {
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
    }, [libraries, favBu, libraryFilter, affluences]);

    const renderCard = ({ item }: { item: LibraryInfo }) => {
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
                            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold as any, color: theme.font, flexShrink: 1 }} numberOfLines={1}>
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
                                    <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold as any, color: theme.primary, marginLeft: 4 }}>
                                        {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={16} color={statusColor} />
                            <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold as any, color: statusColor, marginLeft: 4, flexShrink: 1 }}>
                                {statusText}
                            </Text>
                            
                            {isOpen && rate !== null && (
                                <>
                                    <View style={{ flex: 1, height: 6, backgroundColor: theme.greyBackground, borderRadius: 3, overflow: 'hidden', marginHorizontal: tokens.space.sm }}>
                                        <View style={{ width: `${rate}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                                    </View>
                                    <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.bold as any }}>
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

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.space.md, marginBottom: tokens.space.sm }}
                onPress={() => navigation.navigate('Library')}
                activeOpacity={0.7}
            >
                <Text style={{ fontSize: 22, fontWeight: tokens.fontWeight.bold as any, fontFamily: 'Montserrat_600SemiBold', color: theme.font }}>
                    {Translator.get('UNIVERSITY_LIBRARY') || 'Bibliothèques Universitaires'}
                </Text>
                <MaterialIcons name="chevron-right" size={26} color={theme.fontSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator style={{ margin: tokens.space.xl }} color={theme.primary} />
            ) : (
                <FlatList
                    horizontal
                    data={filteredLibraries}
                    renderItem={renderCard}
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + tokens.space.md}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
                />
            )}
        </View>
    );
}
