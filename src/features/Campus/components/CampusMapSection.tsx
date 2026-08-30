/**
 * « S'y rendre » : la carte du lieu, dans la fiche.
 *
 * La carte etait une sous-page derriere un bouton d'en-tete, c'est-a-dire une capacite cachee — et la
 * fiche de cours, elle, montre la sienne dans la page depuis toujours. Meme decision que les horaires
 * du restaurant : une information se lit, elle ne se declenche pas. Le geste secondaire — ouvrir le
 * plan externe pour l'itineraire — reste un bouton pose sur la carte, comme sur la fiche de cours.
 *
 * Du domaine Campus, comme `CampusCardParts` : deux fiches la partagent (restaurant, bibliotheque),
 * et le socle n'a aucune raison de connaitre « S'y rendre ».
 */

import React from 'react';
import { View } from 'react-native';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { EmbeddedMap } from '../../../shared/map/EmbeddedMap';
import { CampusSectionHeader } from './CampusSectionHeader';

interface CampusMapSectionProps {
    /** Absentes ou incompletes, la section ne se rend pas : pas de carte vide. */
    location?: { lat?: number; lng?: number };
    /** L'etiquette du marqueur : le nom du lieu. */
    markerTitle?: string;
    theme: AppThemeType;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export function CampusMapSection({ location, markerTitle, theme, style }: CampusMapSectionProps) {
    if (location === undefined || typeof location.lat !== 'number' || typeof location.lng !== 'number') return null;

    return (
        <View style={style}>
            {/* La grammaire d'une section de fiche — et le vert (1) : aller quelque part. */}
            <CampusSectionHeader
                icone="map-marker-radius"
                titre={Translator.get('GETTING_THERE')}
                couleur={1}
                theme={theme}
                style={{ marginBottom: tokens.space.md }}
            />

            {/* Une banniere, pas une pleine page : la carte situe, l'itineraire se fait ailleurs. */}
            <View style={{
                height: 180,
                borderRadius: tokens.radius.lg,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: 'hidden',
                backgroundColor: theme.greyBackground,
            }}>
                <EmbeddedMap
                    markers={[{ lat: location.lat, lng: location.lng, title: markerTitle || Translator.get('DETAILS') }]}
                    theme={theme}
                    // Un cran plus pres que le defaut : une banniere de 180 points n'a pas la place
                    // du plan de quartier — moins de rues, plus grosses, ca se lit.
                    zoom={17}
                />
            </View>
        </View>
    );
}
