/**
 * La tete d'une section de fiche : une icone dans son carre teinte, puis le titre.
 *
 * Les fiches de restaurant et de bibliotheque posaient toutes leurs icones de section a l'accent —
 * dejeuner, diner, horaires, carte, tout violet — et le violet est deja la couleur d'action de
 * l'application. La grille Scolarite avait pose la reponse : **une couleur par section**, prise dans
 * `theme.sectionsHeaders` — la palette categorielle que le Planning emploie depuis toujours — et
 * portee par un carre arrondi, jamais un disque (docs/theme.md).
 *
 * L'index et non une couleur ecrite : la palette est du theme, donc elle suit le mode sombre. Meme
 * piege que chez les widgets : en sombre, les index 0 et 4 portent la meme valeur — eviter le 4.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';

export interface CampusSectionHeaderProps {
    icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    titre: string;
    /** L'index dans `theme.sectionsHeaders`. Le repli sur l'accent couvre un index hors palette. */
    couleur: number;
    theme: AppThemeType;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export function CampusSectionHeader({ icone, titre, couleur, theme, style }: CampusSectionHeaderProps) {
    const teinte = theme.sectionsHeaders[couleur] ?? theme.accent ?? theme.primary;

    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
            {/* `1A` = 10 % d'opacite, le fond des surfaces d'icone de toute l'application. */}
            <View style={{
                width: 32,
                height: 32,
                borderRadius: tokens.radius.md,
                backgroundColor: `${teinte}1A`,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <MaterialCommunityIcons name={icone} size={18} color={teinte} />
            </View>
            <Text style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.bold,
                color: theme.font,
                marginLeft: tokens.space.sm,
                flexShrink: 1,
            }}>
                {titre}
            </Text>
        </View>
    );
}
