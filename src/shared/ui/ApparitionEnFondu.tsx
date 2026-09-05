/**
 * La couture entre « ca charge » et « voila » : un fondu court, avec un leger glissement.
 *
 * Un contenu qui remplace un indicateur d'un seul coup se lit comme un saut — l'oeil enregistre le
 * changement avant de lire ce qui est arrive. Deux cents millisecondes suffisent a en faire une
 * suite ; au-dela, l'application parait lente, ce qu'elle ne serait pas devenue.
 *
 * ## Ce que ce composant n'est pas
 *
 * Ce n'est **pas** un interrupteur global. `LayoutAnimation`
 * ([`transitions.ts`](transitions.ts)) anime tout le commit suivant : pose partout, elle fondrait
 * aussi les frappes au clavier, les listes qui se remplissent et les defilements — une trainee
 * permanente. Elle reste reservee aux **bascules de structure** (changer d'etablissement, avancer
 * dans l'accueil) ; ici, on nomme une couture, une par une.
 *
 * ## Ou il se pose, et ou il ne se pose pas
 *
 * Sur le passage **chargement → contenu**, jamais sur un changement a l'interieur du contenu : une
 * liste qui se refiltre, une valeur qui se met a jour, un jour qu'on fait defiler dans le planning
 * ne sont pas des coutures, et les fondre ferait clignoter l'ecran a chaque geste. D'ou `actif` :
 * un hote qui ne sait distinguer les deux cas qu'a l'execution le dit ici plutot que de monter et
 * demonter l'enveloppe.
 *
 * Attention aux fondus qui s'empilent : [`Card`](Card.tsx) porte deja le sien. Envelopper une liste
 * **de cartes** fait donc jouer deux entrees sur les memes pixels — acceptable quand le conteneur
 * arrive d'un coup, a eviter quand chaque carte arrive separement.
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import { tokens } from '../theme/Theme';

/** Court : la couture doit se percevoir sans se regarder. */
const DUREE_MS = 200;

/**
 * Le glissement d'accompagnement, vers le haut.
 *
 * Un pas d'echelle et non une valeur choisie : c'est le plus petit deplacement qui se voit, et il
 * suffit — au-dela, le contenu « tombe » en place au lieu d'apparaitre.
 */
const GLISSEMENT = tokens.space.sm;

export interface ApparitionEnFonduProps {
    children: React.ReactNode;
    /** Faux : le contenu est rendu tel quel, sans enveloppe animee. Par defaut vrai. */
    actif?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function ApparitionEnFondu({ children, actif = true, style }: ApparitionEnFonduProps) {
    if (!actif) return <>{children}</>;

    return (
        <Reanimated.View
            style={style}
            entering={FadeIn.duration(DUREE_MS).withInitialValues({
                transform: [{ translateY: GLISSEMENT }],
            })}
        >
            {children}
        </Reanimated.View>
    );
}
