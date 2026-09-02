/**
 * La rangee mysterieuse : un widget dont la source n'est pas encore publiee, assume comme un teaser.
 *
 * Les rangees « notes » et « examens » annoncaient leur service en clair alors qu'elles n'ont rien a
 * dire avant la rentree — une promesse plate. Elles passent **sous un flou** : on devine une rangee,
 * on ne lit rien, et le toucher ouvre la modale qui l'assume — « bientot » (`shared/ui/ModaleBientot`)
 * — avec, quand le service a une porte, un lien discret pour l'ouvrir quand meme. Le mystere ne coute
 * donc aucune capacite.
 *
 * **Le declencheur est la donnee, pas une liste ecrite** : une rangee est mysterieuse tant que son
 * widget n'a pas de source publiee (natures `bientot` et `absent`). Le jour ou un Blueprint des notes
 * est publie, le flou tombe de lui-meme, sans release — c'est la these de la phase 6 appliquee a un
 * effet de style.
 *
 * `expo-blur` : inclus dans Expo Go, rendu natif sur iOS ; sur Android le vrai flou passe par
 * `experimentalBlurMethod`, avec un voile translucide en repli sur les appareils qui ne le portent
 * pas — le texte reste illisible dans les deux cas, c'est tout ce qu'on demande.
 */

import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppThemeType } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';

export interface RangeeMysterieuseProps {
    theme: AppThemeType;
    /** La rangee a flouter, rendue **sans** geste propre : c'est le voile qui porte le toucher. */
    children: React.ReactNode;
    onPress: () => void;
}

export function RangeeMysterieuse({ theme, children, onPress }: RangeeMysterieuseProps) {
    const { themeName } = useContext(AppContext) as { themeName: 'light' | 'dark' };

    return (
        <View>
            {children}
            <BlurView
                intensity={30}
                tint={themeName === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
            />
            {/* Le cadenas dit « pas encore ouvert » — l'exclusivite plutot que la promesse. Sans
                signe, une rangee floue se lirait comme un rendu casse. */}
            <View style={[StyleSheet.absoluteFill, styles.centre]} pointerEvents="none">
                <MaterialCommunityIcons name="lock" size={20} color={theme.fontSecondary} />
            </View>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.7} onPress={onPress} />
        </View>
    );
}

const styles = StyleSheet.create({
    centre: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
