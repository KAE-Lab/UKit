import React, { useContext, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import style, { tokens } from '../../../shared/theme/Theme';
import { AppContext } from '../../../shared/services/AppCore';
import Translator from '../../../shared/i18n/Translator';
import { PastilleService } from '../../../shared/messages/PastilleService';
import { useCampusPosition } from '../hooks/useCampusPosition';
import { RafraichissementProvider, useRafraichissementTableauDeBord } from './rafraichissement';

import { BdeSection } from './components/BdeSection';
import { CrousSection } from './components/CrousSection';
import { LibrarySection } from './components/LibrarySection';
import { FreeRoomSection } from './components/FreeRoomSection';
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
     * L'offset de defilement au repos vaut donc `-hauteurEnTete`, et la valeur animee part de la, sans
     * quoi le titre serait invisible jusqu'au premier defilement. Android ignore `contentInset` : le
     * rembourrage reste, et `progressViewOffset` descend le spinner d'autant.
     */
    const surIos = Platform.OS === 'ios';
    const reposY = surIos ? -hauteurEnTete : 0;
    const scrollY = useRef(new Animated.Value(reposY)).current;
    const opacity = scrollY.interpolate({
        inputRange: [reposY, reposY + 50],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Animated.View style={[styles.headerContainer, { paddingTop: insets.top, backgroundColor: 'transparent', opacity }]}>
                <View style={[styles.headerContent, { paddingHorizontal: tokens.space.md }]}>
                    <Text style={[styles.greetingText, { color: theme.font }]}>
                        {Translator.get('CAMPUS')}
                    </Text>
                    {/* La pastille d'etat de service, a droite du titre (shared/messages/PastilleService). */}
                    <PastilleService theme={theme} style={styles.rappel} />
                </View>
            </Animated.View>

            <Animated.ScrollView
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                contentInset={surIos ? { top: hauteurEnTete } : undefined}
                contentOffset={surIos ? { x: 0, y: -hauteurEnTete } : undefined}
                scrollIndicatorInsets={surIos ? { top: hauteurEnTete } : undefined}
                contentContainerStyle={{ paddingTop: surIos ? 0 : hauteurEnTete, paddingBottom: tokens.space.xxl + 80 }}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={lancer}
                        tintColor={theme.fontSecondary}
                        colors={[theme.primary]}
                        progressViewOffset={surIos ? undefined : hauteurEnTete}
                    />
                )}
            >
                <RafraichissementProvider value={contexte}>
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
                </RafraichissementProvider>
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: tokens.space.sm,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: tokens.fontSize.title,
        fontWeight: tokens.fontWeight.bold as '700',
        marginBottom: tokens.space.md,
    },
    // Pousse a droite, et la meme marge basse que le titre : la pastille s'aligne sur sa ligne.
    rappel: {
        marginLeft: 'auto',
        marginBottom: tokens.space.md,
    },
});

export default CampusDashboard;
