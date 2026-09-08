/**
 * La rangee mysterieuse : un widget dont la source n'est pas encore publiee, assume comme un teaser.
 *
 * Les rangees « notes » et « examens » annoncaient leur service en clair alors qu'elles n'ont rien a
 * dire avant la rentree — une promesse plate. Elles passent **sous le masque** commun aux teasers de
 * l'application : le cadenas prend la place de l'icone, une barre prend la place de chaque ligne de
 * texte, et rien de ce que la rangee porte n'est peint. Le toucher ouvre la modale qui l'assume —
 * « bientot » (`shared/ui/ModaleBientot`) — avec, quand le service a une porte, un lien discret pour
 * l'ouvrir quand meme. Le mystere ne coute donc aucune capacite.
 *
 * **Le declencheur est la donnee, pas une liste ecrite** : une rangee est mysterieuse tant que son
 * widget n'a pas de source publiee (natures `bientot` et `absent`). Le jour ou un Blueprint des notes
 * est publie, le masque tombe de lui-meme, sans release — c'est la these de la phase 6 appliquee a un
 * effet de style.
 *
 * Ce composant ne dessine donc plus rien : il porte le geste, et le masque est pose par la rangee
 * elle-meme (`LigneScolarite`, prop `masque`). Voir docs/theme.md, « un teaser masque son texte, il
 * ne le voile pas », qui dit pourquoi les trois traitements par flou ou par voile ont ete abandonnes.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { AppThemeType } from '../../../shared/theme/Theme';

export interface RangeeMysterieuseProps {
    /** Conserve pour l'homogeneite des composants de l'onglet, et parce que le masque en depend. */
    theme: AppThemeType;
    /** La rangee masquee, rendue **sans** geste propre : c'est le calque qui porte le toucher. */
    children: React.ReactNode;
    /**
     * Le nom du service, pour l'accessibilite seule.
     *
     * Masquee, la rangee n'affiche plus un seul caractere : sans ce libelle, un lecteur d'ecran
     * n'aurait rien a annoncer. Le teaser est un effet visuel, pas un secret.
     */
    libelle: string;
    onPress: () => void;
}

export function RangeeMysterieuse({ children, libelle, onPress }: RangeeMysterieuseProps) {
    return (
        <View>
            {children}
            <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={0.7}
                accessibilityLabel={libelle}
                accessibilityRole="button"
                onPress={onPress}
            />
        </View>
    );
}
