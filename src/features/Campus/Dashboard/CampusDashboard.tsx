import React, { useContext } from 'react';
import { View, StyleSheet, Platform, RefreshControl } from 'react-native';
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import style from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import { PIED_FLOTTANT_DEGAGEMENT } from '../../../shared/ui/PiedFlottant';
import { useCampusPosition } from '../hooks/useCampusPosition';
import { RafraichissementProvider, useRafraichissementTableauDeBord } from './rafraichissement';

import { BdeSection } from './components/BdeSection';
import { CrousSection } from './components/CrousSection';
import { LibrarySection } from './components/LibrarySection';
import { FreeRoomSection } from './components/FreeRoomSection';
import { EnTeteCampus } from './components/EnTeteCampus';
import { AnnoncesDuTableauProvider } from './annonces';
import { crousRegionActive, sallesDisponibles } from '../../../shared/etablissements';

/** La hauteur du grand titre et de sa marge, sous l'encoche : ce que le contenu laisse a l'en-tete. */
const HAUTEUR_TITRE = 60;

const CampusDashboard = ({ navigation }: { navigation: import('@react-navigation/native').NavigationProp<Record<string, unknown>> }) => {
    const { themeName } = useContext(AppContext);
    const theme = style.Theme[themeName];
    const insets = useSafeAreaInsets();
    const hauteurEnTete = insets.top + HAUTEUR_TITRE;

    // La meme position que les listes, resolue une fois pour tout le Campus (useCampusLocation).
    const location = useCampusPosition();
    // Le tirer-pour-rafraichir : le seul rejeu des quatre sources tierces (rafraichissement.tsx).
    const { contexte, refreshing, lancer } = useRafraichissementTableauDeBord();

    /*
     * Sur iOS, l'en-tete est un **inset** de contenu, pas un rembourrage. C'est ainsi qu'UIKit place le
     * spinner du tirer-pour-rafraichir sous l'en-tete, dans l'espace que le geste ouvre — et non sous
     * la barre de statut, ou il se cachait au-dessus du titre (constate sur iPhone le 2026-09-03).
     * L'offset de defilement au repos vaut donc `-hauteurEnTete`, et la valeur partagee part de la,
     * sans quoi le titre serait invisible jusqu'au premier defilement. Android ignore `contentInset` :
     * le rembourrage reste, et `progressViewOffset` descend le spinner d'autant.
     *
     * Le defilement est une valeur partagee de Reanimated depuis 7-I, lue sur le fil de l'interface
     * par l'en-tete ; il passait par l'`Animated` historique.
     */
    const surIos = Platform.OS === 'ios';
    const reposY = surIos ? -hauteurEnTete : 0;
    const defilement = useSharedValue(reposY);
    const surDefilement = useAnimatedScrollHandler((evenement) => {
        defilement.value = evenement.contentOffset.y;
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <EnTeteCampus theme={theme} defilement={defilement} repos={reposY} hautSur={insets.top} />

            <Reanimated.ScrollView
                onScroll={surDefilement}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                contentInset={surIos ? { top: hauteurEnTete } : undefined}
                contentOffset={surIos ? { x: 0, y: -hauteurEnTete } : undefined}
                scrollIndicatorInsets={surIos ? { top: hauteurEnTete } : undefined}
                contentContainerStyle={{ paddingTop: surIos ? 0 : hauteurEnTete, paddingBottom: PIED_FLOTTANT_DEGAGEMENT }}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={lancer}
                        /*
                         * `theme.font` et non `fontSecondary` : ce dernier vaut **la meme valeur dans
                         * les deux themes** (`#8E8E93`), et cet arc gris, fin, disparaissait sur le
                         * fond noir du theme sombre — signale sur appareil le 2026-09-04. La couleur
                         * de premier plan, elle, suit le theme par construction.
                         */
                        tintColor={theme.font}
                        colors={[theme.primary]}
                        progressViewOffset={surIos ? undefined : hauteurEnTete}
                    />
                )}
            >
                <RafraichissementProvider value={contexte}>
                {/* Les annonces, lues une fois : leur section et les cartes speciales des lieux (annonces.tsx). */}
                <AnnoncesDuTableauProvider>
                <BdeSection navigation={navigation} />
                {/*
                  * Les restaurants suivent la region CROUS du catalogue depuis le jalon 6-J.
                  * `null` fait disparaitre la section : un etablissement hors des regions
                  * couvertes n'a pas de restaurants a proposer, et lui servir ceux d'une autre
                  * ville serait une donnee fausse qui a l'air juste — exactement ce que la
                  * phase supprime. Les bibliotheques, elles, n'ont pas ce probleme : leur
                  * balayage part de la position de l'etudiant.
                  */}
                {crousRegionActive() !== null && (
                    <CrousSection navigation={navigation} userLat={location.lat} userLon={location.lon} />
                )}
                <LibrarySection navigation={navigation} userLat={location.lat} userLon={location.lon} />
                {/*
                  * Les salles libres se reconstruisent depuis les salles du serveur
                  * d'emplois du temps : une universite qui n'en publie pas n'a rien a
                  * montrer ici. La section disparait plutot que d'afficher un carrousel vide
                  * ou une erreur permanente — meme regle que la ligne de messagerie d'un
                  * etablissement sans webmail extractible (jalon 6-G).
                  */}
                {sallesDisponibles() && (
                    <FreeRoomSection navigation={navigation} userLat={location.lat} userLon={location.lon} />
                )}
                </AnnoncesDuTableauProvider>
                </RafraichissementProvider>
            </Reanimated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default CampusDashboard;
