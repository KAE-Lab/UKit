import React from 'react';
import { View } from 'react-native';
import { tokens } from '../../../../shared/theme/Theme';
import style from '../../../../shared/theme/Theme';
import Translator from '../../../../shared/i18n/Translator';
import { Card } from '../../../../shared/ui/Card';
import { MetaRow } from '../../../../shared/ui/MetaRow';
import { CardTitleRow, DistanceBadge } from '../../components/CampusCardParts';
import { CrousRestaurant } from '../../services/CrousService';
import { VisuelAvecRepli } from '../../../../shared/ui/VisuelAvecRepli';

import { HAUTEUR_VISUEL_CARTE, LARGEUR_CARTE_LIEU } from './gabarits';

const defaultRuImage = require('../../../../../assets/images/default_resto.png');

interface CrousSectionCardProps {
    item: CrousRestaurant;
    theme: typeof style.Theme['light'];
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
    onPress: () => void;
    /** Le rang dans le carrousel : l'entree des premieres cartes s'echelonne (Card). */
    rang?: number;
}

export function CrousSectionCard({ item, theme, isFavorite, onToggleFavorite, onPress, rang }: CrousSectionCardProps) {
    return (
        <Card
            theme={theme}
            onPress={onPress}
            rang={rang}
            style={{ width: LARGEUR_CARTE_LIEU, marginRight: tokens.space.md }}
        >
            <View style={{ width: '100%', height: HAUTEUR_VISUEL_CARTE, backgroundColor: theme.greyBackground }}>
                <VisuelAvecRepli uri={item.image_url} repli={defaultRuImage} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" largeur={LARGEUR_CARTE_LIEU} />
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

                {/* Une ligne, comme dans la liste : c'est ce qui garde toutes les sections alignees. */}
                <MetaRow
                    theme={theme}
                    icon={{ name: 'calendar-clock' }}
                    label={item.opening || Translator.get('UNKNOWN')}
                    numberOfLines={1}
                />
            </View>
        </Card>
    );
}
