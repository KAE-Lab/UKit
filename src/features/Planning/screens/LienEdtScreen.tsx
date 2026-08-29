/**
 * L'ecran de pile qui porte la saisie du lien d'abonnement.
 *
 * Il ne fait que **poser le formulaire dans la navigation** : tout ce qui saisit, verifie et enregistre
 * vit dans [`LienEdtForm`](../components/LienEdtForm.tsx), parce que le parcours d'accueil a besoin du
 * meme formulaire et qu'il est rendu **hors de toute navigation** (`rootContainer.tsx`). Un ecran qui
 * porterait la logique obligerait donc l'accueil a en recopier une seconde version.
 *
 * Voir docs/features/planning.md.
 */

import React from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { HEADER_OFFSET } from '../../../shared/ui/ScreenState';
import LienEdtForm from '../components/LienEdtForm';

interface LienEdtScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export default function LienEdtScreen({ navigation }: LienEdtScreenProps) {
    return (
        <SafeAreaInsetsContext.Consumer>
            {/* `HEADER_OFFSET` et non l'encoche seule : cet en-tete est transparent et le contenu
                glisse dessous. Sans lui, le titre et l'icone du formulaire se chevauchent. */}
            {(insets) => (
                <LienEdtForm
                    topPadding={(insets?.top ?? 0) + HEADER_OFFSET}
                    onDone={() => navigation.goBack()}
                />
            )}
        </SafeAreaInsetsContext.Consumer>
    );
}
