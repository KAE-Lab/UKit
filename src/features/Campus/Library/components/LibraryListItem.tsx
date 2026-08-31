import React, { useContext } from 'react';
import style from '../../../../shared/theme/Theme';
import { tokens } from '../../../../shared/theme/Theme';
import { AppContext } from '../../../../shared/services/AppCore';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { LibraryInfo, AffluencesData, getLibraryStatus } from '../../services/LibraryService';
import { CampusCard } from '../../components/CampusCard';
import { DistanceBadge, LibraryStatusRow } from '../../components/CampusCardParts';

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

    const { isOpen, rate, statusTone, statusText, statusNote } = getLibraryStatus(affluenceData);

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
                label={item.campus}
                marginBottom={tokens.space.xs}
                trailing={item.distance !== undefined ? (
                    <DistanceBadge distance={item.distance} theme={theme} icon={{ family: 'material', name: 'directions-walk' }} />
                ) : undefined}
            />

            <LibraryStatusRow isOpen={isOpen} rate={rate} tone={statusTone} label={statusText} note={statusNote} theme={theme} />
        </CampusCard>
    );
}
