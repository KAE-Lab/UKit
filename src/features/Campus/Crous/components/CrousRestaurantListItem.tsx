import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { tokens } from '../../../../shared/theme/Theme';
import style from '../../../../shared/theme/Theme';
import { CrousRestaurant } from '../../services/CrousService';
import { CampusCard } from '../../components/CampusCard';

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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                    {item.short_desc}
                </Text>

                {item.distance !== undefined && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: `${theme.primary}15`,
                        paddingHorizontal: tokens.space.sm,
                        paddingVertical: 4,
                        borderRadius: tokens.radius.md,
                    }}>
                        <MaterialCommunityIcons name="walk" size={14} color={theme.primary} />
                        <Text style={{
                            fontSize: tokens.fontSize.sm,
                            fontWeight: tokens.fontWeight.bold,
                            color: theme.primary,
                            marginLeft: 4
                        }}>
                            {item.distance < 1
                                ? `${Math.round(item.distance * 1000)} m`
                                : `${item.distance.toFixed(1)} km`}
                        </Text>
                    </View>
                )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.fontSecondary} style={{ marginTop: 2 }} />
                <Text
                    style={{
                        fontSize: tokens.fontSize.sm,
                        color: theme.fontSecondary,
                        marginLeft: 6,
                        flex: 1,
                        lineHeight: 20
                    }}
                    numberOfLines={2}
                >
                    {item.opening}
                </Text>
            </View>
        </CampusCard>
    );
}
