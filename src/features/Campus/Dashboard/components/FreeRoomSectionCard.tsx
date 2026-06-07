import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Reanimated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { BuildingInfo } from '../../services/FreeRoomService';

const defaultImage = require('../../../../../assets/images/default_resto.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

interface FreeRoomSectionCardProps {
    item: BuildingInfo;
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
}

export function FreeRoomSectionCard({ item, navigation, isFavorite, onToggleFavorite }: FreeRoomSectionCardProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultImage;
    const totalRooms = item.rooms ? item.rooms.length : 0;
    
    let hoursText = Translator.get('UNKNOWN') || 'Non communiqué';
    if (item.schedule) {
        const currentDay = new Date().getDay() || 7; // 1-7
        const daySchedule = item.schedule[String(currentDay)];
        if (daySchedule) {
            hoursText = `${daySchedule.open} - ${daySchedule.close}`;
        } else {
            hoursText = Translator.get('BU_CLOSED') || 'Fermé';
        }
    }
    
    return (
        <Reanimated.View 
            entering={FadeIn}
            layout={LinearTransition.springify()}
        >
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
                style={{
                    width: CARD_WIDTH,
                    backgroundColor: theme.cardBackground,
                    borderRadius: tokens.radius.xl, 
                    marginRight: tokens.space.md,
                    ...tokens.shadow.md, 
                    overflow: 'hidden', 
                }}
            >
                <Image source={imageSource} style={{ width: '100%', height: 160, resizeMode: 'cover', backgroundColor: theme.greyBackground }} />

                <View style={{ padding: tokens.space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: theme.font, flexShrink: 1 }} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <TouchableOpacity onPress={() => onToggleFavorite(item.id)} hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }} style={{ marginLeft: 6 }}>
                            <MaterialCommunityIcons name={isFavorite ? "star" : "star-outline"} size={22} color={isFavorite ? theme.primary : theme.fontSecondary} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: tokens.space.xs }}>
                        <MaterialIcons name="location-on" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                            {item.campus || 'Talence'}
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
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.fontSecondary} />
                        <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                            {hoursText} • {totalRooms} {Translator.get('ROOMS' as Parameters<typeof Translator.get>[0]) || 'Salles'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Reanimated.View>
    );
}
