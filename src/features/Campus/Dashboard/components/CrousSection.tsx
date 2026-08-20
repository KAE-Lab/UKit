import React, { useContext, useMemo } from 'react';
import { View, FlatList } from 'react-native';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import type { CrousRestaurant } from '../../services/CrousService';
import { useCrousRestaurants } from '../../hooks/useCrousRestaurants';
import { useFavorites } from '../../hooks/useFavorites';
import { useSavedFilter } from '../../hooks/useSavedFilter';
import { CrousSectionCard, CARD_WIDTH } from './CrousSectionCard';

export function CrousSection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    // Meme hook que la liste complete : un echec y reste discret — le carrousel disparait et la ligne
    // de journal du service dit pourquoi. Le tableau de bord n'est pas l'endroit ou l'on explique une
    // panne, l'ecran dedie l'est.
    const { restaurants, loading } = useCrousRestaurants(userLat, userLon);

    const { favorites: favRu, toggleFavorite: toggleFavRu } = useFavorites('crous_favorites');
    const [crousFilter] = useSavedFilter('crous_filter', 'all');

    const filteredRestaurants = useMemo(() => {
        return [...restaurants].filter(item => {
            if (crousFilter !== 'all') {
                const titleLower = item.title.toLowerCase();
                const isRestoU = titleLower.includes("crous cafet") || titleLower.includes("resto u");
                const isMarket = titleLower.includes("crous moovy market") || titleLower.includes("crous market");
                
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
    }, [restaurants, favRu, crousFilter]);

    const renderCard = ({ item }: { item: CrousRestaurant }) => (
        <CrousSectionCard
            item={item}
            theme={theme}
            isFavorite={favRu.includes(item.id)}
            onToggleFavorite={toggleFavRu}
            onPress={() => navigation.navigate('CrousMenu', {
                restaurantId: item.id,
                restaurantName: item.title,
                location: { lat: item.lat, lon: item.lon }
            })}
        />
    );

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <SectionHeader
                title={Translator.get('RESTAURANTS_U')}
                theme={theme}
                onPress={() => navigation.navigate('Crous')}
            />

            {loading ? (
                <LoadingState theme={theme} />
            ) : (
                <FlatList
                    horizontal
                    data={filteredRestaurants}
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
