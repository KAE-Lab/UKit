import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { View, FlatList, Dimensions } from 'react-native';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import { CampusDataManager as DataManager } from '../../services/CampusDataManager';
import type { BuildingInfo } from '../../services/FreeRoomService';
import { getDistanceInKm } from '../../services/distance';
import type { UkitFailure } from '../../../../shared/aetherius';
import { useFavorites } from '../../hooks/useFavorites';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

import { FreeRoomSectionCard } from './FreeRoomSectionCard';
import { SectionEtatVide } from './SectionEtatVide';
import { useChargementDeSection, useRevisionDuTableauDeBord } from '../rafraichissement';

export function FreeRoomSection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
    const [failure, setFailure] = useState<UkitFailure | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [enCours, setEnCours] = useState(true);
    // Un compteur, comme les trois autres sections : « Reessayer » relit la source, et la section
    // etait la seule a ne pas le proposer (6.1-C).
    const [essai, setEssai] = useState(0);
    const revision = useRevisionDuTableauDeBord();
    useChargementDeSection('salles', enCours);
    const mountedRef = useRef(true);

    const { favorites: favBuildings, toggleFavorite: toggleFavBuilding } = useFavorites('freeroom_favorites');

    useEffect(() => {
        mountedRef.current = true;
        if (userLat === undefined || userLon === undefined) return;

        const loadBuildings = async () => {
            setEnCours(true);
            try {
                let bList: BuildingInfo[] = DataManager.getBuildingList() as unknown as BuildingInfo[];
                // L'attente ne s'affiche que s'il n'y a rien a montrer ; un tirer par-dessus des
                // batiments les garde a l'ecran.
                setLoading(!bList || bList.length === 0);
                if (!bList || bList.length === 0 || revision > 0) {
                    // L'echec n'est retenu que s'il ne reste rien a montrer : un cache peuple survit a
                    // un rafraichissement rate, sinon une liste complete se presenterait comme une
                    // panne (meme regle que `FreeRoomScreen`, docs/defauts-fonctionnels.md).
                    const echec = await DataManager.fetchBuildingList();
                    bList = DataManager.getBuildingList() as unknown as BuildingInfo[];
                    setFailure(echec !== null && (!bList || bList.length === 0) ? echec : undefined);
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
                    setLoading(false);
                    setEnCours(false);
                }
            } catch {
                if (mountedRef.current) {
                    setLoading(false);
                    setEnCours(false);
                }
            }
        };

        loadBuildings();
        return () => { mountedRef.current = false; };
    }, [userLat, userLon, essai, revision]);

    const sortedBuildings = useMemo(() => {
        return [...buildings].sort((a, b) => {
            const aFav = favBuildings.includes(a.id);
            const bFav = favBuildings.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });
    }, [buildings, favBuildings]);

    const renderCard = ({ item }: { item: BuildingInfo }) => {
        return (
            <FreeRoomSectionCard 
                item={item} 
                navigation={navigation} 
                isFavorite={favBuildings.includes(item.id)} 
                onToggleFavorite={toggleFavBuilding} 
            />
        );
    };

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <SectionHeader
                title={Translator.get('FREE_ROOMS')}
                theme={theme}
                onPress={() => navigation.navigate('FreeRoomScreen')}
            />

            {loading ? (
                <LoadingState theme={theme} />
            ) : sortedBuildings.length === 0 ? (
                <SectionEtatVide
                    theme={theme}
                    failure={failure}
                    masquesParFiltre={false}
                    messageVide={Translator.get('NO_BUILDING_FOUND')}
                    onRetry={() => setEssai((n) => n + 1)}
                    onOuvrir={() => navigation.navigate('FreeRoomScreen')}
                />
            ) : (
                <FlatList
                    horizontal
                    data={sortedBuildings}
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
