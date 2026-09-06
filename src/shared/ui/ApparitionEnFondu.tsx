/**
 * La couture entre « ca charge » et « voila » : un fondu court.
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
 * liste qui se refiltre, une valeur qui se met a jour ne sont pas des coutures, et les fondre ferait
 * clignoter l'ecran a chaque geste. D'ou `actif` : un hote qui ne sait distinguer les deux cas qu'a
 * l'execution le dit ici plutot que de monter et demonter l'enveloppe. Le planning est le cas
 * limite, tranche par le proprietaire du produit le 2026-09-06 : chaque jour affiche EST une
 * couture (la liste se vide puis se remplit), et il fond a chaque changement — voir ScheduleList.
 *
 * ## Pourquoi un fondu seul, sans glissement
 *
 * 6.1-E posait un glissement de huit points en valeur initiale d'un `FadeIn` ; `FadeIn` n'anime que
 * l'opacite, donc le glissement n'etait pas anime, il retombait a la fin. Reanimated 4.5 (SDK 57)
 * type d'ailleurs les valeurs initiales sur ce que l'animation anime, et le glissement demanderait
 * `FadeInDown` — avec lequel un jour libre du planning a perdu son texte sur iPhone le 2026-09-06,
 * seul l'icone restant. Un fondu suffit a la couture, et il ne deplace rien.
 *
 * Attention aux fondus qui s'empilent : [`Card`](Card.tsx) porte deja le sien. Envelopper une liste
 * **de cartes** fait donc jouer deux entrees sur les memes pixels — acceptable quand le conteneur
 * arrive d'un coup, a eviter quand chaque carte arrive separement.
 */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

/** Court : la couture doit se percevoir sans se regarder. */
const DUREE_MS = 200;

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
            entering={FadeIn.duration(DUREE_MS)}
        >
            {children}
        </Reanimated.View>
    );
}
