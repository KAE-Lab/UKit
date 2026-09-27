import React, { useContext, useMemo } from 'react';

import style from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import type { CrousRestaurant } from '../../services/CrousService';
import { useCrousRestaurants } from '../../hooks/useCrousRestaurants';
import { useFavorites } from '../../hooks/useFavorites';
import { useSavedFilter } from '../../hooks/useSavedFilter';
import { CrousSectionCard } from './CrousSectionCard';
import { SqueletteDeCarrouselDeLieux } from './SqueletteDeCarrousel';
import { SectionEtatVide } from './SectionEtatVide';
import { useChargementDeSection, useRevisionDuTableauDeBord } from '../rafraichissement';
import { useAnnoncesLues } from '../annonces';
import { CarrouselDeLieux } from './CarrouselDeLieux';
import { SectionDuTableau } from './SectionDuTableau';

const identifiant = (restaurant: CrousRestaurant) => restaurant.id;

export function CrousSection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    // Meme hook que la liste complete : un echec y reste discret — le carrousel disparait et la ligne
    // de journal du service dit pourquoi. Le tableau de bord n'est pas l'endroit ou l'on explique une
    // panne, l'ecran dedie l'est.
    const revision = useRevisionDuTableauDeBord();
    const { restaurants, failure, loading, enCours, retry } = useCrousRestaurants(userLat, userLon, revision);
    useChargementDeSection('restaurants', enCours);

    const { favorites: favRu, toggleFavorite: toggleFavRu, pret: favorisLus } = useFavorites('crous_favorites');
    const [crousFilter, setFiltre, filtreLu] = useSavedFilter('crous_filter', 'all');
    // Les cartes attendent aussi les favoris et le filtre : triees sans eux, elles se retrieraient
    // une fraction de seconde plus tard, sous les yeux (useFavorites.ts). Et les annonces : une carte
    // speciale arrivee apres coup pousserait tout le carrousel (annonces.tsx).
    const annoncesLues = useAnnoncesLues();
    const enAttente = loading || !favorisLus || !filtreLu || !annoncesLues;

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

    const renderCard = (item: CrousRestaurant, rang: number) => (
        <CrousSectionCard
            item={item}
            rang={rang}
            theme={theme}
            isFavorite={favRu.includes(item.id)}
            onToggleFavorite={toggleFavRu}
            onPress={() => navigation.navigate('CrousMenu', {
                restaurantId: item.id,
                restaurantName: item.title,
                // `lng` est la convention de l'application ; le `lon` de Croustillant se traduit ici.
                location: { lat: item.lat, lng: item.lon },
                openingLines: item.openingLines
            })}
        />
    );

    return (
        <SectionDuTableau>
            <SectionHeader
                title={Translator.get('RESTAURANTS_U')}
                theme={theme}
                onPress={() => navigation.navigate('Crous')}
            />

            {enAttente ? (
                <SqueletteDeCarrouselDeLieux theme={theme} libelle={Translator.get('LOADING_CAMPUS_OPEN')} />
            ) : (
                filteredRestaurants.length === 0 ? (
                    <SectionEtatVide
                        theme={theme}
                        failure={failure}
                        masquesParFiltre={restaurants.length > 0}
                        messageVide={Translator.get('NO_RU_NEARBY')}
                        onToutAfficher={() => setFiltre('all')}
                        onRetry={retry}
                        onOuvrir={() => navigation.navigate('Crous')}
                    />
                ) : (
                <CarrouselDeLieux
                    emplacement="restaurants"
                    lieux={filteredRestaurants}
                    cleDuLieu={identifiant}
                    rendreLieu={renderCard}
                    theme={theme}
                    navigation={navigation}
                />
                )
            )}
        </SectionDuTableau>
    );
}
