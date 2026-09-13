/**
 * Le carrousel d'une section du tableau de bord : la meme liste horizontale a aimantation, ecrite
 * quatre fois — CROUS, salles libres, annonces, bibliotheques — avant de remonter ici (6.2.x). La
 * largeur de carte reste celle de chaque section : c'est elle qui fixe le pas d'aimantation.
 */

import React from 'react';
import { FlatList, type ListRenderItem } from 'react-native';

import { tokens } from '../../../../shared/theme/Theme';

export interface CarrouselDeSectionProps<T> {
    data: readonly T[];
    renderItem: ListRenderItem<T>;
    keyExtractor: (item: T) => string;
    /** La largeur d'une carte, en points : le pas d'aimantation est cette largeur plus la gouttiere. */
    largeurCarte: number;
}

export function CarrouselDeSection<T>({ data, renderItem, keyExtractor, largeurCarte }: CarrouselDeSectionProps<T>) {
    return (
        <FlatList
            horizontal
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            snapToInterval={largeurCarte + tokens.space.md}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.lg }}
        />
    );
}
