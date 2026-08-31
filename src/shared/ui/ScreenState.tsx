/**
 * L'hote d'un etat qui **occupe l'ecran** : rien a montrer, une source en panne, ou une attente.
 *
 * Le composant qui rend le bloc est partage depuis le jalon 6-K ; ce qui ne l'etait pas, c'est
 * l'endroit ou on le pose. Mesure avant ce lot, cinq ecrans calaient le leur differemment :
 *
 *   - `ScolariteDashboard` centrait avec `paddingTop: insets.top + 70` **seul**, ce qui pousse le
 *     bloc vers le bas de toute la hauteur de l'en-tete ;
 *   - `ScheduleList.renderFailure` centrait avec `paddingBottom: space.xxl` **seul**, ce qui le
 *     pousse vers le haut ;
 *   - `CampusListLayout` rendait la variante encadree, collee sous l'en-tete ;
 *   - `CredentialsSettingsScreen` employait `+ 65` la ou tout le reste emploie `+ 70` ;
 *   - `GroupSelectionScreen` posait un fond `greyBackground` que personne d'autre n'utilise.
 *
 * D'ou l'impression, juste, que ces messages flottaient « tantot trop haut, tantot trop bas ».
 *
 * ## La regle : un etat plein ecran s'ancre en haut, jamais au centre
 *
 * Le bloc se pose a une distance **fixe** sous l'en-tete, la meme sur les huit ecrans qui en portent
 * un. C'est un choix, et il vaut d'etre explique parce que l'autre etait tentant.
 *
 * Centrer « proprement » demande de connaitre ce qui occupe le **bas** de chaque ecran, et ce n'est
 * pas la meme chose partout : la barre d'onglets sur les quatre onglets, la barre de recherche
 * flottante sur les listes Campus, rien du tout sur un ecran pousse. Une premiere version a essaye,
 * et s'est trompee deux fois — d'abord avec un rembourrage symetrique, qui recentre sur l'ecran
 * entier au lieu de la surface libre, puis en oubliant que la barre de recherche occupe 80 points
 * qu'aucun `insets` ne declare. Le resultat tombait « legerement en dessous du milieu », ce qui est
 * la pire position : ni centre, ni ancre, et illisible comme intention.
 *
 * L'ancrage haut supprime la classe de defaut au lieu de la re-regler : un seul nombre, aucune
 * arithmetique de chrome, et un rendu identique partout par construction. C'est aussi la position ou
 * l'indicateur de chargement se trouvait deja, donc le passage chargement -> vide ne fait plus sauter
 * le contenu.
 *
 * Deux dispositions d'ecran, et deux facons de renseigner l'en-tete :
 *
 *   - **l'en-tete est transparent et le contenu glisse dessous** (Campus, Scolarite, les ecrans
 *     pousses) : c'est le cas par defaut, `insets.top + HEADER_OFFSET` ;
 *   - **l'en-tete occupe sa place dans le flux** (le Planning, dont `DayViewHeader` est rendu
 *     au-dessus du contenu) : l'hote recoit alors `topOffset={0}`, parce que sa boite **est** deja la
 *     surface libre.
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens, AppThemeType } from '../theme/Theme';

/**
 * La hauteur d'en-tete que toute l'application applique.
 *
 * Elle vit ici plutot que dans `NavHelpers`, qui l'importe : c'est le seul endroit qui a besoin de la
 * **compenser**, et il ne doit pas y avoir deux 70 dans le depot. Les deux englobeurs
 * (`withHeaderAnimation`, `withStaticHeader`) s'en servent pour poser le contenu ; celui-ci s'en sert
 * pour s'en decoller.
 */
export const HEADER_OFFSET = 70;

/** La hauteur de la barre d'onglets, importee par `MainTabNavigator` pour qu'il n'y ait qu'un 75. */
export const TAB_BAR_HEIGHT = 75;

/** Ce qui separe le bas de l'en-tete du haut du bloc. Une respiration, la meme partout. */
const RESPIRATION = tokens.space.xxl;

export interface ScreenStateProps {
    theme: AppThemeType;
    children: React.ReactNode;
    /**
     * Le fond de l'ecran hote. Il est **explicite** parce qu'il n'est pas le meme partout : les
     * listes Campus et le planning sont sur `courseBackground`, les autres sur `background`. Un fond
     * choisi ici ferait apparaitre une dalle d'une autre couleur au moment ou la liste se vide.
     */
    background?: string;
    /**
     * Ce que l'en-tete occupe au-dessus de ce bloc. Par defaut celui d'un en-tete transparent ;
     * `0` pour un ecran dont l'en-tete est deja hors de la boite.
     */
    topOffset?: number;
}

export function ScreenState({ theme, children, background, topOffset }: ScreenStateProps) {
    const insets = useSafeAreaInsets();
    const haut = topOffset ?? (insets.top || 0) + HEADER_OFFSET;

    const conteneur: ViewStyle = {
        flex: 1,
        alignItems: 'center',
        paddingTop: haut + RESPIRATION,
        paddingHorizontal: tokens.space.lg,
        backgroundColor: background ?? theme.background,
    };

    return <View style={conteneur}>{children}</View>;
}
