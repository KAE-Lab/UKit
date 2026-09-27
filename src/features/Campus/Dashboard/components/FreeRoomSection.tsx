import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';

import style from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { SectionHeader } from '../../../../shared/ui/SectionHeader';
import { CampusDataManager as DataManager } from '../../services/CampusDataManager';
import type { BuildingInfo } from '../../services/FreeRoomService';
import { getDistanceInKm } from '../../services/distance';
import type { UkitFailure } from '../../../../shared/aetherius';
import { useFavorites } from '../../hooks/useFavorites';

import { FreeRoomSectionCard } from './FreeRoomSectionCard';
import { SqueletteDeCarrouselDeLieux } from './SqueletteDeCarrousel';
import { SectionEtatVide } from './SectionEtatVide';
import { useChargementDeSection, useRevisionDuTableauDeBord } from '../rafraichissement';
import { useAnnoncesLues } from '../annonces';
import { CarrouselDeLieux } from './CarrouselDeLieux';
import { SectionDuTableau } from './SectionDuTableau';

const identifiant = (batiment: BuildingInfo) => batiment.id;

/**
 * Les batiments proches et l'etat de leur lecture. Sorti de la section au jalon 7-I, quand l'attente
 * des annonces l'a fait deborder : la lecture est un sujet, le rendu en est un autre.
 */
function useBatimentsDuTableau(userLat: number | undefined, userLon: number | undefined) {
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

    return { buildings, failure, loading, relire: () => setEssai((n) => n + 1) };
}

export function FreeRoomSection({ navigation, userLat, userLon }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>, userLat?: number, userLon?: number }) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    
    const { buildings, failure, loading, relire } = useBatimentsDuTableau(userLat, userLon);

    const { favorites: favBuildings, toggleFavorite: toggleFavBuilding, pret: favorisLus } = useFavorites('freeroom_favorites');
    // Les cartes attendent aussi les favoris : triees sans eux, elles se retrieraient sous les yeux.
    // Et les annonces, pour les cartes speciales (annonces.tsx).
    const annoncesLues = useAnnoncesLues();
    const enAttente = loading || !favorisLus || !annoncesLues;

    const sortedBuildings = useMemo(() => {
        return [...buildings].sort((a, b) => {
            const aFav = favBuildings.includes(a.id);
            const bFav = favBuildings.includes(b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return (a.distance || 0) - (b.distance || 0);
        });
    }, [buildings, favBuildings]);

    const renderCard = (item: BuildingInfo, rang: number) => {
        return (
            <FreeRoomSectionCard 
                item={item} 
                rang={rang}
                navigation={navigation} 
                isFavorite={favBuildings.includes(item.id)} 
                onToggleFavorite={toggleFavBuilding} 
            />
        );
    };

    return (
        <SectionDuTableau>
            <SectionHeader
                title={Translator.get('FREE_ROOMS')}
                theme={theme}
                onPress={() => navigation.navigate('FreeRoomScreen')}
            />

            {enAttente ? (
                <SqueletteDeCarrouselDeLieux theme={theme} libelle={Translator.get('LOADING_FREE_ROOMS')} />
            ) : sortedBuildings.length === 0 ? (
                <SectionEtatVide
                    theme={theme}
                    failure={failure}
                    masquesParFiltre={false}
                    messageVide={Translator.get('NO_BUILDING_FOUND')}
                    onRetry={relire}
                    onOuvrir={() => navigation.navigate('FreeRoomScreen')}
                />
            ) : (
                <CarrouselDeLieux
                    emplacement="salles"
                    lieux={sortedBuildings}
                    cleDuLieu={identifiant}
                    rendreLieu={renderCard}
                    theme={theme}
                    navigation={navigation}
                />
            )}
        </SectionDuTableau>
    );
}
