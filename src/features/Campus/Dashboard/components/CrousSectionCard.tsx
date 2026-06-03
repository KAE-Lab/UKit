import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { tokens } from '../../../../shared/theme/Theme';
import style from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
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
        <Reanimated.View
            entering={FadeIn}
            layout={LinearTransition.springify()}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={{
                    width: CARD_WIDTH,
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl,
                    marginRight: tokens.space.md,
                    ...tokens.shadow.md,
                    overflow: 'hidden',
                }}
            >
                <View style={{ width: '100%', height: 160, backgroundColor: theme.greyBackground }}>
                    <Image source={defaultRuImage} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    {item.image_url && (
                        <Image source={{ uri: item.image_url }} style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }} />
                    )}
                </View>

                <View style={{ padding: tokens.space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1 }} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <TouchableOpacity onPress={() => onToggleFavorite(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                            <MaterialCommunityIcons name={isFavorite ? "star" : "star-outline"} size={22} color={isFavorite ? theme.primary : theme.fontSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                            {item.short_desc}
                        </Text>

                        {item.distance !== undefined && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: tokens.space.sm, paddingVertical: 4, borderRadius: tokens.radius.md }}>
                                <MaterialCommunityIcons name="walk" size={14} color={theme.primary} />
                                <Text style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: theme.primary, marginLeft: 4 }}>
                                    {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.fontSecondary} style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1, lineHeight: 20 }} numberOfLines={2}>
                            {item.opening || Translator.get('UNKNOWN')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    );
}
