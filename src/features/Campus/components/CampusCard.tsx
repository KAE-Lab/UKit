import React, { useContext } from 'react';
import { View, Image } from 'react-native';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { Card } from '../../../shared/ui/Card';
import { CardTitleRow } from './CampusCardParts';

const defaultImage = require('../../../../assets/images/default_resto.png');

export interface CampusCardProps {
    title: string;
    imageUrl?: string | null;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    onPress: () => void;
    children?: React.ReactNode;
}

/**
 * La carte d'un lieu, en pleine largeur de liste.
 *
 * Sa **surface** vient de [`Card`](../../../shared/ui/Card.tsx) depuis le jalon 6-K ; ce qui reste ici
 * est la composition propre a Campus — l'image de couverture et son repli, le titre, l'etoile — que le
 * socle n'a aucune raison de connaitre.
 */
export function CampusCard({
    title,
    imageUrl,
    isFavorite,
    onToggleFavorite,
    onPress,
    children
}: CampusCardProps) {
    const AppContextValues = useContext(AppContext) as { themeName: 'light' | 'dark' };
    const themeName = AppContextValues.themeName ?? 'light';
    const theme = style.Theme[themeName];

    return (
        <Card
            theme={theme}
            onPress={onPress}
            style={{ marginBottom: tokens.space.lg, marginHorizontal: tokens.space.sm }}
        >
            <View style={{ width: '100%', height: 180, backgroundColor: theme.greyBackground }}>
                {/* Repli sous l'image distante : une carte sans visuel resterait un rectangle gris. */}
                <Image
                    source={defaultImage}
                    style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                />

                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                ) : null}
            </View>

            <View style={{ padding: tokens.space.md }}>
                <CardTitleRow
                    title={title}
                    theme={theme}
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                    titleMarginBottom={tokens.space.xs}
                />

                {/* Le contenu propre au domaine : lieu, distance, horaires, affluence. */}
                {children}
            </View>
        </Card>
    );
}
