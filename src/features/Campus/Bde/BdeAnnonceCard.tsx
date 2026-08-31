/**
 * La carte d'une annonce, au format affiche.
 *
 * Les visuels d'annonces sont des affiches 1:1 (docs/features/campus-vie-etudiante.md) : l'image est
 * carree et porte deja la date, le lieu et le tarif. Le pied reste donc minimal — titre et emetteur —
 * et l'accroche n'apparait pas sous une affiche : la repeter la dirait deux fois.
 *
 * **Sans visuel, l'accroche EST l'affiche** : en grande typographie dans la teinte d'identite, sur
 * un fond teinte doux — le geste des cartes typographiques d'Apple News. Le carre gris a icone
 * centree a ete essaye et defait (2026-08-31) : neuf dixiemes de vide autour d'un pictogramme de
 * 32 points, la carte se lisait comme une image cassee. Sans accroche non plus, l'icone reste, mais
 * teintee et grande — un choix d'identite, plus un constat d'absence.
 *
 * Partagee entre le carrousel du tableau de bord et la grille de la liste complete : la largeur et
 * les marges arrivent de l'exterieur, comme pour la surface `Card` qu'elle habille.
 */

import React from 'react';
import { View, Text, Image, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Card } from '../../../shared/ui/Card';
import { teinteDAnnonce } from './PastilleEmetteur';
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
    const teinte = teinteDAnnonce(annonce.couleur, theme);

    return (
        <Card theme={theme} onPress={onPress} style={[{ width }, style]}>
            <View
                style={{
                    width: '100%',
                    aspectRatio: 1,
                    backgroundColor: annonce.image_url ? theme.greyBackground : `${teinte}14`,
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
                ) : annonce.info_label ? (
                    /* L'affiche typographique : l'accroche en grand, calee en bas comme un titre
                       d'affiche — voir l'en-tete. */
                    <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: tokens.space.md }}>
                        <Text
                            numberOfLines={5}
                            style={{
                                fontSize: tokens.fontSize.lg,
                                fontWeight: tokens.fontWeight.bold,
                                color: teinte,
                                lineHeight: 26,
                            }}
                        >
                            {annonce.info_label}
                        </Text>
                    </View>
                ) : (
                    <MaterialCommunityIcons name="party-popper" size={48} color={teinte} />
                )}
            </View>

            {/*
              * Le pied, en grammaire editoriale : l'emetteur en petites capitales grises AU-DESSUS
              * du titre — le « kicker » des cartes d'article, celui d'Apple News. La pastille
              * d'emetteur y a vecu et a ete defaite (2026-08-31) : une capsule coloree sur chaque
              * carte etait du bruit repete — la meme regle qui interdit le filigrane dans les
              * listes — et deux cartes voisines aux pastilles de couleurs differentes se lisaient
              * comme un sapin de Noel. La pastille reste le geste de la fiche, ou elle est seule.
              */}
            <View style={{ paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm }}>
                <Text
                    style={{
                        fontSize: tokens.fontSize.xs,
                        fontWeight: tokens.fontWeight.semibold,
                        color: theme.fontSecondary,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: tokens.space.xxs,
                    }}
                    numberOfLines={1}
                >
                    {annonce.issuer_name}
                </Text>
                <Text
                    style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: theme.font }}
                    numberOfLines={1}
                >
                    {annonce.title}
                </Text>
            </View>
        </Card>
    );
}
