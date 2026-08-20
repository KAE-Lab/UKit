import React, { useContext } from 'react';
import moment from 'moment';
import Translator from '../../../../shared/i18n/Translator';
import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { BuildingInfo } from '../../services/FreeRoomService';
import { CampusCard } from '../../components/CampusCard';
import { DistanceBadge } from '../../components/CampusCardParts';

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

    let hoursText = Translator.get('UNKNOWN');
    if (item.schedule) {
        const currentDay = moment().day() || 7; // 1-7, et suit le mock temporel
        const daySchedule = item.schedule[String(currentDay)];
        if (daySchedule) {
            hoursText = `${daySchedule.open} - ${daySchedule.close}`;
        } else {
            hoursText = Translator.get('BU_CLOSED');
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
        </CampusCard>
    );
}
