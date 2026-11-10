import React, { useState, useEffect, useMemo } from 'react';

import Translator from '../../../shared/i18n/Translator';
import { CampusDataManager as DataManager } from '../services/CampusDataManager';
import { avecDistances, type BuildingInfo } from '../services/FreeRoomService';
import { ordreDesLieux } from '../services/ordreDesLieux';
import type { UkitFailure } from '../../../shared/aetherius';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';

import { CampusListLayout } from '../components/CampusListLayout';
import { FreeRoomListItem } from './components/FreeRoomListItem';
import { useFavorites } from '../hooks/useFavorites';
import { useCampusPosition } from '../hooks/useCampusPosition';

function FreeRoomScreen({ navigation, onAnimatedScroll }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, onAnimatedScroll?: (event: unknown) => void }) {
    // La meme position que le tableau de bord, resolue une fois pour tout le Campus.
    const { resolue, lat, lon } = useCampusPosition();
    const { favorites, toggleFavorite } = useFavorites('freeroom_favorites');
    
    const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchText, setSearchText] = useState('');
    /**
     * L'echec de la source, quand il n'y a **rien** a afficher malgre lui.
     *
     * Un cache peuple survit a un rafraichissement rate : c'est seulement l'absence totale de donnee
     * qui merite un ecran d'echec. Sans cette distinction, une liste incomplete se presenterait comme
     * une panne, et une panne comme une liste vide — les deux mensonges que la Phase 6 supprime.
     */
    const [failure, setFailure] = useState<UkitFailure | null>(null);
    const [essai, setEssai] = useState(0);

    useEffect(() => {
        let mounted = true;
        if (!resolue) {
            return () => { mounted = false; };
        }
        const loadBuildings = async () => {
            setLoading(true);
            try {
                let bList: BuildingInfo[] = DataManager.getBuildingList() as unknown as BuildingInfo[];
                let echec: UkitFailure | null = null;
                if (!bList || bList.length === 0) {
                    echec = await DataManager.fetchBuildingList();
                    bList = DataManager.getBuildingList() as unknown as BuildingInfo[];
                }

                if (mounted) {
                    setBuildings(avecDistances(bList || [], lat, lon));
                    setFailure(bList && bList.length > 0 ? null : echec);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadBuildings();
        return () => { mounted = false; };
    }, [resolue, lat, lon, essai]);

    const filteredData = useMemo(() => {
        let result = [...buildings].sort(ordreDesLieux<BuildingInfo>(favorites, (batiment) => batiment.name));
        
        if (searchText.trim().length > 0) {
            const query = searchText.toLowerCase().trim();
            result = result.filter(item => {
                const matchName = item.name.toLowerCase().includes(query);
                const matchCity = item.campus && item.campus.toLowerCase().includes(query);
                return matchName || matchCity;
            });
        }

        return result;
    }, [buildings, favorites, searchText]);

    const renderItem = ({ item }: { item: BuildingInfo }) => {
        return (
            <FreeRoomListItem
                item={item}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
            />
        );
    };

    return (
        <CampusListLayout
            data={filteredData}
            loading={loading}
            messageChargement={Translator.get('LOADING_FREE_ROOMS')}
            renderItem={renderItem}
            onAnimatedScroll={onAnimatedScroll}
            navigation={navigation}
            
            hasSearch={true}
            searchText={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={Translator.get('SEARCH_BUILDING')}
            
            emptyIcon="domain"
            emptyTitle={Translator.get('NO_BUILDING_FOUND_TITLE')}
            emptyMessage={Translator.get('NO_BUILDING_FOUND')}

            failure={failure ?? undefined}
            onRetry={() => setEssai((n) => n + 1)}
        />
    );
}

export default withHeaderAnimation(FreeRoomScreen);
