import React, { useContext, useMemo } from 'react';
import { View, FlatList, Dimensions } from 'react-native';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { LoadingState } from '../../../../shared/ui/LoadingState';
import type { LibraryInfo } from '../../services/LibraryService';
import { useFavorites } from '../../hooks/useFavorites';
import { useNearbyLibraries } from '../../hooks/useNearbyLibraries';
import { useSavedFilter } from '../../hooks/useSavedFilter';
import { CampusPartialNotice } from '../../components/CampusLayoutComponents';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

import { LibrarySectionCard } from './LibrarySectionCard';
import { SectionEtatVide } from './SectionEtatVide';
import { useChargementDeSection, useRevisionDuTableauDeBord } from '../rafraichissement';

export function LibrarySection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    // Meme hook que la liste complete. Un echec plein reste discret ici — le carrousel disparait, la
    // ligne de journal du service dit pourquoi, et l'ecran dedie explique. Une couverture partielle,
    // elle, se dit : le carrousel montre une donnee reelle mais incomplete, ce qui ne se devine pas.
    const revision = useRevisionDuTableauDeBord();
    const { libraries, affluences, failure, secteursMuets, loading, enCours, retry } = useNearbyLibraries(userLat, userLon, revision);
    useChargementDeSection('bibliotheques', enCours);

    const { favorites: favBu, toggleFavorite: toggleFavBu } = useFavorites('library_favorites');
    const [libraryFilter, setFiltre] = useSavedFilter('library_filter', 'all');

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
        return (
            <LibrarySectionCard
                item={item}
                affluenceData={affluences[item.id]}
                navigation={navigation}
                isFavorite={favBu.includes(item.id)}
                onToggleFavorite={toggleFavBu}
            />
        );
    };

    return (
        <View style={{ marginTop: tokens.space.md }}>
            <SectionHeader
                title={Translator.get('UNIVERSITY_LIBRARY')}
                theme={theme}
                onPress={() => navigation.navigate('Library')}
            />

            {secteursMuets > 0 && !loading ? <CampusPartialNotice theme={theme} onRetry={retry} /> : null}

            {loading ? (
                <LoadingState theme={theme} />
            ) : (
                filteredLibraries.length === 0 ? (
                    <SectionEtatVide
                        theme={theme}
                        failure={failure}
                        masquesParFiltre={libraries.length > 0}
                        messageVide={Translator.get('NO_BU_NEARBY')}
                        onToutAfficher={() => setFiltre('all')}
                        onRetry={retry}
                        onOuvrir={() => navigation.navigate('Library')}
                    />
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
                )
            )}
        </View>
    );
}
