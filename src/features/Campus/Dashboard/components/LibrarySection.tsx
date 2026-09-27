import React, { useContext, useMemo } from 'react';

import style from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import type { LibraryInfo } from '../../services/LibraryService';
import { useFavorites } from '../../hooks/useFavorites';
import { useNearbyLibraries } from '../../hooks/useNearbyLibraries';
import { useSavedFilter } from '../../hooks/useSavedFilter';
import { CampusPartialNotice } from '../../components/CampusLayoutComponents';

import { LibrarySectionCard } from './LibrarySectionCard';
import { SqueletteDeCarrouselDeLieux } from './SqueletteDeCarrousel';
import { SectionEtatVide } from './SectionEtatVide';
import { useChargementDeSection, useRevisionDuTableauDeBord } from '../rafraichissement';
import { useAnnoncesLues } from '../annonces';
import { CarrouselDeLieux } from './CarrouselDeLieux';
import { SectionDuTableau } from './SectionDuTableau';

const identifiant = (bibliotheque: LibraryInfo) => bibliotheque.id;

export function LibrarySection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    // Meme hook que la liste complete. Un echec plein reste discret ici — le carrousel disparait, la
    // ligne de journal du service dit pourquoi, et l'ecran dedie explique. Une couverture partielle,
    // elle, se dit : le carrousel montre une donnee reelle mais incomplete, ce qui ne se devine pas.
    const revision = useRevisionDuTableauDeBord();
    const { libraries, affluences, failure, secteursMuets, loading, enCours, retry } = useNearbyLibraries(userLat, userLon, revision);
    useChargementDeSection('bibliotheques', enCours);

    const { favorites: favBu, toggleFavorite: toggleFavBu, pret: favorisLus } = useFavorites('library_favorites');
    const [libraryFilter, setFiltre, filtreLu] = useSavedFilter('library_filter', 'all');
    // Les cartes attendent les favoris et le filtre (useFavorites.ts) — et, sous le filtre « ouvertes »,
    // les affluences : c'est elles qui disent qu'une bibliotheque est fermee, et une carte montree
    // avant elles serait retiree sous les yeux quand elles arrivent. Et les annonces, pour les cartes
    // speciales (annonces.tsx).
    const annoncesLues = useAnnoncesLues();
    const enAttente = loading || !favorisLus || !filtreLu || !annoncesLues || (libraryFilter === 'open' && enCours);

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

    const renderCard = (item: LibraryInfo, rang: number) => {
        return (
            <LibrarySectionCard
                item={item}
                rang={rang}
                affluenceData={affluences[item.id]}
                navigation={navigation}
                isFavorite={favBu.includes(item.id)}
                onToggleFavorite={toggleFavBu}
            />
        );
    };

    return (
        <SectionDuTableau>
            <SectionHeader
                title={Translator.get('UNIVERSITY_LIBRARY')}
                theme={theme}
                onPress={() => navigation.navigate('Library')}
            />

            {secteursMuets > 0 && !enAttente ? <CampusPartialNotice theme={theme} onRetry={retry} /> : null}

            {enAttente ? (
                <SqueletteDeCarrouselDeLieux theme={theme} libelle={Translator.get('LOADING_CAMPUS_OPEN')} />
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
                <CarrouselDeLieux
                    emplacement="bibliotheques"
                    lieux={filteredLibraries}
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
