import React, { useContext } from 'react';
import { View, Image, Dimensions } from 'react-native';

import style, { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import { Card } from '../../../../shared/ui/Card';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { CardTitleRow, DistanceBadge, LibraryStatusRow } from '../../components/CampusCardParts';
import { LibraryInfo, AffluencesData, getLibraryStatus } from '../../services/LibraryService';

const defaultBuImage = require('../../../../../assets/images/default_resto.png');
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

interface LibrarySectionCardProps {
    item: LibraryInfo;
    affluenceData?: AffluencesData;
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
}

export function LibrarySectionCard({ item, affluenceData, navigation, isFavorite, onToggleFavorite }: LibrarySectionCardProps) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];

    const { isOpen, rate, statusTone, statusText, statusNote } = getLibraryStatus(affluenceData);

    const imageSource = item.imageUrl ? { uri: item.imageUrl } : defaultBuImage;

    return (
        <Card
            theme={theme}
            onPress={() => navigation.navigate('LibraryDetails', { library: item, affluence: affluenceData })}
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
                    label={item.campus}
                    numberOfLines={1}
                    marginBottom={tokens.space.xs}
                    trailing={item.distance !== undefined ? (
                        <DistanceBadge distance={item.distance} theme={theme} icon={{ family: 'material', name: 'directions-walk' }} />
                    ) : undefined}
                />

                <LibraryStatusRow isOpen={isOpen} rate={rate} tone={statusTone} label={statusText} note={statusNote} theme={theme} />
            </View>
        </Card>
    );
}
