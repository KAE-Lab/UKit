import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Translator from '../../../../shared/i18n/Translator';
import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import { BuildingInfo } from '../services/FreeRoomService';
import { CampusCard } from '../../components/CampusCard';

interface FreeRoomListItemProps {
    item: BuildingInfo;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onPress: () => void;
}

export function FreeRoomListItem({ item, isFavorite, onToggleFavorite, onPress }: FreeRoomListItemProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const totalRooms = item.rooms ? item.rooms.length : 0;

    let hoursText = Translator.get('UNKNOWN') || 'Non communiqué';
    if (item.schedule) {
        const currentDay = new Date().getDay() || 7;
        const daySchedule = item.schedule[String(currentDay)];
        if (daySchedule) {
            hoursText = `${daySchedule.open} - ${daySchedule.close}`;
        } else {
            hoursText = Translator.get('BU_CLOSED') || 'Fermé';
        }
    }
    
    return (
        <CampusCard
            title={item.name}
            imageUrl={item.imageUrl}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onPress={onPress}
        >
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
        </CampusCard>
    );
}
