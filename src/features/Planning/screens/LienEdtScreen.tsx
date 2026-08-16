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

import LienEdtForm from '../components/LienEdtForm';

interface LienEdtScreenProps {
    navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
}

export default function LienEdtScreen({ navigation }: LienEdtScreenProps) {
    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => <LienEdtForm topPadding={insets?.top || 0} onDone={() => navigation.goBack()} />}
        </SafeAreaInsetsContext.Consumer>
    );
}
