/**
 * « Tes documents » : l'ecran des pieces rangees sur l'appareil.
 *
 * Il n'existait pas — la liste vivait au milieu du tableau de bord, ou elle poussait tout le reste
 * vers le bas pour un contenu qu'on consulte rarement, un certificat le jour ou on en a besoin. Elle
 * est desormais une **tuile** dans la grille, et son detail vit ici : de la place pour ajouter,
 * ouvrir et supprimer, sans encombrer la page d'accueil de l'onglet.
 *
 * L'ecran ne decide rien : `DocumentsSection` porte le contenu et son etat vide, `useDocuments` porte
 * les gestes. Ce fichier ne fait que lui donner un cadre defilant et le rembourrage d'en-tete.
 *
 * **`withHeaderAnimation` et non `withStaticHeader`** : le titre s'efface au defilement, comme sur les
 * ecrans de liste du Campus. C'est l'animation d'en-tete standard de l'application, et un ecran pousse
 * qui garde son titre fige detonne au milieu de ceux qui l'effacent. Le HOC fournit `onAnimatedScroll`,
 * qu'il faut brancher sur la vue defilante — sans ca l'en-tete n'a rien a ecouter et le titre ne bouge
 * jamais.
 */

import React, { useContext } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { TAB_BAR_HEIGHT } from '../../../shared/ui/ScreenState';
import { DocumentsSection } from '../components/DocumentsSection';

/**
 * `headerPadding` est un **objet de style**, pas un nombre : les deux englobeurs rendent
 * `{ paddingTop, paddingBottom }`. Le traiter comme un nombre posait un objet dans `paddingTop`, que
 * React Native ignore — et le contenu demarrait sous la barre de navigation, titre et icone
 * superposes (constate sur appareil le 2026-08-29). Il s'etale dans le style, comme le font
 * `AboutScreen` et `CourseScreen`.
 */
function DocumentsScreen({ headerPadding, onAnimatedScroll }: {
    headerPadding?: ViewStyle;
    onAnimatedScroll?: (evenement: unknown) => void;
}) {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const teinte = theme.accent ?? theme.primary;

    return (
        <Animated.ScrollView
            style={[styles.ecran, { backgroundColor: theme.background }]}
            onScroll={onAnimatedScroll as never}
            scrollEventThrottle={16}
            contentContainerStyle={[
                headerPadding,
                { paddingBottom: tokens.space.xxl + TAB_BAR_HEIGHT, gap: tokens.space.lg },
            ]}
            showsVerticalScrollIndicator={false}
        >
            <DocumentsSection theme={theme} teinte={teinte} />
        </Animated.ScrollView>
    );
}

const styles = StyleSheet.create({
    ecran: {
        flex: 1,
    },
});

export default withHeaderAnimation(DocumentsScreen);
