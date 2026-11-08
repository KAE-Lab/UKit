/**
 * Un restaurant et une bibliotheque d'exemple pour la vitrine de l'accueil, dans la langue des cartes
 * Campus : la meme `Card`, la meme rangee de titre, les memes meta-rangees, le meme badge de distance
 * et la meme jauge d'affluence (`CampusCardParts`). Seule la photo manque : sans lieu reel, les
 * cartes des onglets montraient en grand le visuel de repli du Crous, sur la bibliotheque aussi. Les
 * lieux sont reels (`exemples.ts`), et leurs horaires passent par le resume des vraies cartes.
 */

import React from 'react';
import { View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Card } from '../../../shared/ui/Card';
import { MetaRow } from '../../../shared/ui/MetaRow';
import { CardTitleRow, DistanceBadge, LibraryStatusRow } from '../../Campus/components/CampusCardParts';
import { getLibraryStatus } from '../../Campus/services/LibraryService';
import { resumeDHoraires } from '../../Campus/services/CrousMapping';
import { BIBLIOTHEQUE, RESTAURANT } from './exemples';

const RIEN = () => undefined;

export function RestaurantDExemple({ theme }: { theme: AppThemeType }) {
    return (
        <Card theme={theme}>
            <View style={{ padding: tokens.space.md }}>
                <CardTitleRow title={RESTAURANT.nom} theme={theme} isFavorite onToggleFavorite={RIEN} numberOfLines={1} />
                <MetaRow
                    theme={theme}
                    icon={{ family: 'material', name: 'location-on' }}
                    label={RESTAURANT.zone}
                    numberOfLines={1}
                    marginBottom={tokens.space.xs}
                    trailing={<DistanceBadge distance={RESTAURANT.distance} theme={theme} icon={{ name: 'walk' }} />}
                />
                <MetaRow theme={theme} icon={{ name: 'calendar-clock' }} label={resumeDHoraires(RESTAURANT.horaires) ?? RESTAURANT.horaires.join(' ')} numberOfLines={1} />
            </View>
        </Card>
    );
}

export function BibliothequeDExemple({ theme }: { theme: AppThemeType }) {
    const { isOpen, rate, statusTone, statusText, statusNote } = getLibraryStatus({ isOpen: true, occupancyRate: 62, closingTime: '19:00' });
    return (
        <Card theme={theme}>
            <View style={{ padding: tokens.space.md }}>
                <CardTitleRow title={BIBLIOTHEQUE.nom} theme={theme} isFavorite={false} onToggleFavorite={RIEN} numberOfLines={1} />
                <MetaRow
                    theme={theme}
                    icon={{ family: 'material', name: 'location-on' }}
                    label={BIBLIOTHEQUE.campus}
                    numberOfLines={1}
                    marginBottom={tokens.space.xs}
                    trailing={<DistanceBadge distance={BIBLIOTHEQUE.distance} theme={theme} icon={{ family: 'material', name: 'directions-walk' }} />}
                />
                <LibraryStatusRow isOpen={isOpen} rate={rate} tone={statusTone} label={statusText} note={statusNote} theme={theme} />
            </View>
        </Card>
    );
}
