/**
 * La tete d'un chapitre d'annonce : son icone dans le gris du texte secondaire, puis le titre.
 *
 * Elle titrait toutes les sections des fiches, chacune dans un carre teinte d'une couleur de
 * `theme.sectionsHeaders` : orange pour le midi, bleu pour le soir, vert pour s'y rendre. La review du
 * 2026-11-05 trouvait ces couleurs etrangeres a l'identite, et « cheap » (deuxieme passe de 7-J). Les
 * fiches s'intertitrent depuis comme le tableau Campus (`SectionHeader`) ; il ne reste ici que les
 * chapitres d'une annonce, dont l'icone vient du texte de l'annonce et dit quelque chose (un lieu, une
 * date). L'icone reste, la couleur part.
 */

import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';

export interface CampusSectionHeaderProps {
    icone: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    titre: string;
    theme: AppThemeType;
    style?: StyleProp<ViewStyle>;
}

export function CampusSectionHeader({ icone, titre, theme, style }: CampusSectionHeaderProps) {
    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }, style]}>
            <Icon icon={{ name: icone }} size={20} color={theme.fontSecondary} />
            <Text style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.bold,
                color: theme.font,
                flexShrink: 1,
            }}>
                {titre}
            </Text>
        </View>
    );
}
