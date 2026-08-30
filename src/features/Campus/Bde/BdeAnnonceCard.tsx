/**
 * La carte d'une annonce, au format affiche.
 *
 * Les visuels d'annonces sont des affiches 1:1 (docs/features/campus-vie-etudiante.md) : l'image est
 * carree et porte deja la date, le lieu et le tarif. Le pied reste donc minimal — titre et emetteur —
 * et l'accroche n'apparait que sur la fiche : la repeter sous l'affiche la dirait deux fois.
 *
 * Partagee entre le carrousel du tableau de bord et la grille de la liste complete : la largeur et
 * les marges arrivent de l'exterieur, comme pour la surface `Card` qu'elle habille.
 */

import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Card } from '../../../shared/ui/Card';
import { PastilleEmetteur, teinteDAnnonce } from './PastilleEmetteur';
import type { BdeAnnonce } from '../services/BdeService';

export interface BdeAnnonceCardProps {
    annonce: BdeAnnonce;
    width: number;
    theme: AppThemeType;
    /** Marges de placement : gouttiere de carrousel ou de grille, au choix de l'appelant. */
    style?: StyleProp<ViewStyle>;
    onPress: () => void;
}

export function BdeAnnonceCard({ annonce, width, theme, style, onPress }: BdeAnnonceCardProps) {
    return (
        <Card theme={theme} onPress={onPress} style={[{ width }, style]}>
            <View
                style={{
                    width: '100%',
                    aspectRatio: 1,
                    backgroundColor: theme.greyBackground,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {annonce.image_url ? (
                    <>
                        {/* L'affiche n'est jamais recadree : elle s'affiche entiere, et une copie
                            floutee d'elle-meme remplit ce que son format laisse libre du carre —
                            invisible sur un visuel exactement 1:1. Recadrer coupait le bord d'une
                            affiche presque carree, la ou l'information vit. */}
                        <Image
                            source={{ uri: annonce.image_url }}
                            blurRadius={16}
                            style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover' }}
                        />
                        <Image
                            source={{ uri: annonce.image_url }}
                            style={{ position: 'absolute', width: '100%', height: '100%', resizeMode: 'contain' }}
                        />
                    </>
                ) : (
                    /* Sans visuel, un carre entierement gris se lirait comme une image cassee. */
                    <MaterialCommunityIcons name="party-popper" size={32} color={theme.fontSecondary} />
                )}
            </View>

            <View style={{ paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm }}>
                <Text
                    style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: theme.font }}
                    numberOfLines={1}
                >
                    {annonce.title}
                </Text>

                {/* La meme pastille que sur la fiche, dans la teinte d'identite de l'annonce : la
                    carte et la fiche disent l'emetteur d'une seule voix, d'une seule couleur. */}
                <View style={{ flexDirection: 'row', marginTop: tokens.space.xs }}>
                    <PastilleEmetteur nom={annonce.issuer_name} teinte={teinteDAnnonce(annonce.couleur, theme)} />
                </View>
            </View>
        </Card>
    );
}
