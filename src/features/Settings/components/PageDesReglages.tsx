/**
 * La page de l'onglet Reglages : son fond, son en-tete d'onglet et sa vue defilante (jalon 7-J).
 *
 * L'ecran reste une classe pour sa logique ; ce qui anime l'en-tete demande des hooks de Reanimated,
 * il vit donc ici. Le grand titre part avec le contenu et la barre compacte prend le relais
 * (`EnTeteDOnglet`) : le contenu s'ecrivait sous la barre d'etat une fois le titre efface.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import Translator from '../../../shared/i18n/Translator';
import { FondDOnglet } from '../../../shared/ui/FondDOnglet';
import { EnTeteDOnglet, HAUTEUR_DE_LA_BARRE } from '../../../shared/ui/EnTeteDOnglet';
import { PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';
import { PastilleService } from '../../../shared/messages/PastilleService';

export function PageDesReglages({ theme, children }: { theme: AppThemeType; children: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    const hauteurEnTete = insets.top + HAUTEUR_DE_LA_BARRE;
    // Sur iOS l'en-tete est un retrait du contenu, et le defilement au repos vaut sa hauteur negative ;
    // Android ignore `contentInset` et garde un rembourrage (meme calage que Campus).
    const surIos = Platform.OS === 'ios';
    const repos = surIos ? -hauteurEnTete : 0;
    const defilement = useSharedValue(repos);
    const surDefilement = useAnimatedScrollHandler((evenement) => {
        defilement.value = evenement.contentOffset.y;
    });

    return (
        <View style={[styles.page, { backgroundColor: theme.background }]}>
            <FondDOnglet theme={theme} onglet="reglages" />
            <EnTeteDOnglet
                theme={theme}
                onglet="reglages"
                titre={Translator.get('SETTINGS')}
                defilement={defilement}
                repos={repos}
                hautSur={insets.top}
                droite={<PastilleService theme={theme} onglet="Settings" />}
            />
            <Reanimated.ScrollView
                onScroll={surDefilement}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                contentInset={surIos ? { top: hauteurEnTete } : undefined}
                contentOffset={surIos ? { x: 0, y: -hauteurEnTete } : undefined}
                scrollIndicatorInsets={surIos ? { top: hauteurEnTete } : undefined}
                contentContainerStyle={{
                    paddingTop: surIos ? 0 : hauteurEnTete,
                    paddingBottom: PIED_FLOTTANT_DEGAGEMENT + tokens.space.lg,
                }}
            >
                {children}
            </Reanimated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
});
