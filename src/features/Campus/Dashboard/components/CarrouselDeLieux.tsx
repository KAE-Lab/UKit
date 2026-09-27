/**
 * Le carrousel d'une section de lieux, avec ses cartes speciales en tete (jalon 7-I).
 *
 * Les trois sections de lieux — restaurants, bibliotheques, salles — y passent : la composition, la
 * carte speciale au gabarit de ses voisines et la mesure de ses impressions s'ecrivent ici une fois.
 * Une carte speciale est une annonce : la toucher ouvre sa fiche, comme partout ailleurs, et c'est la
 * fiche qui porte le lien d'un partenaire. Elle compte une impression, un lieu jamais.
 *
 * La section garde ce qui lui appartient : ses lieux, filtres et tries, et la carte d'un lieu.
 */

import React, { useCallback, useMemo } from 'react';
import type { ListRenderItem } from 'react-native';

import { tokens, type AppThemeType } from '../../../../shared/theme/Theme';
import { useImpressionsDAnnonces } from '../../../../shared/mesure/impressions';
import { BdeAnnonceCard } from '../../Bde/BdeAnnonceCard';
import { useCartesSpeciales } from '../annonces';
import { annonceDElement, composerCarrousel, type ElementDeCarrousel, type EmplacementDeLieux } from '../carrouselMixte';
import { CarrouselDeSection } from './CarrouselDeSection';
import { LARGEUR_CARTE_LIEU } from './gabarits';

export interface CarrouselDeLieuxProps<T> {
    emplacement: EmplacementDeLieux;
    lieux: readonly T[];
    cleDuLieu: (lieu: T) => string;
    /** La carte d'un lieu, a son rang dans le carrousel (speciales comprises) : l'entree s'echelonne. */
    rendreLieu: (lieu: T, rang: number) => React.ReactElement;
    theme: AppThemeType;
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export function CarrouselDeLieux<T>({ emplacement, lieux, cleDuLieu, rendreLieu, theme, navigation }: CarrouselDeLieuxProps<T>) {
    const speciales = useCartesSpeciales(emplacement);
    const elements = useMemo(() => composerCarrousel(speciales, lieux, cleDuLieu), [speciales, lieux, cleDuLieu]);
    const visibilite = useImpressionsDAnnonces<ElementDeCarrousel<T>>(annonceDElement);

    const renderItem: ListRenderItem<ElementDeCarrousel<T>> = ({ item, index }) => (item.nature === 'annonce' ? (
        <BdeAnnonceCard
            annonce={item.annonce}
            cadre="lieu"
            width={LARGEUR_CARTE_LIEU}
            rang={index}
            theme={theme}
            style={{ marginRight: tokens.space.md }}
            onPress={() => navigation.navigate('BdeDetail', { annonce: item.annonce })}
        />
    ) : rendreLieu(item.lieu, index));

    const cle = useCallback((element: ElementDeCarrousel<T>) => element.cle, []);

    return (
        <CarrouselDeSection data={elements} renderItem={renderItem} keyExtractor={cle} largeurCarte={LARGEUR_CARTE_LIEU} {...visibilite} />
    );
}
