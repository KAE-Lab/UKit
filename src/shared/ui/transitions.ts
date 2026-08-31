/**
 * Adoucit le PROCHAIN changement de mise en page : a appeler juste avant un changement d'etat qui
 * restructure l'ecran.
 *
 * L'application a des bascules structurelles legitimes — changer d'etablissement fait apparaitre ou
 * disparaitre des rangees de reglages et des onglets entiers, avancer dans l'accueil remplace une
 * etape par une autre, se connecter remplace le formulaire par le tableau de bord. Rendues d'un
 * coup, elles se lisent comme un accroc ; fondues sur 220 ms, comme une suite. `LayoutAnimation`
 * anime TOUT le commit suivant, quel que soit le composant qui change : c'est ce qui permet de
 * lisser une bascule declenchee par le contexte sans toucher aux ecrans qui la subissent.
 *
 * La regle d'usage : les BASCULES DE STRUCTURE seulement — jamais les frappes, les defilements ni
 * les listes qui se remplissent, ou l'animation deviendrait une trainee permanente.
 */

import { LayoutAnimation } from 'react-native';

export function adoucirLaTransition() {
    LayoutAnimation.configureNext(
        LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
    );
}
