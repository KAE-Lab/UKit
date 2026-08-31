import React, { useContext } from 'react';
import { View, Image, Dimensions } from 'react-native';
import moment from 'moment';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import Translator from '../../../../shared/i18n/Translator';
import { Card } from '../../../../shared/ui/Card';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { CardTitleRow, DistanceBadge } from '../../components/CampusCardParts';
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

    let hoursText = Translator.get('UNKNOWN');
    if (item.schedule) {
        const currentDay = moment().day() || 7; // 1-7, et suit le mock temporel
        const daySchedule = item.schedule[String(currentDay)];
        if (daySchedule) {
            hoursText = `${daySchedule.open} - ${daySchedule.close}`;
        } else {
            hoursText = Translator.get('BUILDING_CLOSED_LABEL');
        }
    }

    return (
        <Card
            theme={theme}
            onPress={() => navigation.navigate('FreeRoomDetails', { building: item })}
            style={{ width: CARD_WIDTH, marginRight: tokens.space.md }}
        >
            <Image source={imageSource} style={{ width: '100%', height: 160, resizeMode: 'cover', backgroundColor: theme.greyBackground }} />

            <View style={{ padding: tokens.space.md }}>
                <CardTitleRow
                    title={item.name}
                    theme={theme}
                    isFavorite={isFavorite}
                    onToggleFavorite={() => onToggleFavorite(item.id)}
                    numberOfLines={1}
                />

                <MetaRow
                    theme={theme}
                    icon={{ family: 'material', name: 'location-on' }}
                    label={item.campus || 'Talence'}
                    numberOfLines={1}
                    marginBottom={tokens.space.xs}
                    trailing={item.distance !== undefined ? (
                        <DistanceBadge distance={item.distance} theme={theme} icon={{ name: 'walk' }} />
                    ) : undefined}
                />

                <MetaRow
                    theme={theme}
                    icon={{ name: 'clock-outline' }}
                    label={`${hoursText} • ${totalRooms} ${Translator.get('ROOMS')}`}
                />
            </View>
        </Card>
    );
}
