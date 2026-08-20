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

            <MetaRow
                theme={theme}
                icon={{ name: 'calendar-clock' }}
                label={item.opening}
                align="flex-start"
                iconOffset={tokens.space.xxs}
                gap={6}
                numberOfLines={2}
                textStyle={{ lineHeight: 20 }}
            />
        </CampusCard>
    );
}
