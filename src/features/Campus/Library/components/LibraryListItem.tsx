import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Translator from '../../../../shared/i18n/Translator';
import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import { LibraryInfo, AffluencesData, getLibraryStatus } from '../../services/LibraryService';
import { CampusCard } from '../../components/CampusCard';

interface LibraryListItemProps {
    item: LibraryInfo;
    affluenceData?: AffluencesData;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onPress: () => void;
}

export function LibraryListItem({ item, affluenceData, isFavorite, onToggleFavorite, onPress }: LibraryListItemProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const { isOpen, rate, statusColor, statusText } = getLibraryStatus(affluenceData);

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
                <Text style={{ fontSize: tokens.fontSize.sm, color: theme.fontSecondary, marginLeft: 4, flex: 1 }}>
                    {item.campus}
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
                        <MaterialIcons name="directions-walk" size={14} color={theme.primary} />
                        <Text style={{
                            fontSize: tokens.fontSize.sm,
                            fontWeight: tokens.fontWeight.bold as never,
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

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name={isOpen ? 'door-open' : 'door-closed'} size={16} color={statusColor} />
                <Text numberOfLines={1} style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold as never, color: statusColor, marginLeft: 4, flexShrink: 1 }}>
                    {statusText}
                </Text>
                
                {isOpen && rate !== null && (
                    <>
                        <View style={{ flex: 1, height: 6, backgroundColor: theme.greyBackground, borderRadius: 3, overflow: 'hidden', marginHorizontal: tokens.space.sm }}>
                            <View style={{ width: `${rate}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                        </View>
                        <Text style={{ fontSize: tokens.fontSize.xs, color: theme.fontSecondary, fontWeight: tokens.fontWeight.bold as never }}>
                            {`${rate}%`}
                        </Text>
                    </>
                )}
            </View>
        </CampusCard>
    );
}
