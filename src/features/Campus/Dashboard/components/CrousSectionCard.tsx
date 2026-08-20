import React from 'react';
import { View, Image, Dimensions } from 'react-native';
import { tokens } from '../../../../shared/theme/Theme';
import style from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import { Card } from '../../../../shared/ui/Card';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { CardTitleRow, DistanceBadge } from '../../components/CampusCardParts';
import { CrousRestaurant } from '../../services/CrousService';

const defaultRuImage = require('../../../../../assets/images/default_resto.png');
const { width } = Dimensions.get('window');
export const CARD_WIDTH = width * 0.85;

interface CrousSectionCardProps {
    item: CrousRestaurant;
    theme: typeof style.Theme['light'];
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
    onPress: () => void;
}

export function CrousSectionCard({ item, theme, isFavorite, onToggleFavorite, onPress }: CrousSectionCardProps) {
    return (
        <Card
            theme={theme}
            onPress={onPress}
            style={{ width: CARD_WIDTH, marginRight: tokens.space.md }}
        >
            <View style={{ width: '100%', height: 160, backgroundColor: theme.greyBackground }}>
                <Image source={defaultRuImage} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                {item.image_url && (
                    <Image source={{ uri: item.image_url }} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                )}
            </View>

            <View style={{ padding: tokens.space.md }}>
                <CardTitleRow
                    title={item.title}
                    theme={theme}
                    isFavorite={isFavorite}
                    onToggleFavorite={() => onToggleFavorite(item.id)}
                    numberOfLines={1}
                />

                <MetaRow
                    theme={theme}
                    icon={{ family: 'material', name: 'location-on' }}
                    label={item.short_desc}
                    numberOfLines={1}
                    marginBottom={tokens.space.xs}
                    trailing={item.distance !== undefined ? (
                        <DistanceBadge distance={item.distance} theme={theme} icon={{ name: 'walk' }} />
                    ) : undefined}
                />

                <MetaRow
                    theme={theme}
                    icon={{ name: 'calendar-clock' }}
                    label={item.opening || Translator.get('UNKNOWN')}
                    align="flex-start"
                    iconOffset={tokens.space.xxs}
                    numberOfLines={2}
                    textStyle={{ lineHeight: 20 }}
                />
            </View>
        </Card>
    );
}
