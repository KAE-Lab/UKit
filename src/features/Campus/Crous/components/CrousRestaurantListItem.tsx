import React from 'react';
import { tokens } from '../../../../shared/theme/Theme';
import style from '../../../../shared/theme/Theme';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { CrousRestaurant } from '../../services/CrousService';
import { CampusCard } from '../../components/CampusCard';
import { DistanceBadge } from '../../components/CampusCardParts';

interface CrousRestaurantListItemProps {
    item: CrousRestaurant;
    theme: typeof style.Theme['light'];
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onPress: () => void;
}

export function CrousRestaurantListItem({ item, theme, isFavorite, onToggleFavorite, onPress }: CrousRestaurantListItemProps) {
    return (
        <CampusCard
            title={item.title}
            imageUrl={item.image_url}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onPress={onPress}
        >
            <MetaRow
                theme={theme}
                icon={{ family: 'material', name: 'location-on' }}
                label={item.short_desc}
                marginBottom={tokens.space.xs}
                trailing={item.distance !== undefined ? (
                    <DistanceBadge distance={item.distance} theme={theme} icon={{ name: 'walk' }} />
                ) : undefined}
            />

            {/*
              * **Une ligne, toujours.** Les horaires du fournisseur sont une phrase libre, parfois
              * longue : sur deux lignes, la carte d'un restaurant devenait plus haute que celle d'une
              * bibliotheque, et les sections cessaient d'etre alignees. La phrase est donc coupee ici,
              * et l'ecran de detail la donne en entier — c'est lui qui a la place.
              */}
            <MetaRow
                theme={theme}
                icon={{ name: 'calendar-clock' }}
                label={item.opening}
                gap={6}
                numberOfLines={1}
            />
        </CampusCard>
    );
}
